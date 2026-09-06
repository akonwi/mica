import { expect, test } from "bun:test";
import { chromium, webkit } from "playwright";
import { captureVisual } from "./snapshot-capture";

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  test(`${name}: capture ignores fractional position, preserves styles, and detects paint changes`, async () => {
    const browser = await engine.launch();
    try {
      for (const colorScheme of ["light", "dark"] as const) {
        const page = await browser.newPage({
          viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2,
          colorScheme, reducedMotion: "reduce",
        });
        await page.setContent(`<style>${await Bun.file(new URL("../mica.css", import.meta.url)).text()}</style>
          <main style="margin: 40px">
            <progress value="40" max="100" style="width:240px; transform:translateX(0.25px)"></progress>
            <m-avatar style="--avatar-size:48px"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="currentColor"/></svg></m-avatar>
          </main>`);
        for (const selector of ["progress", "m-avatar"]) {
          const locator = page.locator(selector);
          const originalStyle = await locator.getAttribute("style");
          const reference = await captureVisual(locator);
          for (const offset of [0.125, 0.25, 0.5, 0.75]) {
            await page.locator("main").evaluate((el, offset) => {
              el.style.marginTop = `${40 + offset}px`;
              el.style.marginLeft = `${40 + offset}px`;
            }, offset);
            const actual = await captureVisual(locator);
            expect(actual.equals(reference)).toBe(true);
            expect(await locator.getAttribute("style")).toBe(originalStyle);
          }
        }
        const progress = page.locator("progress");
        const before = await captureVisual(progress);
        await progress.evaluate((el: HTMLProgressElement) => { el.value = 80; });
        expect((await captureVisual(progress)).equals(before)).toBe(false);
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }, 60_000);
}
