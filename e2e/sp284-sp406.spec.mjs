import { test, expect } from "@playwright/test";

test("Промысловые трубопроводы: СП 284 + СП 406", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#task=criteria");
  await page.locator("#criteria-standard-search").fill("СП 284");
  await page.locator('[data-standard="sp284-sp406"]').click();

  await expect(page.locator(".criteria-warning strong")).toHaveText("Промысловые трубопроводы");
  await expect(page.locator(".criteria-warning")).toContainText("СП 284.1325800.2016");
  await expect(page.locator(".criteria-methods button")).toHaveCount(5);
  await expect(page.locator(".criteria-supporting")).toContainText("СП 406.1325800.2018");
  await expect(page.locator(".criteria-supporting")).toContainText("СП 86.13330.2022");

  await page.locator("#criteria-defect-search").fill("повторный ремонт");
  await page.locator('[data-match="sp284-vik-repeat-repair"]').click();
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.locator(".criteria-result")).toHaveClass(/danger/);
  await expect(page.locator(".criteria-result")).toContainText("ВЫРЕЗАТЬ");
  await expect(page.locator(".criteria-source")).toContainText("п. 19.7.7");

  await page.locator("#criteria-defect-search").fill("");
  await page.locator("#criteria-defect").selectOption("sp406-vik-undercut-gas");
  await page.locator('[name="thickness1"]').fill("12");
  await page.locator('[name="thickness2"]').fill("10");
  await page.locator('[name="depth"]').fill("0.5");
  await page.locator('[name="length"]').fill("150");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.locator(".criteria-result")).toHaveClass(/success/);
  await expect(page.locator(".criteria-result")).toContainText("S = min(S₁, S₂) = 10 мм");
  await expect(page.locator(".criteria-source")).toContainText("Объект и организация контроля: СП 284.1325800.2016");
  await expect(page.locator(".criteria-source")).toContainText("СП 86.13330.2022, Д.1");

  await page.locator('[data-method="uzk"]').click();
  await page.locator("#criteria-defect").selectOption("sp284-uzk-multilayer-joint");
  await page.getByRole("button", { name: "Показать нормативный маршрут" }).click();
  await expect(page.locator(".criteria-result")).toHaveClass(/warning/);
  await expect(page.locator(".criteria-result")).toContainText("технологической карте");

  const size = await page.evaluate(() => ({ full: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(size.full).toBeLessThanOrEqual(size.viewport + 1);
  expect(errors).toEqual([]);
});
