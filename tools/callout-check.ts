import { chromium, webkit } from 'playwright';
import axe from 'axe-core';
const assert = (v: unknown, message: string) => { if (!v) throw new Error(message); };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) {
      const page = await browser.newPage({ colorScheme, viewport: { width: 1100, height: 1000 } });
      await page.goto('http://localhost:8471/examples/callout.html');
      await page.addScriptTag({ content: axe.source });
      for (const width of [1100, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const violations = await page.evaluate(async () => (await (window as any).axe.run()).violations.map((v: any) => v.id));
        assert(!violations.length, `axe ${width}: ${violations}`);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflow');
      }
      assert(await page.locator('m-callout[role]').count() === 0, 'Static callouts should not force roles');
      await page.locator('.dismiss').click();
      assert(!await page.locator('#saved').isVisible(), 'Dismiss does not hide');
      assert(await page.locator('#save').evaluate(e => e === document.activeElement), 'Dismiss focus restoration');
      await page.locator('#save').click();
      assert(await page.locator('#saved').isVisible(), 'Save restores confirmation');
      await page.locator('[data-retry]').first().click();
      assert(await page.locator('[data-retry]').first().isDisabled(), 'Retry completion');
      await page.locator('[data-plan]').first().click();
      assert(await page.locator('dialog').isVisible(), 'Authored action');
      await page.locator('dialog button').click();
      await page.close();
      const plain = await browser.newPage({ javaScriptEnabled: false, colorScheme, viewport: { width: 320, height: 1000 } });
      await plain.goto('http://localhost:8471/docs/callout.html');
      assert(await plain.locator('m-callout').first().isVisible(), 'CSS-only callout missing');
      await plain.evaluate(() => {
        document.documentElement.dir = 'rtl';
        const e = document.querySelector('m-callout')!;
        e.querySelector('p')!.textContent = 'A'.repeat(180);
      });
      assert(await plain.locator('m-callout').first().evaluate(e => e.scrollWidth <= e.clientWidth), 'Long content overflow');
      await plain.evaluate(() => { const style = document.createElement('style'); style.textContent = 'm-callout { --callout-background: rgb(1, 2, 3); }'; document.head.append(style); });
      assert(await plain.locator('m-callout').first().evaluate(e => getComputedStyle(e).backgroundColor === 'rgb(1, 2, 3)'), 'Theme override lost');
      await plain.locator('m-callout').first().evaluate(e => e.setAttribute('hidden', ''));
      assert(!await plain.locator('m-callout').first().isVisible(), 'Native hidden failed');
      await plain.close();
      console.log(`${engine.name()} ${colorScheme}: responsive layout, axe, actions, no-JS, RTL, theme override, and hidden pass`);
    }
  } finally { await browser.close(); }
}
