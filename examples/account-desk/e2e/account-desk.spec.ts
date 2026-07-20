import { expect, test } from "@playwright/test";

async function gotoAccounts(page: import("@playwright/test").Page) {
  await page.goto("/accounts");
  await expect(page.getByTestId("account-table")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test.describe("account-desk", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/testing/reset");
    await gotoAccounts(page);
  });

  test("list is a table and restores filters after detail", async ({
    page,
  }) => {
    await page.getByTestId("filter-incomplete").click();
    await expect(page).toHaveURL(/incomplete=1/);

    await page.getByRole("row", { name: /北関東フーズ 宇都宮/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "宇都宮",
    );
    await expect(page.getByText(/請求は親HD/)).toBeVisible();

    await page.getByRole("link", { name: "一覧へ戻る" }).click();
    await expect(page).toHaveURL(/incomplete=1/);
    await expect(page.getByTestId("filter-incomplete")).toBeChecked();
  });

  test("empty vs zero copy differs", async ({ page }) => {
    await page.getByTestId("filter-q").fill("___no_match___");
    await page.getByTestId("filter-q").press("Enter");
    await expect(page).toHaveURL(/q=/);
    await expect(page.getByTestId("empty-zero")).toBeVisible();
    await expect(
      page.getByText("条件に一致する取引先がありません"),
    ).toBeVisible();
  });

  test("edit bill_to on incomplete child", async ({ page }) => {
    await page.goto(
      "/accounts/acc_sb_child/edit?incomplete=1&sort=updatedAt&page=1",
    );
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "取引先の編集" }),
    ).toBeVisible({ timeout: 10_000 });

    // active は bill_to + 請求メールが揃うと ready
    await page.getByLabel("請求送付メール").fill("billing@ute.example");
    await page.getByRole("button", { name: "住所を追加" }).click();
    const last = page.locator("section#section-addresses tbody tr").last();
    await last.locator("select").first().selectOption("bill_to");
    const defaultBox = last.locator('input[type="checkbox"]');
    if (!(await defaultBox.isChecked())) {
      await defaultBox.click();
    }
    await last.locator("td").nth(5).locator("input").fill("宇都宮市請求1-1");

    await page.getByRole("button", { name: "保存" }).first().click();
    await expect(page.getByText("取引マスタは揃っています")).toBeVisible({
      timeout: 15_000,
    });
  });


  test("viewer cannot open edit", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "account-desk-actor",
        value: "viewer",
        url: "http://127.0.0.1:3016",
      },
    ]);
    await page.goto("/accounts/acc_sa/edit");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("empty-forbidden")).toBeVisible({
      timeout: 10_000,
    });
  });
});
