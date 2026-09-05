import { chromium, webkit } from 'playwright';
import axe from 'axe-core';
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) for (const direction of ['ltr', 'rtl']) {
      const page = await browser.newPage({ colorScheme, viewport: { width: 320, height: 640 } });
      await page.goto('http://localhost:8471/examples/bottom-navigation.html');
      await page.evaluate(dir => document.documentElement.dir = dir, direction);
      const nav = page.locator('nav[data-bottom-nav]');
      for (const text of [false, true]) {
        await page.evaluate(({ text, colorScheme }) => window.postMessage({ type: 'bottom-preview', text, scheme: colorScheme }, location.origin), { text, colorScheme });
        await page.waitForTimeout(50);
        const geometry = await nav.evaluate(e => {
          const r = e.getBoundingClientRect(), m = document.querySelector('main')!.getBoundingClientRect();
          const links = [...e.querySelectorAll(':scope > a')].map(a => a.getBoundingClientRect());
          return { bottom: r.bottom, contentBottom: m.bottom, top: r.top, widths: links.map(r => r.width), heights: links.map(r => r.height), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert(geometry.bottom === 640 && geometry.contentBottom <= geometry.top, 'Bar overlaps content or leaves a bottom gap');
        assert(!geometry.overflow && Math.max(...geometry.widths) - Math.min(...geometry.widths) < 1, 'Unequal links or page overflow');
        assert(Math.min(...geometry.heights) >= 44, 'Targets too short');
        assert(await nav.locator('[data-bottom-icon]').count() === (text ? 0 : 4), 'Icon-free anatomy failed');
        await page.addScriptTag({ content: axe.source });
        const violations = await page.evaluate(async () => (await (window as any).axe.run()).violations.map((v: any) => v.id));
        assert(!violations.length, `Accessibility: ${violations}`);
        await nav.locator('[data-destination=inbox]').click();
        assert(await page.locator('h1').innerText() === 'Inbox', 'Destination did not update');
        assert(await nav.locator('[aria-current=page]').count() === 1, 'Current destination not unique');
        const active = nav.locator('[aria-current=page]');
        assert(await active.evaluate(e => getComputedStyle(e).borderTopWidth === '0px' && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'Quiet fill lost');
        await active.focus();
        assert(await active.evaluate(e => document.activeElement === e), 'Link not focusable');
        await page.locator('main').evaluate(e => e.scrollTop = e.scrollHeight);
        assert(await page.locator('.note').evaluate(e => { const r = e.getBoundingClientRect(), m = e.closest('main')!.getBoundingClientRect(); return r.bottom <= m.bottom; }), 'Last content obscured');
        if (direction === 'ltr') await page.screenshot({ path: `/tmp/bottom-integrated-${engine.name()}-${colorScheme}-${text ? 'text' : 'icons'}.png` });
      }
      await page.evaluate(() => window.postMessage({ type:'bottom-preview', disabled:true }, location.origin));
      await page.waitForTimeout(50);
      assert(await nav.locator('[data-destination=settings]').getAttribute('href') === null, 'Disabled example retains href');
      await nav.evaluate(e => { (e as HTMLElement).style.setProperty('--bottom-nav-target-height', '4rem'); });
      assert(await nav.locator('a').first().evaluate(e => getComputedStyle(e).minHeight === '64px'), 'Token override failed');
      await page.evaluate(() => { const e = document.createElement('m-error'); document.body.append(e); if (getComputedStyle(e).display !== 'none') throw Error('CSS parse canary failed'); e.remove(); });
      console.log(`${engine.name()} ${colorScheme} ${direction}: passed icons, text, active, disabled, scrolling, tokens, axe`);
      await page.close();
    }
    const page = await browser.newPage({ javaScriptEnabled:false, viewport:{width:390,height:640} });
    await page.goto('http://localhost:8471/examples/bottom-navigation.html');
    await page.locator('nav a').first().click();
    assert(page.url().endsWith('#content'), 'Native link failed without JS');
    await page.close();
  } finally { await browser.close(); }
}
