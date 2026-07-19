import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3011";

test.beforeEach(async () => {
  await fetch(`${API}/api/__test__/reset`, { method: "POST" });
});

test("author submits draft; reviewer cannot approve from wrong UI order is still enforced", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Requests/i })).toBeVisible();

  // default actor author — open draft
  await page.getByRole("link", { name: "r-001" }).click();
  await expect(page.getByText("Status:")).toBeVisible();

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByTestId("transition-error")).toContainText(
    "missing_permission",
  );

  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByTestId("transition-ok")).toContainText("submitted");

  // switch to reviewer via select
  await page
    .locator("label")
    .filter({ hasText: /Actor/i })
    .locator("select")
    .selectOption("reviewer");

  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(page.getByTestId("transition-error")).toContainText(
    "reason_required",
  );

  await page.getByPlaceholder("Why rejected?").fill("Need more detail");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(page.getByTestId("transition-ok")).toContainText("rejected");
  await expect(page.getByText(/Need more detail/)).toBeVisible();
});
