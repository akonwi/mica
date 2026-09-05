import { chromium, webkit } from 'playwright';
import axe from 'axe-core';

const origin = 'http://localhost:8471';
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) for (const direction of ['ltr', 'rtl']) for (const variant of ['docked', 'inset']) {
      const page = await browser.newPage({ colorScheme, viewport: { width: 1200, height: 850 } });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/examples/sidebar.html?variant=${variant}`);
      await page.locator('m-sidebar-layout[data-m-sidebar-ready]').waitFor();
      await page.evaluate(dir => document.documentElement.dir = dir, direction);
      const layout = page.locator('m-sidebar-layout');
      const trigger = page.locator('[data-sidebar-toggle]');
      const dialog = page.locator('dialog[data-sidebar-dialog]');
      const nav = page.locator('m-sidebar > nav');
      assert(await layout.getAttribute('variant') === variant, 'Variant lost');
      const active = page.locator('m-sidebar [aria-current]').first();
      assert(await active.evaluate(e => getComputedStyle(e).boxShadow === 'none' && getComputedStyle(e).borderTopWidth === '0px'), 'Active item gained chrome');
      await page.addScriptTag({ content: axe.source });
      assert(!(await page.evaluate(async () => (await (window as any).axe.run()).violations)).length, 'Desktop accessibility failure');
      await trigger.click();
      assert(await layout.getAttribute('data-m-sidebar-rail') !== null, 'Rail did not collapse');
      assert(await layout.evaluate(e => e.querySelector('m-sidebar')!.getBoundingClientRect().width < 100), 'Rail width did not shrink');
      assert(!(await nav.locator('[data-sidebar-subnav]').isVisible()), 'Rail nested links remain exposed');
      assert(!(await page.locator('m-sidebar > header [data-sidebar-label]').isVisible()), 'Rail identity label remains visible');
      await nav.locator('summary').click();
      assert(await layout.getAttribute('data-m-sidebar-rail') === null, 'Rail summary did not expand');
      assert(await nav.locator('details').getAttribute('open') !== null, 'Summary did not open group');
      await nav.locator('a[href="#all-projects"]').focus();
      await page.setViewportSize({ width: 390, height: 850 });
      await page.locator('m-sidebar-layout[data-m-sidebar-mobile]').waitFor();
      assert(await trigger.evaluate(e => document.activeElement === e), 'Resize hid focused navigation');
      await trigger.click();
      assert(await dialog.evaluate((e: HTMLDialogElement) => e.open), 'Mobile panel did not open');
      assert(await dialog.evaluate(e => { const r = e.getBoundingClientRect(); return r.top === 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }), 'Mobile bounds overflow');
      assert(await dialog.locator('m-sidebar').evaluate(e => getComputedStyle(e).paddingTop === '8px'), 'Dialog introduced inset padding');
      assert(!(await page.evaluate(async () => (await (window as any).axe.run()).violations)).length, 'Mobile accessibility failure');
      // Native modal traversal excludes background controls. Chromium may
      // temporarily report body when focus passes through browser chrome.
      for (let i = 0; i < 16; i++) { await page.keyboard.press('Tab'); assert(await dialog.evaluate(e => (document.activeElement === document.body || e.contains(document.activeElement))), 'Focus escaped modal'); }
      await page.locator('.workspace-button').click();
      await page.locator('[data-workspace="Personal"]').click();
      assert(await page.locator('#workspace-name').textContent() === 'Personal', 'Modal popover became inert');
      await page.keyboard.press('Escape');
      assert(!(await dialog.evaluate((e: HTMLDialogElement) => e.open)), 'Escape did not close');
      await page.waitForFunction(() => document.activeElement === document.querySelector('[data-sidebar-toggle]'));
      assert(await trigger.evaluate(e => document.activeElement === e), 'Escape focus did not return');
      await trigger.click();
      await page.locator('[data-sidebar-close]').click();
      assert(!(await dialog.evaluate((e: HTMLDialogElement) => e.open)), 'Close button failed');
      await trigger.click();
      await page.mouse.click(direction === 'ltr' ? 389 : 1, 400);
      assert(!(await dialog.evaluate((e: HTMLDialogElement) => e.open)), 'Outside dismissal failed');
      await trigger.click();
      await page.locator('a[href="#all-projects"]').click();
      assert(!(await dialog.evaluate((e: HTMLDialogElement) => e.open)), 'Application close() failed');
      await trigger.click();
      await page.locator('a[href="#website"]').focus();
      await page.setViewportSize({ width: 1200, height: 850 });
      await page.waitForFunction(() => !document.querySelector('m-sidebar-layout')!.hasAttribute('data-m-sidebar-mobile'));
      assert(!(await dialog.evaluate((e: HTMLDialogElement) => e.open)), 'Wide resize left modal open');
      assert(await page.locator('a[href="#website"]').evaluate(e => document.activeElement === e), 'Wide resize lost link focus');
      await page.setViewportSize({ width: 320, height: 850 });
      await page.locator('m-sidebar-layout[data-m-sidebar-mobile]').waitFor();
      await trigger.click();
      await layout.evaluate(e => { e.remove(); document.body.prepend(e); });
      await page.locator('m-sidebar-layout[data-m-sidebar-ready]').waitFor();
      await trigger.click();
      assert(await dialog.evaluate((e: HTMLDialogElement) => e.open), 'Reconnect failed');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Narrow page overflow');
      assert(await page.evaluate(() => {
        const c = document.createElement('m-cover'); c.style.cssText = 'height:200px;--min-height:0px'; c.innerHTML = '<h1>Canary</h1><p data-principal>Principal</p>'; document.body.append(c);
        const ok = getComputedStyle(c.querySelector('h1')!).marginTop === '0px'; c.remove(); return ok;
      }), 'Trailing-rule canary failed');
      assert(!errors.length, `Page errors: ${errors}`);
      await page.close();
      console.log(`${engine.name()} ${colorScheme} ${direction} ${variant}: PASS`);
    }
    // Absence of the opt-in attribute and invalid icon anatomy both keep a
    // fully labeled desktop panel; mobile enhancement remains available.
    for (const mode of ['text', 'missing-icon']) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
      await page.route('**/examples/sidebar.html', async route => {
        const response = await route.fetch();
        let body = await response.text();
        body = mode === 'text' ? body.replace('collapse="icon"', '') : body.replace('data-sidebar-icon', 'data-example-icon');
        await route.fulfill({ response, body });
      });
      await page.goto(`${origin}/examples/sidebar.html`);
      await page.locator('m-sidebar-layout[data-m-sidebar-ready]').waitFor();
      assert(!(await page.locator('[data-sidebar-toggle]').isVisible()), 'Invalid/unrequested rail exposed');
      assert(await page.locator('m-sidebar > nav').isVisible(), 'Text-only nav hidden');
      await page.close();
    }
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 850 } });
    await page.goto(`${origin}/examples/sidebar.html`);
    assert(await page.locator('m-sidebar > nav').isVisible(), 'No-JS sidebar hidden');
    assert(!(await page.locator('[data-sidebar-toggle]').isVisible()), 'No-JS inert toggle exposed');
    await page.close();
    console.log(`${engine.name()} text-only, invalid icon, no-JS: PASS`);
  } finally { await browser.close(); }
}
