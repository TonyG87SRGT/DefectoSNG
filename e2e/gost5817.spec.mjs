import { test, expect } from "@playwright/test";

test("Общие сварные соединения: выбор ГОСТ ISO 5817 и расчёт подреза", async ({ page }) => {
  await page.goto("/#task=criteria");
  await page.locator("#criteria-standard-search").fill("ГОСТ ISO 5817");
  await page.getByRole("button", { name: /Общие сварные соединения/ }).click();

  await expect(page.locator(".criteria-warning")).toContainText("толщина от 0,5 мм");
  await expect(page.locator(".criteria-methods button")).toHaveCount(3);
  await page.locator("#criteria-defect-search").fill("подрез");
  await page.locator('[data-match="iso5817-undercut"]').click();
  await page.locator('select[name="iso5817Quality"]').selectOption("B");
  await page.locator('input[name="iso5817Thickness"]').fill("10");
  await page.locator('input[name="iso5817Measured"]').fill("0,5");
  await page.locator("#criteria-form").getByRole("button", { name: "Проверить критерий" }).click();

  await expect(page.locator(".criteria-result")).toHaveClass(/success/);
  await expect(page.locator(".criteria-result")).toContainText("0,5 мм");
  await expect(page.locator(".criteria-source")).toContainText("таблица 1, позиция 1.7");
});
