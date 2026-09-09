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
      assert(await dialog.evaluate(e => document.activeElement === e), 'Opening focused an action instead of the dialog');
      assert(await dialog.evaluate(e => getComputedStyle(e).outlineStyle === 'none'), 'Initial container focus has a ring');
      await page.keyboard.press('Tab');
      assert(await dialog.evaluate(e => e.contains(document.activeElement) && document.activeElement !== e), 'Tab did not enter sidebar controls');
      assert(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle !== 'none'), 'Keyboard control focus ring missing');
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
      const toggle = page.locator('[data-sidebar-toggle]');
      assert(await toggle.isVisible() === (mode === 'missing-icon'), 'Invalid collapse must keep the toggle discoverable');
      if (mode === 'missing-icon') {
        assert(await toggle.getAttribute('aria-disabled') === 'true', 'Invalid collapse toggle must be unavailable');
        await toggle.click({ force: true });
        assert(!(await page.locator('m-sidebar-layout').getAttribute('data-m-sidebar-rail')), 'Invalid anatomy collapsed');
        await page.setViewportSize({width:390,height:850});
        await page.locator('m-sidebar-layout[data-m-sidebar-mobile]').waitFor();
        assert(await toggle.getAttribute('aria-disabled') === null, 'Mobile navigation must remain enabled');
        await toggle.click();
        assert(await page.locator('dialog').evaluate((el:HTMLDialogElement)=>el.open), 'Invalid desktop anatomy blocked mobile');
      }
      assert(await page.locator('m-sidebar > nav').isVisible(), 'Text-only nav hidden');
      await page.close();
    }
    // Avatars are visual content with their own sizing, with or without a marker.
    for (const marked of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
      const warnings: string[] = [];
      page.on('console', msg => { if(msg.type()==='warning') warnings.push(msg.text()); });
      await page.goto(`${origin}/examples/sidebar.html`);
      await page.locator('m-sidebar-layout[data-m-sidebar-ready]').waitFor();
      await page.locator('footer .avatar').evaluate((el, marked) => {
        const avatar = document.createElement('m-avatar');
        avatar.textContent = 'AN'; avatar.style.setProperty('--avatar-size','32px');
        if(marked) avatar.setAttribute('data-sidebar-icon','');
        el.replaceWith(avatar);
      }, marked);
      await page.waitForFunction(()=>document.querySelector('m-sidebar-layout')!.hasAttribute('data-m-sidebar-can-rail'));
      assert(await page.locator('m-avatar').evaluate(el=>getComputedStyle(el).width)==='32px', 'Sidebar overrides avatar size');
      const toggle = page.locator('[data-sidebar-toggle]');
      await toggle.click();
      assert(await page.locator('m-sidebar-layout').getAttribute('data-m-sidebar-rail') !== null, 'Avatar blocked rail');
      assert(await page.locator('m-avatar').isVisible(), 'Collapsed avatar hidden');
      await page.locator('m-avatar').evaluate(el=>el.remove());
      await page.waitForFunction(()=>document.querySelector('[data-sidebar-toggle]')!.getAttribute('aria-disabled')==='true');
      assert(await page.locator('footer [data-sidebar-label]').isVisible(), 'Invalidation did not expand labels');
      assert(warnings.some(text=>text.includes('Icon collapse unavailable')), 'Missing actionable diagnostic');
      const count=warnings.length;
      await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
      await page.waitForTimeout(50);
      assert(warnings.length===count,'Repeated measurements spam diagnostics');
      await page.locator('footer [data-sidebar-item]').evaluate(el=>el.insertAdjacentHTML('afterbegin','<m-avatar>AN</m-avatar>'));
      await page.waitForFunction(()=>document.querySelector('[data-sidebar-toggle]')!.getAttribute('aria-disabled')===null);
      await toggle.click();
      assert(await page.locator('m-sidebar-layout').getAttribute('data-m-sidebar-rail')!==null,'Repaired anatomy did not recover');
      await page.close();
    }
    // Persistence follows the desktop preference, never the mobile dialog.
    {
      const context = await browser.newContext({ viewport: { width: 1200, height: 850 } });
      const page = await context.newPage();
      const visit = async () => {
        await page.goto(`${origin}/examples/sidebar.html`);
        await page.locator('m-sidebar-layout[data-m-sidebar-ready]').waitFor();
      };
      await visit();
      const layout = page.locator('m-sidebar-layout');
      const toggle = page.locator('[data-sidebar-toggle]');
      const id = await page.locator('m-sidebar').getAttribute('id');
      const name = `mica-sidebar-${encodeURIComponent(id!)}`;
      const saved = async () => (await context.cookies()).find(cookie => cookie.name === name);
      const collapsed = async () => await layout.getAttribute('data-m-sidebar-rail') !== null;
      assert(!(await saved()), 'Initialization should not write cookies');
      await toggle.click();
      const cookie = await saved();
      assert(cookie?.value === 'collapsed' && cookie.path === '/' && cookie.sameSite === 'Lax' && cookie.expires > Date.now()/1000 + 300*86400, 'Collapse preference cookie missing or incorrectly scoped');
      await visit();
      assert(await collapsed(), 'Reload did not restore collapse');
      assert(await page.locator('m-sidebar').evaluate(el => el.getBoundingClientRect().width < 100), 'Restored rail did not render collapsed');
      await layout.evaluate(el => { el.remove(); document.body.prepend(el); });
      await page.locator('m-sidebar-layout[data-m-sidebar-ready]').waitFor();
      assert(await collapsed(), 'Reconnect lost preference');
      await page.setViewportSize({ width: 390, height: 850 });
      await visit();
      const dialog = page.locator('dialog[data-sidebar-dialog]');
      assert(!(await dialog.evaluate((el: HTMLDialogElement) => el.open)), 'Saved collapse opened mobile drawer');
      await toggle.click();
      await page.locator('[data-sidebar-close]').click();
      assert((await saved())?.value === 'collapsed', 'Mobile actions overwrote desktop preference');
      await page.setViewportSize({ width: 1200, height: 850 });
      await page.locator('m-sidebar-layout[data-m-sidebar-rail]').waitFor();
      await toggle.click();
      assert((await saved())?.value === 'expanded', 'Expansion was not saved');
      await visit();
      assert(!await collapsed(), 'Expanded preference was not restored');
      await toggle.click();
      await page.route('**/examples/sidebar.html', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('collapse="icon"', 'collapse="icon" persist="false"') });
      });
      await visit();
      assert(!await collapsed(), 'Opt-out read saved preference');
      await toggle.click(); await toggle.click();
      assert((await saved())?.value === 'collapsed', 'Opt-out overwrote saved cookie');
      await page.unroute('**/examples/sidebar.html');
      await page.route('**/examples/sidebar.html', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace(`id="${id}"`, 'id="independent-panel"').replace(`aria-controls="${id}"`, 'aria-controls="independent-panel"') });
      });
      await visit();
      assert(!await collapsed(), 'Different sidebar ID reused preference');
      await page.unroute('**/examples/sidebar.html');
      await page.route('**/examples/sidebar.html', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('data-sidebar-icon', 'data-example-icon') });
      });
      await visit();
      assert(!await collapsed(), 'Invalid anatomy restored unsafe rail');
      assert((await saved())?.value === 'collapsed', 'Invalid anatomy erased preference');
      await page.unroute('**/examples/sidebar.html');
      await context.addInitScript(() => Object.defineProperty(document, 'cookie', {
        get() { throw new DOMException('Blocked', 'SecurityError'); },
        set() { throw new DOMException('Blocked', 'SecurityError'); },
      }));
      await visit();
      await toggle.click();
      assert(await collapsed(), 'Blocked cookies broke collapse');
      await context.close();
      console.log(`${engine.name()} cookie restore, opt-out, identity, mobile isolation, reconnect, and unavailable storage: PASS`);
    }
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 850 } });
    await page.goto(`${origin}/examples/sidebar.html`);
    assert(await page.locator('m-sidebar > nav').isVisible(), 'No-JS sidebar hidden');
    assert(!(await page.locator('[data-sidebar-toggle]').isVisible()), 'No-JS inert toggle exposed');
    await page.close();
    console.log(`${engine.name()} text-only, invalid icon, no-JS: PASS`);
  } finally { await browser.close(); }
}
