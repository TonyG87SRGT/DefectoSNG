import { test, expect } from "@playwright/test";

for (const width of [390, 768, 1440]) {
  test("РВС №305: выбор, расчёт и адаптация " + width, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#task=criteria");
    await page.locator("#criteria-standard-search").fill("РВС");
    await page.locator('[data-standard="rvs-rb305"]').click();
    await expect(page.locator(".criteria-methods button")).toHaveCount(8);
    await expect(page.locator(".criteria-warning")).toContainText("не является нормативным правовым актом");
    await page.locator("#criteria-defect-search").fill("смещение");
    await page.locator('[data-match="rb305-vik-offset"]').click();
    await page.locator('[name="rb305S"]').fill("12");
    await page.locator('[name="edgeOffset"]').fill("1,2");
    await page.getByRole("button", { name: "Проверить критерий" }).click();
    await expect(page.locator(".criteria-result")).toHaveClass(/success/);
    await expect(page.locator(".criteria-result")).toContainText("1,2 мм");
    await expect(page.locator(".criteria-source")).toContainText("23.08.2023");
    await expect(page.locator(".criteria-source")).toContainText("Таблица № 1");
    for (const query of ["подрез", "непровар"]) {
      await page.locator("#criteria-defect-search").fill(query);
      await expect(page.locator(".criteria-search-results button").first()).toBeVisible();
    }
    await page.locator('[data-method="uzk"]').click();
    await page.locator("#criteria-defect").selectOption("rb305-uzk-table");
    await page.locator('[name="rb305S"]').fill("8");
    await page.locator('[name="rb305Temperature"]').selectOption("cold");
    await expect(page.locator('[name="rb305S"]')).toHaveValue("8");
    await page.getByRole("button", { name: "Проверить критерий" }).click();
    await expect(page.locator(".criteria-result")).toContainText("2,5 мм²");
    await expect(page.locator(".criteria-result")).toContainText("3,5 мм²");
    await expect(page.locator(".criteria-result")).toHaveClass(/warning/);
    await page.locator('[data-method="rk"]').click();
    await page.locator("#criteria-defect").selectOption("rb305-rk-pores");
    await page.locator('[name="rb305Ae"]').selectOption("active");
    await page.getByRole("button", { name: "Проверить критерий" }).click();
    await expect(page.locator(".criteria-result")).toContainText("Требуется".toUpperCase());
    const size = await page.evaluate(() => ({ full: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(size.full).toBeLessThanOrEqual(size.viewport + 1);
    await page.screenshot({ path: "test-results/rb305-" + width + ".png", fullPage: true });
    await page.locator("#back-button").click();
    await expect(page.locator("#criteria-form")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("РВС №305: глобальный поиск, прямая ссылка и offline", async ({ page, context }) => {
  test.setTimeout(60000);
  await page.goto("/#search=" + encodeURIComponent("УЗК РВС"));
  const result = page.locator('[data-search-criterion="rb305-uzk-table"]');
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator("#criteria-defect")).toHaveValue("rb305-uzk-table");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#criteria-defect")).toHaveValue("rb305-uzk-table");
  await page.locator('[name="rb305S"]').fill("12");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.locator(".criteria-result")).toContainText("25 мм");
  await expect(page.locator(".criteria-result")).toContainText("7 мм²");
  await context.setOffline(false);
});
