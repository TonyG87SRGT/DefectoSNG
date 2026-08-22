import { test, expect } from "@playwright/test";

const browserDiagnostics = new WeakMap();

test.beforeEach(async ({ page }) => {
  const diagnostics = { consoleErrors: [], pageErrors: [], notFound: [] };
  browserDiagnostics.set(page, diagnostics);
  page.on("console", message => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", error => diagnostics.pageErrors.push(error.message));
  page.on("response", response => {
    if (response.status() === 404) diagnostics.notFound.push(response.url());
  });
});

test.afterEach(async ({ page }) => {
  const diagnostics = browserDiagnostics.get(page);
  expect(diagnostics?.consoleErrors || [], "ошибки console.error").toEqual([]);
  expect(diagnostics?.pageErrors || [], "необработанные ошибки страницы").toEqual([]);
  expect(diagnostics?.notFound || [], "ответы HTTP 404").toEqual([]);
});

async function expectNoHorizontalOverflow(page) {
  let dimensions;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      break;
    } catch (error) {
      if (!/Execution context was destroyed/.test(error.message) || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded");
      await page.locator("#app-content").waitFor();
    }
  }
  expect(dimensions.page, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test("прямые маршруты, назад, поиск и избранное работают", async ({ page }) => {
  await page.goto("/#article=uzk:uzk-echo-backwall");
  await expect(page.getByRole("heading", { name: "Донный эхо-сигнал", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Добавить статью в избранное|Удалить статью из избранного/ }).click();
  await page.getByRole("button", { name: /Избранное/ }).click();
  await expect(page.getByRole("heading", { name: "Избранное", exact: true })).toBeVisible();
  await expect(page.getByText("Донный эхо-сигнал", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Поиск/ }).click();
  const search = page.getByRole("searchbox", { name: "Поиск по справочнику" });
  await search.fill("прослеживаемость результата");
  await expect(page.getByText("Прослеживаемость результата контроля", { exact: true })).toBeVisible();
  await search.fill("vibration-tool-diagnostic-tree");
  await expect(page.getByText("Найдено: 0", { exact: true })).toBeVisible();

  await page.goto("/#section=uzk:uzk-echo-atlas");
  await expect(page.getByRole("heading", { name: "Атлас эхо‑сигналов УЗК", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Сигналы, требующие уточнения/ }).click();
  await page.getByRole("button", { name: /^Вернуться/ }).click();
  await expect(page.getByRole("heading", { name: "Атлас эхо‑сигналов УЗК", exact: true })).toBeVisible();
});

test("нормативная карточка ГОСТ 32569-2013 доступна и находится поиском", async ({ page }) => {
  await page.goto("/#reference=gost-32569-2013-ndt");
  await expect(page.getByRole("heading", { name: "ГОСТ 32569-2013: НК технологических трубопроводов", exact: true })).toBeVisible();
  await expect(page.getByText("Минимальный объём УЗК или РК — таблица 12.3", { exact: true })).toBeVisible();
  await expect(page.locator(".article-table-scroll")).not.toHaveCount(0);

  for (const route of [
    ["/#article=vik:vik-gost-32569-2013-vik", "ГОСТ 32569-2013: критерии ВИК"],
    ["/#article=uzk:uzk-gost-32569-2013-uzk", "ГОСТ 32569-2013: критерии УЗК"],
    ["/#article=rk:rk-gost-32569-2013-ndt", "ГОСТ 32569-2013: критерии РК"],
    ["/#article=pvk:pvk-gost-32569-2013-pvk-mk", "ГОСТ 32569-2013: ПВК и МК"]
  ]) {
    await page.goto(route[0]);
    await expect(page.getByRole("heading", { name: route[1], exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Как пользоваться карточкой/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "ГОСТ 32569-2013: НК технологических трубопроводов", exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: /Поиск/ }).click();
  const search = page.getByRole("searchbox", { name: "Поиск по справочнику" });
  await search.fill("ГОСТ 32569 критерии УЗК");
  await expect(page.getByText("ГОСТ 32569-2013: НК технологических трубопроводов", { exact: true })).toBeVisible();
});

test("вложенная навигация ВД и якорное содержание ВИК доступны", async ({ page }) => {
  await page.goto("/#section=vibration:vibration-reference");
  await expect(page.getByRole("heading", { name: "Справочные материалы", exact: true })).toBeVisible();
  await expect(page.locator(".article-card")).toHaveCount(4);

  await page.goto("/#article=vik:vik-control-common-mistakes");
  const contents = page.getByText(/Содержание статьи/).first();
  await expect(contents).toBeVisible();
  await contents.click();
  const firstAnchor = page.locator("[data-article-anchor]").first();
  await expect(firstAnchor).toBeVisible();
  await firstAnchor.click();
  await expect(page.locator(".article-section-anchor:focus")).toHaveCount(1);
});

test("новые иллюстрации ВД загружаются в анализе, атласе и оборудовании", async ({ page }) => {
  await page.goto("/#article=vibration:vibration-time-waveform");
  await expect(page.getByRole("heading", { name: "Временной сигнал", exact: true })).toBeVisible();
  await expect(page.locator(".article-media-slots-waveform-gallery img")).toHaveCount(8);
  await expect(page.locator("img[src$='waveforms/beats.svg']")).toHaveCount(1);

  await page.goto("/#article=vibration:vibration-fault-gears");
  await expect(page.getByRole("heading", { name: "Дефекты зубчатых передач", exact: true })).toBeVisible();
  await expect(page.locator("img[src$='gears-waveform.svg']")).toHaveCount(1);

  await page.goto("/#article=vibration:vibration-diagnostics-gearboxes");
  await expect(page.getByRole("heading", { name: "Редукторы", exact: true })).toBeVisible();
  await expect(page.locator("img[src$='equipment/gearboxes.svg']")).toHaveCount(1);
});

test("мобильные ширины не создают горизонтальную прокрутку", async ({ page }) => {
  const routes = [
    "/#method=vik",
    "/#article=vik:vik-control-common-mistakes",
    "/#section=uzk:uzk-echo-atlas",
    "/#article=uzk:uzk-echo-planar",
    "/#reference=gost-32569-2013-ndt",
    "/#article=uzk:uzk-gost-32569-2013-uzk",
    "/#references",
    "/#tools",
    "/#section=vibration:vibration-reference",
    "/#article=vibration:vibration-time-waveform",
    "/#article=vibration:vibration-fault-gears",
    "/#article=vibration:vibration-diagnostics-gearboxes"
  ];
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      await page.goto(route);
      await page.locator("#app-content").waitFor();
      await expectNoHorizontalOverflow(page);
    }
  }
});

test("клавиатура, ARIA, контраст и таблицы проходят базовый аудит", async ({ page }) => {
  await page.goto("/#references");
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const style = getComputedStyle(element);
    return { tag: element?.tagName, outline: parseFloat(style.outlineWidth) || 0 };
  });
  expect(focus.tag).not.toBe("BODY");
  expect(focus.outline).toBeGreaterThan(0);

  const unnamed = await page.evaluate(() => [...document.querySelectorAll("button, a, input, select, textarea")]
    .filter(element => !element.hidden && element.getClientRects().length)
    .filter(element => !(element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.textContent.trim() || element.getAttribute("placeholder")))
    .map(element => element.outerHTML.slice(0, 160)));
  expect(unnamed).toEqual([]);
  await expect(page.locator("nav.bottom-nav")).toHaveAttribute("aria-label", "Основная навигация");

  await page.goto("/#reference=ndt-terminology");
  await expect(page.locator(".reference-table th[scope='col']")).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  const safePadding = await page.locator(".bottom-nav").evaluate(element => parseFloat(getComputedStyle(element).paddingBottom));
  expect(safePadding).toBeGreaterThanOrEqual(8);

  const lowContrast = await page.evaluate(() => {
    const luminance = value => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [0, 0, 0];
      const linear = channels.map(channel => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const background = getComputedStyle(document.body).backgroundColor;
    const backgroundLuminance = luminance(background);
    return [...document.querySelectorAll("p, li, td, th, button, a, small")]
      .filter(element => element.getClientRects().length && element.textContent.trim())
      .flatMap(element => {
        const style = getComputedStyle(element);
        if (parseFloat(style.fontSize) >= 24 || style.color === "rgba(0, 0, 0, 0)") return [];
        const foreground = luminance(style.color);
        const ratio = (Math.max(foreground, backgroundLuminance) + 0.05) / (Math.min(foreground, backgroundLuminance) + 0.05);
        return ratio < 4.5 ? [{ text: element.textContent.trim().slice(0, 50), color: style.color, ratio }] : [];
      });
  });
  expect(lowContrast).toEqual([]);
});

test("установленное приложение открывается offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.goto("/#article=uzk:uzk-echo-backwall");
  await expect(page.getByRole("heading", { name: "Донный эхо-сигнал", exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Донный эхо-сигнал", exact: true })).toBeVisible();
  await context.setOffline(false);
});
