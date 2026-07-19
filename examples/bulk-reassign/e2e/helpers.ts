import { expect, type Page } from "@playwright/test";

export const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8788";

export async function resetFixtures(): Promise<void> {
  const res = await fetch(`${API_BASE}/__test__/reset`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`fixture reset failed: HTTP ${res.status}`);
  }
}

export async function openWorkbench(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Customers/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("row", { name: /Acme Corp/ })).toBeVisible();
}

export async function setActor(page: Page, actor: string): Promise<void> {
  const actorSelect = page
    .locator("label")
    .filter({ hasText: /Actor/i })
    .locator("select");
  await actorSelect.selectOption(actor);
  await expect(actorSelect).toHaveValue(actor);
  await expect(page.getByRole("table")).toBeVisible();
}

export async function setFilterQuery(page: Page, query: string): Promise<void> {
  const input = page.getByPlaceholder("name contains");
  await input.fill(query);
  if (query) {
    await page.waitForURL(new RegExp(`[?&]query=${encodeURIComponent(query)}`));
  } else {
    await page.waitForFunction(() => !new URL(window.location.href).searchParams.has("query"));
  }
}

export async function selectCustomersByName(
  page: Page,
  names: string[],
): Promise<void> {
  for (const name of names) {
    const box = page.getByRole("checkbox", { name: `Select ${name}` });
    await expect(box).toBeVisible();
    await box.check();
  }
}

export async function runBulkAssign(
  page: Page,
  assigneeId = "u-e2e",
): Promise<void> {
  await page.getByRole("button", { name: /Bulk change assignee/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("input").fill(assigneeId);
  await dialog.getByRole("button", { name: /^Apply$/ }).click();
  await expect(page.getByTestId("bulk-result")).toBeVisible({
    timeout: 15_000,
  });
}
