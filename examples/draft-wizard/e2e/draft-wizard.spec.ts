import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3014";

async function reset() {
  await fetch(`${API}/api/testing/reset`, { method: "POST" });
}

test.beforeEach(async () => {
  await reset();
});

test("API: create → basics → lines → submit", async () => {
  const headers = {
    "content-type": "application/json",
    "x-actor-id": "author",
  };

  const created = await fetch(`${API}/api/drafts`, {
    method: "POST",
    headers,
  });
  expect(created.status).toBe(201);
  const { draft } = (await created.json()) as { draft: { id: string } };
  const id = draft.id;

  const patchBasics = await fetch(`${API}/api/drafts/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      title: "テスト発注",
      vendorName: "Vendor A",
    }),
  });
  expect(patchBasics.ok).toBeTruthy();

  const next1 = await fetch(`${API}/api/drafts/${id}/next`, {
    method: "POST",
    headers,
    body: JSON.stringify({ stepId: "basics" }),
  });
  expect(next1.ok).toBeTruthy();
  const n1 = (await next1.json()) as { step: string };
  expect(n1.step).toBe("lines");

  await fetch(`${API}/api/drafts/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      lines: [{ sku: "SKU-1", quantity: 3, unitPrice: 100 }],
    }),
  });

  const next2 = await fetch(`${API}/api/drafts/${id}/next`, {
    method: "POST",
    headers,
    body: JSON.stringify({ stepId: "lines" }),
  });
  expect(next2.ok).toBeTruthy();

  const sub = await fetch(`${API}/api/drafts/${id}/submit`, {
    method: "POST",
    headers,
  });
  expect(sub.status).toBe(201);
  const body = (await sub.json()) as {
    submitted: { id: string; payload: { title: string } };
  };
  expect(body.submitted.payload.title).toBe("テスト発注");

  const again = await fetch(`${API}/api/drafts/${id}/submit`, {
    method: "POST",
    headers,
  });
  expect(again.status).toBe(409);
});

test("UI: wizard happy path", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /発注リクエスト/ }),
  ).toBeVisible();

  await page.getByTestId("create-draft").click();
  await expect(page.getByTestId("wizard")).toBeVisible();
  await expect(page.getByTestId("step-basics")).toBeVisible();

  await page.getByTestId("field-title").fill("画面からの発注");
  await page.getByTestId("field-vendor").fill("UI Vendor");
  await page.getByTestId("wizard-next").click();

  await expect(page.getByTestId("step-lines")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("field-line-sku-0").fill("UI-SKU");
  await page.getByTestId("field-line-qty-0").fill("2");
  await page.getByTestId("wizard-save").click();
  await expect(page.getByTestId("wizard-message")).toContainText("保存", {
    timeout: 10_000,
  });
  await page.getByTestId("wizard-next").click();

  await expect(page.getByTestId("step-review")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("review-line-0")).toContainText("UI-SKU");
  await expect(page.getByTestId("readiness-ok")).toBeVisible();
  await page.getByTestId("wizard-submit").click();

  await expect(page.getByTestId("pr-detail")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("pr-title")).toHaveText("画面からの発注");
});

test("UI: gated next rejects empty basics", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("create-draft").click();
  await expect(page.getByTestId("wizard")).toBeVisible();
  await page.getByTestId("wizard-next").click();
  await expect(page.getByTestId("wizard-errors")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("step-basics")).toBeVisible();
});
