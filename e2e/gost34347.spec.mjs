import { test, expect } from "@playwright/test";

test("Сосуды и аппараты: ГОСТ 34347, ВИК и РК", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#task=criteria");
  await page.locator("#criteria-standard-search").fill("ГОСТ 34347");
  await page.locator('[data-standard="gost34347"]').click();

  await expect(page.locator(".criteria-warning strong")).toHaveText("Сосуды и аппараты");
  await expect(page.locator(".criteria-methods button")).toHaveCount(5);
  await expect(page.locator(".criteria-warning")).toContainText("ГОСТ 23055-78");

  await page.locator("#criteria-defect-search").fill("наружные поры");
  await page.locator('[data-match="gost34347-vik-pores"]').click();
  await page.locator('[name="gost34347Thickness"]').fill("10");
  await page.locator('[name="width"]').fill("1,2");
  await page.locator('[name="defectCount"]').fill("5");
  await page.getByRole("button", { name: "Проверить критерий" }).click();

  await expect(page.locator(".criteria-result")).toHaveClass(/success/);
  await expect(page.locator(".criteria-result")).toContainText("1,2 мм");
  await expect(page.locator(".criteria-source")).toContainText("таблица 15");

  await page.locator('[data-method="rk"]').click();
  await page.locator("#criteria-defect").selectOption("gost34347-rk-pores-inclusions");
  await page.locator('[name="gost34347VesselGroup"]').selectOption("1");
  await page.locator('[name="gost34347JointType"]').selectOption("butt");
  await page.locator('[name="gost34347Thickness"]').fill("10");
  await page.locator('[name="width"]').fill("0,8");
  await page.locator('[name="length"]').fill("2,5");
  await page.locator('[name="clusterLength"]').fill("3,75");
  await page.locator('[name="totalLength"]').fill("8");
  await page.getByRole("button", { name: "Проверить критерий" }).click();

  await expect(page.locator(".criteria-result")).toHaveClass(/success/);
  await expect(page.locator(".criteria-result")).toContainText("КЛАССУ 3");
  await expect(page.locator(".criteria-source")).toContainText("таблица 16");

  const size = await page.evaluate(() => ({ full: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(size.full).toBeLessThanOrEqual(size.viewport + 1);
  expect(errors).toEqual([]);
});
