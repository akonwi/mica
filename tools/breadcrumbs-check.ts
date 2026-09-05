import { chromium, webkit } from 'playwright';
import axe from 'axe-core';
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) for (const direction of ['ltr', 'rtl']) {
      const page = await browser.newPage({ colorScheme, viewport:{width:1100,height:1050} });
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:8471/examples/breadcrumbs.html');
      await page.locator('[data-m-breadcrumb-ready]').waitFor();
      await page.evaluate(dir => document.documentElement.dir = dir, direction);
      const summary = page.locator('summary'), menu = page.locator('[data-breadcrumb-menu]');
      await summary.press('Enter');
      await page.waitForTimeout(80);
      assert(await menu.isVisible(), 'Native disclosure did not open');
      await page.addScriptTag({content:axe.source});
      const violations = await page.evaluate(async () => (await (window as any).axe.run()).violations.map((v:any) => v.id));
      assert(!violations.length, `Axe: ${violations}`);
      if (direction === 'ltr') await page.screenshot({path:`/tmp/breadcrumb-integrated-${engine.name()}-${colorScheme}-wide.png`,fullPage:true});
      await page.keyboard.press(engine.name() === 'webkit' ? 'Alt+Tab' : 'Tab');
      assert(await menu.locator('a').first().evaluate(e => e === document.activeElement), 'Native link order lost');
      await page.keyboard.press('Escape');
      assert(!(await menu.isVisible()) && await summary.evaluate(e => e === document.activeElement), 'Escape/focus failed');
      await summary.click();
      await page.locator('#dark').focus();
      assert(!(await menu.isVisible()), 'Focus-out failed');
      await summary.click();
      await page.locator('h1').click();
      assert(!(await menu.isVisible()), 'Outside click failed');
      await page.setViewportSize({width:320,height:900});
      await summary.click();
      await page.waitForTimeout(80);
      assert(await menu.evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }), 'Narrow panel outside viewport');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflow');
      if (direction === 'ltr') await page.screenshot({path:`/tmp/breadcrumb-integrated-${engine.name()}-${colorScheme}-narrow.png`,fullPage:true});
      await menu.locator('a').first().click();
      assert(!(await menu.isVisible()), 'Link activation failed to dismiss');
      await page.evaluate(() => { const e=document.querySelector('m-breadcrumb-overflow')!;const p=e.parentElement!;e.remove();p.append(e); });
      await page.locator('[data-m-breadcrumb-ready]').waitFor();
      await summary.click();
      assert(await menu.isVisible(), 'Reconnect failed');
      await page.evaluate(() => { const e=document.createElement('m-error');document.body.append(e);if(getComputedStyle(e).display!=='none')throw Error('CSS canary');e.remove(); });
      assert(!errors.length, errors.join('\n'));
      console.log(`${engine.name()} ${colorScheme} ${direction}: passed keyboard, dismissal, bounds, reconnect, axe`);
      await page.close();
    }
    const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:900}});
    await page.goto('http://localhost:8471/examples/breadcrumbs.html');
    await page.locator('summary').click();
    assert(await page.locator('[data-breadcrumb-menu]').isVisible(), 'No-JS disclosure missing');
    assert(await page.locator('[data-breadcrumb-menu]').evaluate(e=>getComputedStyle(e).position==='absolute'), 'Native fallback lost');
    await page.locator('[data-breadcrumb-menu] a').first().click();
    assert(page.url().endsWith('#content'),'No-JS links broken');
    await page.close();
  } finally { await browser.close(); }
}
