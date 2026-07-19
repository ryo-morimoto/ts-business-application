import { expect, type Page, test } from "@playwright/test";

const API = "http://127.0.0.1:3013";

async function reset() {
  await fetch(`${API}/api/testing/reset`, { method: "POST" });
}

async function processNow(jobId: string) {
  const res = await fetch(`${API}/api/testing/process-now`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  expect(res.ok, `process-now failed for ${jobId}: ${res.status}`).toBeTruthy();
  return res.json();
}

/** 依頼受付 flash から依頼番号を取る（React 更新完了を待つ） */
async function acceptedJobId(page: Page): Promise<string> {
  const flash = page.getByTestId("flash");
  await expect(flash).toContainText("受け付けました");
  await expect(flash).toContainText(/exp-\d+/);
  const text = await flash.innerText();
  const jobId = text.match(/exp-\d+/)?.[0];
  expect(jobId).toBeTruthy();
  return jobId!;
}

test.beforeEach(async () => {
  await reset();
});

test("権限のある条件で依頼→完了→成果物を受け取れる", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /出荷明細 · 非同期ファイル出力/ }),
  ).toBeVisible();

  await page.getByTestId("filter-warehouse").selectOption("WH-A");
  await page.getByTestId("filter-status").selectOption("allocated");
  await page.getByTestId("apply-filters").click();
  await expect(page.getByTestId("shipments-total")).toBeVisible();

  await page.getByTestId("request-export").click();
  const jobId = await acceptedJobId(page);

  await processNow(jobId);
  await page.getByTestId("refresh-jobs").click();
  await expect(page.getByTestId(`job-status-${jobId}`)).toContainText("完了");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId(`download-${jobId}`).click(),
  ]);
  expect(download.suggestedFilename()).toContain(jobId);
  const path = await download.path();
  expect(path).toBeTruthy();
});

test("権限のない倉庫では依頼できない", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("filter-warehouse").selectOption("WH-C");
  await page.getByTestId("apply-filters").click();

  await page.getByTestId("request-export").click();
  await expect(page.getByTestId("flash")).toContainText("権限");
});

test("上限超過は失敗し件数上限が分かる", async ({ page }) => {
  await page.goto("/");
  // 条件なし = clerk の WH-A+B で 36 件 > 25
  await page.getByTestId("apply-filters").click();
  await page.getByTestId("request-export").click();
  const jobId = await acceptedJobId(page);
  await processNow(jobId);
  await page.getByTestId("refresh-jobs").click();

  await expect(page.getByTestId(`job-status-${jobId}`)).toContainText("失敗");
  await expect(page.getByTestId(`job-failure-${jobId}`)).toContainText("上限");
  await expect(page.getByTestId(`download-${jobId}`)).toHaveCount(0);
});

test("対象0件は成功の空ファイルにならない", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("actor-select").selectOption("admin");
  // actor cookie 反映後の一覧再取得を待つ
  await expect(page.getByTestId("shipments-table")).toBeVisible({
    timeout: 5000,
  });
  await page.getByTestId("filter-warehouse").selectOption("WH-X");
  await page.getByTestId("filter-status").selectOption("cancelled");
  await page.getByTestId("filter-assignee").fill("nobody");
  await page.getByTestId("apply-filters").click();
  await expect(page.getByTestId("shipments-no-match")).toBeVisible();

  await page.getByTestId("request-export").click();
  const jobId = await acceptedJobId(page);
  await processNow(jobId);
  await page.getByTestId("refresh-jobs").click();

  await expect(page.getByTestId(`job-failure-${jobId}`)).toContainText("0件");
  await expect(page.getByTestId(`download-${jobId}`)).toHaveCount(0);
});

test("依頼後に画面条件を変えても元の依頼条件は固定", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("filter-warehouse").selectOption("WH-A");
  await page.getByTestId("filter-status").selectOption("draft");
  await page.getByTestId("apply-filters").click();
  await page.getByTestId("request-export").click();
  const jobId = await acceptedJobId(page);

  await page.getByTestId("filter-warehouse").selectOption("WH-B");
  await page.getByTestId("apply-filters").click();
  await expect(page.getByTestId("applied-criteria")).toContainText("WH-B");

  await expect(page.getByTestId(`job-criteria-${jobId}`)).toContainText("WH-A");
  await expect(page.getByTestId(`job-criteria-${jobId}`)).toContainText("draft");
});

test("他人の依頼成果物には一般担当は触れない", async ({ page, request }) => {
  // admin が API で依頼を作成
  const create = await request.post(`${API}/api/export-jobs`, {
    headers: {
      "content-type": "application/json",
      "x-actor-id": "admin",
    },
    data: { criteria: { warehouseId: "WH-X", status: "draft" } },
  });
  expect(create.status()).toBe(202);
  const job = await create.json();
  await processNow(job.id);

  await page.goto("/");
  await page.getByTestId("actor-select").selectOption("clerk");
  await page.getByTestId("refresh-jobs").click();
  await expect(page.getByTestId(`job-card-${job.id}`)).toHaveCount(0);

  const denied = await request.get(
    `${API}/api/export-jobs/${job.id}/download`,
    { headers: { "x-actor-id": "clerk" } },
  );
  expect([403, 404]).toContain(denied.status());
});

test("処理中の権限剥奪で失敗し部分成果物は出ない", async ({ page, request }) => {
  await page.goto("/");
  await page.getByTestId("filter-warehouse").selectOption("WH-A");
  await page.getByTestId("filter-status").selectOption("allocated");
  await page.getByTestId("apply-filters").click();
  await page.getByTestId("request-export").click();
  const jobId = await acceptedJobId(page);

  // 処理前に権限剥奪
  await request.post(`${API}/api/testing/revoke-scope`, {
    headers: {
      "content-type": "application/json",
      "x-actor-id": "clerk",
    },
    data: { actorId: "clerk", warehouseIds: [] },
  });

  await processNow(jobId);
  await page.getByTestId("refresh-jobs").click();
  await expect(page.getByTestId(`job-failure-${jobId}`)).toContainText(
    "閲覧権限",
  );
  await expect(page.getByTestId(`download-${jobId}`)).toHaveCount(0);
});
