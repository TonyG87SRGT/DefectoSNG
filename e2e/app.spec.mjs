import { test, expect } from "@playwright/test";

const diagnostics = new WeakMap();

test.beforeEach(async ({ page }) => {
  const state = { consoleErrors: [], pageErrors: [], notFound: [] };
  diagnostics.set(page, state);
  page.on("console", message => {
    if (message.type() === "error") state.consoleErrors.push(message.text());
  });
  page.on("pageerror", error => state.pageErrors.push(error.message));
  page.on("response", response => {
    if (response.status() === 404) state.notFound.push(response.url());
  });
});

test.afterEach(async ({ page }) => {
  const state = diagnostics.get(page);
  expect(state?.consoleErrors || [], "ошибки console.error").toEqual([]);
  expect(state?.pageErrors || [], "необработанные ошибки страницы").toEqual([]);
  expect(state?.notFound || [], "ответы HTTP 404").toEqual([]);
});

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(dimensions.page, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test("главная страница содержит только атлас, критерии и избранное", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /От признака на изображении/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Атлас дефектов/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Критерии отбраковки/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Атлас/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Критерии/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Избранное/ })).toBeVisible();
  await expect(page.getByText("Обучение", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Инструменты", { exact: true })).toHaveCount(0);
});

test("восемь визуальных коллекций открываются из единого атласа", async ({ page }) => {
  await page.goto("/#atlas");
  await expect(page.getByRole("heading", { name: "Атлас дефектов", exact: true })).toBeVisible();
  await expect(page.locator(".atlas-collection-card")).toHaveCount(8);
  await page.getByRole("link", { name: /Радиографические индикации/ }).click();
  await expect(page.getByRole("heading", { name: /Атлас радиографических/ })).toBeVisible();
  await page.getByRole("link", { name: /Полости и включения/ }).click();
  await page.getByRole("link", { name: /Одиночная газовая пора/ }).click();
  await expect(page.getByRole("heading", { name: /Одиночная газовая пора/ })).toBeVisible();
  await expect(page.locator(".visual-gallery img").first()).toBeVisible();
});

test("визуальная карточка ведёт к найденному нормативному критерию", async ({ page }) => {
  await page.goto("/#atlas=vik:vik-undercut");
  await expect(page.getByRole("heading", { name: "Подрез", exact: true })).toBeVisible();
  const criteria = page.locator(".related-criteria");
  await expect(criteria).toBeVisible();
  await expect(criteria.locator("[data-criterion]").first()).toBeVisible();
  const defectName = await criteria.locator("[data-criterion] strong").first().textContent();
  await criteria.locator("[data-criterion]").first().click();
  await expect(page.getByRole("heading", { name: "Критерии отбраковки", exact: true })).toBeVisible();
  await expect(page.locator("#criteria-defect option:checked")).toContainText(defectName.trim());
});

test("единый поиск одновременно находит визуальные карточки и критерии", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Поиск дефекта или критерия" });
  await search.fill("пора");
  await expect(page.getByRole("status")).toContainText(/Найдено: [1-9]/);
  await expect(page.locator("[data-search-item]").first()).toBeVisible();
  await expect(page.locator("[data-search-criterion]").first()).toBeVisible();
});

test("избранное хранит визуальную карточку", async ({ page }) => {
  await page.goto("/#atlas=rk:rk-atlas-crack");
  await page.getByRole("button", { name: "Добавить в избранное" }).click();
  await page.getByRole("button", { name: /Избранное/ }).click();
  await expect(page.getByRole("heading", { name: "Избранное", exact: true })).toBeVisible();
  await expect(page.getByText("Трещина", { exact: true })).toBeVisible();
});

test("мобильный путь атлас → дефект → критерий не переполняет экран", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#atlas");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: /Дефекты сварных соединений/ }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: /Подрез/ }).click();
  await expect(page.locator(".visual-gallery img").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.locator("[data-criterion]").first().click();
  await expect(page.getByRole("heading", { name: "Критерии отбраковки", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("атлас и критерии повторно открываются без сети после установки PWA", async ({ page, context }) => {
  await page.goto("/#atlas=rk:rk-atlas-crack");
  await expect(page.getByRole("heading", { name: "Трещина", exact: true })).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Трещина", exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Трещина", exact: true })).toBeVisible();
  await page.goto(new URL("/#criteria", page.url()).href);
  await expect(page.getByRole("heading", { name: "Критерии отбраковки", exact: true })).toBeVisible();
  await context.setOffline(false);
});
