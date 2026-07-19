import { expect, test } from "@playwright/test";

async function reset(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/testing/reset");
  expect(res.ok()).toBeTruthy();
}

async function setActor(
  page: import("@playwright/test").Page,
  actor: "appraiser" | "compliance" | "viewer",
) {
  await page.context().addCookies([
    {
      name: "kobutsu-satei-actor",
      value: actor,
      url: "http://127.0.0.1:3015",
    },
  ]);
}

async function openNewTicket(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/testing/create-ticket", {
    data: { channel: "store" },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { id: string };
  await page.goto(`/tickets/${body.id}`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("ticket-workbench")).toBeVisible({
    timeout: 15_000,
  });
  return body.id;
}

test.describe("kobutsu-satei", () => {
  test.beforeEach(async ({ page }) => {
    await reset(page);
  });

  test("A: low-value apparel accepts without identity", async ({ page }) => {
    await setActor(page, "appraiser");
    await openNewTicket(page);

    await page.getByTestId("add-line-apparel").click();
    await page
      .locator('[data-testid$="offerAmount"]')
      .first()
      .fill("8000");
    await page.locator('[data-testid$="-brand"]').first().fill("Uniqlo");
    await page
      .locator('[data-testid$="-condition"]')
      .first()
      .selectOption("good");
    await page.getByTestId("field-paymentMethod").selectOption("transfer");
    await page.getByTestId("field-authenticity").selectOption("pass");

    await expect(page.getByTestId("need-identity")).toContainText("false");
    await expect(page.getByTestId("group-seller")).toHaveCount(0);

    await page.getByTestId("accept-ticket").click();
    await expect(page.getByTestId("ledger-entry")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("B: game_soft always needs identity", async ({ page }) => {
    await setActor(page, "appraiser");
    await openNewTicket(page);
    await page.getByTestId("add-line-game_soft").click();
    await page
      .locator('[data-testid$="offerAmount"]')
      .first()
      .fill("3000");
    await page.locator('[data-testid$="-title"]').first().fill("Zelda");
    await page
      .locator('[data-testid$="-platform"]')
      .first()
      .selectOption("switch");
    await page
      .locator('[data-testid$="-working"]')
      .first()
      .selectOption("true");
    await page.getByTestId("field-paymentMethod").selectOption("transfer");

    await expect(page.getByTestId("need-identity")).toContainText("true");
    await expect(page.getByTestId("group-seller")).toBeVisible();
    await expect(page.getByTestId("ledger-ready")).toContainText("false");

    await page.getByTestId("accept-ticket").click();
    await expect(page.getByTestId("flash-msg")).toContainText("成約拒否");

    await page.getByTestId("field-seller.name").fill("山田太郎");
    await page.getByTestId("field-seller.address").fill("東京都千代田区");
    await page.getByTestId("field-seller.occupation").fill("会社員");
    await page.getByTestId("field-seller.age").fill("35");
    await page.getByTestId("field-idCheck.status").selectOption("complete");
    await page
      .getByTestId("field-idCheck.docType")
      .selectOption("drivers_license");
    await page.getByTestId("field-idCheck.method").fill("対面確認stub");

    await page.getByTestId("accept-ticket").click();
    await expect(page.getByTestId("ledger-entry")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("D: pin stays until explicit repin after CMS publish", async ({
    page,
  }) => {
    await setActor(page, "appraiser");
    const ticketId = await openNewTicket(page);
    await page.getByTestId("add-line-apparel").click();
    await page
      .locator('[data-testid$="offerAmount"]')
      .first()
      .fill("1000");
    await page.locator('[data-testid$="-brand"]').first().fill("X");
    await page
      .locator('[data-testid$="-condition"]')
      .first()
      .selectOption("good");
    await page.getByTestId("field-paymentMethod").selectOption("transfer");
    await page.getByTestId("field-authenticity").selectOption("pass");
    await page.getByTestId("save-ticket").click();
    await expect(page.getByTestId("need-identity")).toContainText("false");

    await setActor(page, "compliance");
    await page.goto("/rules", { waitUntil: "networkidle" });
    await page.getByTestId("clone-ruleset").click();
    await expect(page.getByTestId("cms-flash")).toContainText("draft");
    // Editor must be draft (enabled), not read-only active
    await expect(page.getByTestId("edit-force-all")).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId("edit-force-all").check();
    await page.getByTestId("publish-ruleset").click();
    await expect(page.getByTestId("cms-flash")).toContainText("publish");

    await setActor(page, "appraiser");
    await page.goto(`/tickets/${ticketId}`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("need-identity")).toContainText("false");
    await expect(page.getByTestId("repin")).toBeVisible();

    await page.getByTestId("repin").click();
    await expect(page.getByTestId("need-identity")).toContainText("true");
    await expect(page.getByTestId("group-seller")).toBeVisible();
  });

  test("CMS: edit all M keys, impact preview, discard, then publish", async ({
    page,
  }) => {
    await setActor(page, "compliance");
    await page.goto("/rules", { waitUntil: "networkidle" });
    await expect(page.getByTestId("rules-cms")).toBeVisible();
    await expect(page.getByTestId("ruleset-table")).toBeVisible();

    await page.getByTestId("clone-ruleset").click();
    await expect(page.getByTestId("cms-flash")).toContainText("draft");
    await expect(page.getByTestId("edit-label")).toBeEnabled({
      timeout: 10_000,
    });
    await expect(page.getByTestId("dirty-badge")).toHaveCount(0);

    await page.getByTestId("edit-label").fill("cms e2e draft");
    await page.getByTestId("edit-threshold").fill("5000");
    await page.getByTestId("edit-aml-threshold").fill("1000000");
    await page.getByTestId("edit-always-apparel").check();
    await expect(page.getByTestId("dirty-badge")).toBeVisible();

    // apparel 8k should need identity under threshold 5000
    await expect(
      page.getByTestId("impact-apparel_8k-identity"),
    ).toContainText("true");

    await page.getByTestId("save-draft").click();
    await expect(page.getByTestId("cms-flash")).toContainText("保存");
    await expect(page.getByTestId("diff-identityThresholdYen")).toBeVisible();

    // discard path
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("discard-draft").click();
    await expect(page.getByTestId("cms-flash")).toContainText("破棄");

    // publish path
    await page.getByTestId("clone-ruleset").click();
    await page.getByTestId("edit-force-all").check();
    await page.getByTestId("publish-ruleset").click();
    await expect(page.getByTestId("cms-flash")).toContainText("publish");
    // version number increments after discard; assert active row exists
    await expect(
      page.locator('[data-testid^="ruleset-row-"][data-status="active"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="ruleset-row-"][data-status="retired"]'),
    ).toHaveCount(1);
  });

  test("UI create button opens a new ticket", async ({ page }) => {
    await setActor(page, "appraiser");
    await page.goto("/tickets", { waitUntil: "networkidle" });
    await expect(page.getByTestId("create-ticket")).toBeEnabled();
    await page.getByTestId("create-ticket").click();
    await expect(page).toHaveURL(/\/tickets\/tk_/, { timeout: 20_000 });
    await expect(page.getByTestId("ticket-workbench")).toBeVisible();
  });

  test("E: suspicious report is independent of accept", async ({ page }) => {
    await setActor(page, "appraiser");
    await openNewTicket(page);
    await page.getByTestId("add-line-watch_jewelry").click();
    await page
      .locator('[data-testid$="offerAmount"]')
      .first()
      .fill("100000");
    await page.locator('[data-testid$="-brand"]').first().fill("Rolex");
    await page.locator('[data-testid$="-model"]').first().fill("Sub");
    await page.locator('[data-testid$="-serial"]').first().fill("SN1");
    await page.getByTestId("field-paymentMethod").selectOption("transfer");
    await page.getByTestId("field-authenticity").selectOption("hold");
    await page.getByTestId("report-note").fill("シリアルが不自然");
    await page.getByTestId("report-suspicious").click();
    await expect(page.getByTestId("flash-msg")).toContainText("不正品申告");
    await expect(page.getByTestId("suspicious-panel")).toContainText("sr_");
  });
});
