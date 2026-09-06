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

test("мастер начинается с НТД, изолирует документы и рассчитывает выбранный критерий", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/#task=criteria");
  await expect(page.getByRole("heading", { name: "Найти критерий", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. Нормативный документ", exact: true })).toBeVisible();
  await expect(page.getByText(/Численные критерии приведены в приложении Д СП 86/)).toBeVisible();
  await expect(page.getByRole("button", { name: /ГОСТ Р ИСО 17640/ })).toHaveCount(0);
  await page.locator("#criteria-defect").selectOption("sp406-vik-undercut-gas");
  await page.getByLabel(/Толщина стенки S₁/).fill("12");
  await page.getByLabel(/Глубина дефекта/).fill("0.4");
  await page.getByLabel(/Протяжённость одного дефекта/).fill("100");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.getByRole("heading", { name: "ГОДЕН ПО ВЫБРАННОМУ КРИТЕРИЮ", exact: true })).toBeVisible();
  await expect(page.getByText(/0,1 × S = 1,2 мм/)).toBeVisible();
  await expect(page.getByText(/Критерий: СП 86\.13330\.2022, Д\.1/)).toBeVisible();

  await page.getByRole("button", { name: /ГОСТ 32569 Технологические/ }).click();
  await expect(page.getByText(/Применяйте только к технологическим/)).toBeVisible();
  await expect(page.locator("#criteria-defect option")).toHaveCount(3);
  await page.locator("#criteria-defect").selectOption("gost32569-vik-undercut");
  await page.getByLabel("Условия трубопровода").selectOption("standard");
  await page.getByLabel(/Толщина стенки S₁/).fill("10");
  await page.getByLabel(/Длина оцениваемого шва/).fill("100");
  await page.getByLabel(/Глубина дефекта/).fill("0.5");
  await page.locator('input[name="totalLength"]').fill("30");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.getByRole("heading", { name: "ГОДЕН ПО ВЫБРАННОМУ КРИТЕРИЮ", exact: true })).toBeVisible();
  await expect(page.getByText(/Критерий: ГОСТ 32569-2013, п\. 12\.3\.4/)).toBeVisible();

  await page.getByRole("button", { name: /ГОСТ ISO 11666/ }).click();
  await expect(page.getByText(/Уровень качества D находится вне области/)).toBeVisible();
  await expect(page.getByText("Как выполнить УЗК по ГОСТ Р ИСО 17640-2016", { exact: true })).toBeVisible();
  await page.locator("#criteria-defect").selectOption("gost11666-quality-mapping");
  await expect(page.getByLabel(/Уровень качества по ISO 5817/).locator("option")).toHaveCount(2);

  await page.getByRole("button", { name: /СТО Газпром 15-1\.3-004-2023/ }).click();
  await expect(page.getByText(/Стандарт применяют к объектам ПАО «Газпром»/)).toBeVisible();
  await page.getByRole("button", { name: /^УЗК/ }).click();
  await page.locator("#criteria-defect").selectOption("sto-gazprom-uzk-equivalent-area");
  await page.getByLabel("Уровень качества").selectOption("B");
  await page.getByLabel(/Толщина стенки S₁/).fill("8");
  await page.getByRole("spinbutton", { name: /Эквивалентная площадь/ }).fill("1.5");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.getByRole("heading", { name: "ГОДЕН ПО ВЫБРАННОМУ КРИТЕРИЮ", exact: true })).toBeVisible();
  await expect(page.getByText(/Критерий: СТО Газпром 15-1\.3-004-2023, таблица 6\.4/)).toBeVisible();

  await page.getByRole("button", { name: /ФНП № 536/ }).click();
  await expect(page.getByText(/РП выбирают строго по п\. 2/)).toBeVisible();
  await page.getByRole("button", { name: /^ВИК/ }).click();
  await page.locator("#criteria-defect").selectOption("fnp536-vik-depression");
  await page.getByLabel(/Размерный показатель РП/).fill("10");
  await page.getByLabel(/Глубина дефекта/).fill("1.8");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.getByRole("heading", { name: "ГОДЕН ПО ВЫБРАННОМУ КРИТЕРИЮ", exact: true })).toBeVisible();
  await expect(page.getByText(/0,12 × РП \+ 0,6 = 1,8 мм/)).toBeVisible();
  await expect(page.getByText(/Критерий: ФНП ОРПД — Приказ Ростехнадзора № 536, таблица 12\.1/)).toBeVisible();

  await page.getByRole("button", { name: /^УЗК/ }).click();
  await page.locator("#criteria-defect").selectOption("fnp536-uzk-conditions");
  await page.getByLabel(/Условная протяжённость несплошности/).fill("8");
  await page.getByLabel(/Условная протяжённость эталонного отражателя/).fill("8");
  await page.getByLabel(/Расстояние между соседними несплошностями/).fill("10");
  await page.getByLabel(/Большая условная протяжённость/).fill("10");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.getByRole("heading", { name: "ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ НД", exact: true })).toBeVisible();

  await page.getByLabel("Поиск НТД или объекта").fill("вертикальный резервуар");
  await page.getByRole("button", { name: /РВС — ГОСТ 31385 \/ СП 365/ }).click();
  await expect(page.getByText(/Для РК используется нормативная цепочка с ГОСТ 23055-78/)).toBeVisible();
  await page.getByRole("button", { name: /^ВИК/ }).click();
  await page.locator("#criteria-defect").selectOption("rvs-vik-prohibited-surface");
  await page.getByRole("button", { name: "Проверить критерий" }).click();
  await expect(page.getByRole("heading", { name: "НЕ ДОПУСКАЕТСЯ", exact: true })).toBeVisible();
  await expect(page.getByText(/Критерий: ГОСТ 31385-2023, п\. 9\.3\.5/)).toBeVisible();
});

test("карточка A1550 IntroVisor открывается, ищется и показывает практические блоки", async ({ page }) => {
  await page.goto("/#article=uzk:uzk-equipment-a1550-introvisor");
  await expect(page.getByRole("heading", { name: "A1550 IntroVisor", exact: true })).toBeVisible();
  await expect(page.locator(".article-toc")).toHaveCount(1);
  await expect(page.locator("img[src*='a1550-']")).toHaveCount(3);
  await expect(page.locator(".article-external-link")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Рекомендательные варианты выбора АР по толщине", exact: true })).toBeVisible();
  await expect(page.getByText(/318xxxx/).first()).toBeVisible();

  await page.getByRole("button", { name: /Поиск/ }).click();
  const search = page.getByRole("searchbox", { name: "Поиск по справочнику" });
  await search.fill("M9170 настройка томографа");
  await expect(page.getByText("A1550 IntroVisor", { exact: true })).toBeVisible();
});

test("схема органов управления находится в начале карточки УСД-50 IPS", async ({ page }) => {
  await page.goto("/#article=uzk:uzk-equipment-usd-50-ips");
  await expect(page.getByRole("heading", { name: "УСД-50 IPS", exact: true })).toBeVisible();
  const imageButton = page.getByRole("button", { name: /Открыть изображение: УСД-50 IPS с подписями/ });
  await expect(imageButton).toBeVisible();
  await expect.poll(() => imageButton.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
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
    "/#task=criteria",
    "/#method=vik",
    "/#article=vik:vik-control-common-mistakes",
    "/#section=uzk:uzk-echo-atlas",
    "/#article=uzk:uzk-echo-planar",
    "/#article=uzk:uzk-equipment-a1550-introvisor",
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
  await page.locator("#app-content").waitFor();
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

test("все общие инструменты открываются, рассчитывают и находятся поиском", async ({ page }) => {
  const tools = [
    "ring-weld", "ut-coordinates", "ut-scan-zone", "db-calculator", "ring-position",
    "thickness-analysis", "ndt-converter", "ndt-checklist", "vessel-strength"
  ];
  for (const tool of tools) {
    await page.goto(`/#tool=${tool}`);
    await page.locator(".tool-card").waitFor();
    await expectNoHorizontalOverflow(page);
  }

  await page.goto("/#tool=vessel-strength");
  await page.locator("#vs-diameter").fill("1000");
  await page.locator("#vs-thickness").fill("12");
  await page.locator("#vs-allowance").fill("2");
  await page.locator("#vs-stress").fill("140");
  await page.locator("#vs-factor").fill("0.9");
  await page.locator("#vs-pressure").fill("2");
  await expect(page.locator("#vs-pressure-result")).toContainText("2,495");
  await expect(page.locator("#vs-status")).toContainText("не превышает");

  await page.getByRole("button", { name: /Поиск/ }).click();
  await page.getByRole("searchbox", { name: "Поиск по справочнику" }).fill("координаты отражателя");
  await expect(page.getByRole("heading", { name: "Координаты отражателя УЗК", exact: true })).toBeVisible();
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
