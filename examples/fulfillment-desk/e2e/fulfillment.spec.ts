import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3012";

test.beforeEach(async () => {
  await fetch(`${API}/api/testing/reset`, { method: "POST" });
});

test("rejects unsupported free-text filter with structured error", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Fulfillment desk/i }),
  ).toBeVisible();

  await page.getByTestId("probe-unsupported").click();
  await expect(page.getByTestId("probe-error")).toContainText(
    "unsupported_filter",
  );
  await expect(page.getByTestId("probe-error")).toContainText("q");
});

test("detail composes customer; ship shortage and success; shows provenance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "ord_002" }).click();
  await expect(page.getByText("Beta Industries")).toBeVisible();
  await expect(page.getByText(/shortage on one or more lines/i)).toBeVisible();
  await expect(page.getByTestId("provenance")).toContainText("customer");
  await expect(page.getByTestId("provenance")).toContainText("inventory");

  await page.getByTestId("ship-button").click();
  await expect(page.getByTestId("ship-error")).toContainText(
    "inventory_shortage",
  );

  await page.goto("/orders/ord_001");
  await expect(page.getByText("Acme Corp")).toBeVisible();
  await page.getByTestId("carrier-select").selectOption("YAMATO");
  await page.getByTestId("ship-button").click();
  await expect(page.getByTestId("ship-ok")).toContainText("shipped");
  await expect(page.getByTestId("ship-ok")).toContainText("TRK-");
});

test("maps external rate limit with retryAfter", async ({ page }) => {
  await page.goto("/orders/ord_001");
  await expect(page.getByText("Acme Corp")).toBeVisible();
  await page
    .getByTestId("carrier-select")
    .selectOption("SIMULATE_RATE_LIMIT");
  await expect(page.getByTestId("ship-button")).toBeEnabled();
  await page.getByTestId("ship-button").click();
  await expect(page.getByTestId("ship-error")).toContainText(
    "external_rate_limited",
  );
  await expect(page.getByTestId("ship-error")).toContainText("retryAfter=30");
});

test("composition fails when customer SoR has no row", async ({ page }) => {
  await page.goto("/orders/ord_orphan");
  await expect(page.getByTestId("ship-error")).toContainText(
    "composition_failed",
  );
  await expect(page.getByTestId("ship-error")).toContainText("customer");
});
