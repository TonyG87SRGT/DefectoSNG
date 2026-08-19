import { chromium } from "@playwright/test";

const baseUrl = process.env.DEFECTOSNG_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];

page.on("console", message => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", error => errors.push(`page: ${error.message}`));
page.on("response", response => {
  if (response.status() === 404) errors.push(`404: ${response.url()}`);
});

const cases = [
  ["#article=vibration:vibration-time-waveform", 8],
  ["#article=vibration:vibration-fault-gears", 5],
  ["#article=vibration:vibration-diagnostics-gearboxes", 1],
  ["#article=vibration:vibration-diagnostics-vertical-machines", 1]
];

try {
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [hash, expectedImages] of cases) {
      await page.goto(`${baseUrl}/${hash}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator("#app-content").waitFor({ timeout: 15_000 });
      await page.waitForFunction(count => {
        const images = [...document.querySelectorAll(".article-media-slots img")];
        return images.length === count && images.every(image => image.complete && image.naturalWidth > 0);
      }, expectedImages, { timeout: 15_000 });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      if (dimensions.document > dimensions.viewport + 1 || dimensions.body > dimensions.viewport + 1) {
        throw new Error(`Horizontal overflow ${width}px ${hash}: ${JSON.stringify(dimensions)}`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Vibration visual smoke-test passed: 4 routes × 4 mobile widths, 0 console errors, 0 HTTP 404.");
} finally {
  await context.close();
  await browser.close();
}
