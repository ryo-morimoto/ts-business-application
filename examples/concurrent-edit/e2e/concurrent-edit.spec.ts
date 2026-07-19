import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const res = await request.post("/api/testing/reset");
  expect(res.ok()).toBeTruthy();
});

async function openOrder(page: import("@playwright/test").Page, orderId: string) {
  await page.goto(`/orders/${orderId}`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("order-edit-form")).toBeVisible();
  await expect(page.getByTestId("save-order")).toBeEnabled();
}

test("list shows seed orders", async ({ page }) => {
  await page.goto("/orders", { waitUntil: "networkidle" });
  await expect(page.getByTestId("order-list")).toBeVisible();
  await expect(page.getByRole("link", { name: "ord_1001" })).toBeVisible();
});

test("happy path save increments version", async ({ page }) => {
  await openOrder(page, "ord_1001");
  await expect(page.getByTestId("expected-version")).toHaveText("1");

  await page.getByTestId("field-customer").fill("Northwind Trading Updated");
  await page.getByTestId("save-order").click();

  await expect(page.getByTestId("status-message")).toContainText("Saved as v2");
  await expect(page.getByTestId("expected-version")).toHaveText("2");
});

test("stale expectedVersion shows conflict panel (no LWW)", async ({ page }) => {
  await openOrder(page, "ord_1001");
  await expect(page.getByTestId("expected-version")).toHaveText("1");

  await page.getByTestId("field-customer").fill("Alice draft customer");
  await page.getByTestId("simulate-peer-save").click();
  await expect(page.getByTestId("peer-note")).toContainText("v2");

  // Form still baselined on v1
  await expect(page.getByTestId("expected-version")).toHaveText("1");
  await page.getByTestId("save-order").click();

  await expect(page.getByTestId("conflict-panel")).toBeVisible();
  await expect(page.getByTestId("conflict-server-version")).toContainText("v2");
  await expect(page.getByTestId("conflict-server-customer")).toContainText(
    "[peer",
  );

  // Customer field still has Alice draft (not server overwrite)
  await expect(page.getByTestId("field-customer")).toHaveValue(
    "Alice draft customer",
  );
});

test("rebase then save applies local draft on new version", async ({ page }) => {
  await openOrder(page, "ord_1002");
  await expect(page.getByTestId("expected-version")).toHaveText("4");

  await page.getByTestId("field-customer").fill("Contoso rebased");
  await page.getByTestId("simulate-peer-save").click();
  await expect(page.getByTestId("peer-note")).toBeVisible();
  await page.getByTestId("save-order").click();
  await expect(page.getByTestId("conflict-panel")).toBeVisible();

  await page.getByTestId("conflict-rebase").click();
  await page.getByTestId("save-order").click();
  await expect(page.getByTestId("status-message")).toContainText("Saved as v");
  await expect(page.getByTestId("field-customer")).toHaveValue("Contoso rebased");
});

test("viewer cannot save", async ({ page }) => {
  await openOrder(page, "ord_1001");
  await page.getByTestId("actor-select").selectOption("viewer");
  await expect(page.getByTestId("read-only-hint")).toBeVisible();
  await expect(page.getByTestId("save-order")).toBeDisabled();
});
