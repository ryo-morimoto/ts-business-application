import { expect, test } from "@playwright/test";
import {
  openWorkbench,
  resetFixtures,
  runBulkAssign,
  selectCustomersByName,
  setActor,
  setFilterQuery,
} from "./helpers";

test.beforeEach(async () => {
  await resetFixtures();
});

test.describe("bulk reassign workbench", () => {
  test("page selection: agent-a gets partial success (no silent skip)", async ({
    page,
  }) => {
    await openWorkbench(page);
    await setActor(page, "agent-a");

    // pageSize default 20 → all seeds on one page; c-003 Gamma is denied for agent-a
    await selectCustomersByName(page, ["Acme Corp", "Beta LLC", "Gamma Inc"]);
    await expect(page.getByTestId("selection-count")).toHaveText("3");

    await runBulkAssign(page, "u-e2e");

    const result = page.getByTestId("bulk-result");
    await expect(result).toContainText("2");
    await expect(result).toContainText("succeeded");
    await expect(result).toContainText("1");
    await expect(result).toContainText("failed");
    await expect(result).toContainText("partial");
    await expect(result).toContainText("c-003");
    await expect(result).toContainText("missing_permission");

    await expect(page.getByRole("row", { name: /Gamma Inc/ })).toContainText(
      "u-2",
    );
    await expect(page.getByRole("row", { name: /Acme Corp/ })).toContainText(
      "u-e2e",
    );
  });

  test("all_matching mode runs against server scope as admin", async ({
    page,
  }) => {
    await openWorkbench(page);
    await setActor(page, "admin");

    await setFilterQuery(page, "Corp");
    await expect(page.getByRole("row", { name: /Acme Corp/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Beta LLC/ })).toHaveCount(0);

    await page
      .locator("label")
      .filter({ hasText: /Selection scope/i })
      .locator("select")
      .selectOption("all_matching");

    await expect(page.getByTestId("selection-count")).toHaveText("1");

    await runBulkAssign(page, "u-all");
    const result = page.getByTestId("bulk-result");
    await expect(result).toContainText("1");
    await expect(result).toContainText("succeeded");
    await expect(result).not.toContainText("missing_permission");
    await expect(page.getByRole("row", { name: /Acme Corp/ })).toContainText(
      "u-all",
    );
  });

  test("URL keeps actor and filter after reload", async ({ page }) => {
    await openWorkbench(page);
    await setActor(page, "agent-b");
    await setFilterQuery(page, "Beta");
    await expect(page.getByRole("row", { name: /Beta LLC/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: /Customers/i })).toBeVisible();

    await expect(
      page.locator("label").filter({ hasText: /Actor/i }).locator("select"),
    ).toHaveValue("agent-b");
    await expect(page.getByPlaceholder("name contains")).toHaveValue("Beta");
    await expect(page.getByRole("row", { name: /Beta LLC/ })).toBeVisible();
  });
});
