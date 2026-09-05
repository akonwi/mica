import { chromium, webkit } from 'playwright';
import axe from 'axe-core';

const origin = 'http://localhost:8471';
const markup = `<!doctype html><html lang="en"><head><title>Header check</title>
<link rel="stylesheet" href="${origin}/mica.css"><script type="module" src="${origin}/header.js"></script></head>
<body><header><m-header align="end"><a data-brand href="#target">mica</a>
<nav id="primary" aria-label="Primary"><a href="#target" aria-current="page">Overview</a><a href="#target">Projects</a><a data-compact href="#target">Get started</a></nav>
<div data-actions><a href="#target" class="btn">Get started</a></div>
<button type="button" data-menu popovertarget="primary">Menu</button></m-header></header>
<main><button id="outside">Outside</button><div style="height:80vh"></div><h1 id="target" tabindex="-1">Destination</h1></main></body></html>`;
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) {
      for (const direction of ['ltr', 'rtl']) {
        const page = await browser.newPage({ viewport: { width: 1100, height: 850 }, colorScheme });
        await page.route('**/header-fixture', route => route.fulfill({ contentType: 'text/html', body: markup.replace('<html lang="en">', `<html lang="en" dir="${direction}">`) }));
        await page.goto(`${origin}/header-fixture`);
        await page.evaluate(() => customElements.whenDefined('m-header'));
        const nav = page.locator('#primary');
        const trigger = page.locator('[data-menu]');
        assert(await nav.isVisible(), 'Wide navigation hidden');
        assert(!(await trigger.isVisible()), 'Wide trigger visible');
        assert(await nav.evaluate(e => getComputedStyle(e).justifyContent === 'end'), 'End alignment lost');
        await page.locator('[data-actions] a').focus();
        await page.setViewportSize({ width: 375, height: 850 });
        await trigger.waitFor({ state: 'visible' });
        assert(await trigger.evaluate(e => document.activeElement === e), 'Resize hid focused action');
        assert(!(await nav.isVisible()), 'Closed compact navigation visible');
        await trigger.press('Enter');
        await page.waitForFunction(() => document.querySelector('#primary')!.matches(':popover-open'));
        await page.waitForFunction(() => !!(document.querySelector('#primary') as HTMLElement).style.getPropertyValue('--m-header-menu-top'));
        assert(await nav.evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }), 'Menu outside viewport');
        await page.addScriptTag({ content: axe.source });
        const violations = await page.evaluate(async () => (await (window as any).axe.run()).violations.map((v: any) => v.id));
        assert(!violations.length, `Accessibility: ${violations}`);
        await page.keyboard.press('Escape');
        assert(!(await nav.isVisible()), 'Escape failed');
        assert(await trigger.evaluate(e => document.activeElement === e), 'Escape focus not restored');
        await trigger.click();
        // Click outside using a location beyond the open panel.
        await page.mouse.click(370, 500);
        assert(!(await nav.isVisible()), 'Outside dismissal failed');
        await trigger.click();
        await nav.locator('a').first().click();
        assert(!(await nav.isVisible()), 'Link did not dismiss');
        await trigger.focus();
        await page.setViewportSize({ width: 1100, height: 850 });
        await trigger.waitFor({ state: 'hidden' });
        assert(await nav.isVisible(), 'Wide restore failed');
        assert(await nav.locator('a').first().evaluate(e => document.activeElement === e), 'Wide resize focus lost');
        await page.evaluate(() => { const e = document.querySelector('m-header')!; e.remove(); document.querySelector('header')!.append(e); });
        await page.setViewportSize({ width: 320, height: 850 });
        await trigger.waitFor({ state: 'visible' });
        await trigger.click();
        assert(await nav.isVisible(), 'Reconnect failed');
        await nav.locator('a').nth(1).focus();
        await page.setViewportSize({ width: 1100, height: 850 });
        await trigger.waitFor({ state: 'hidden' });
        assert(await nav.locator('a').nth(1).evaluate(e => document.activeElement === e), 'Expanding open panel lost link focus');
        await page.setViewportSize({ width: 320, height: 850 });
        await trigger.waitFor({ state: 'visible' });
        await trigger.click();
        await page.evaluate(() => { const e = document.querySelector('m-header')!; e.remove(); document.querySelector('header')!.append(e); });
        await trigger.waitFor({ state: 'visible' });
        await trigger.click();
        assert(await nav.isVisible(), 'Reconnect from open panel failed');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
        // Last CSS rule canary, independently of the snapshot runner.
        assert(await page.evaluate(() => {
          const c = document.createElement('m-cover'); c.style.cssText = 'height:200px;--min-height:0px';
          c.innerHTML = '<h1>Canary</h1><p data-principal>Principal</p>'; document.body.append(c);
          const result = getComputedStyle(c.querySelector('h1')!).marginTop === '0px'; c.remove(); return result;
        }), 'Trailing CSS rule failed');
        await page.close();
        console.log(`${engine.name()} ${colorScheme} ${direction}: PASS`);
      }
    }
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 850 } });
    await page.route('**/header-fixture', route => route.fulfill({ contentType: 'text/html', body: markup }));
    await page.goto(`${origin}/header-fixture`);
    assert(await page.locator('#primary a').first().isVisible(), 'No-JS navigation hidden');
    assert(!(await page.locator('[data-menu]').isVisible()), 'No-JS inert trigger visible');
    await page.close();
    console.log(`${engine.name()} no-JS: PASS`);
  } finally { await browser.close(); }
}
