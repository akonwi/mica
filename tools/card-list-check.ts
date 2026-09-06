import { chromium, webkit } from 'playwright';
import axe from 'axe-core';
const assert = (v: unknown, message: string) => { if (!v) throw new Error(message); };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) {
      const page = await browser.newPage({ colorScheme, viewport: { width: 1280, height: 1044 } });
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      for (const example of ['cards', 'lists']) {
        await page.goto(`http://localhost:8471/examples/${example}.html`);
        await page.addScriptTag({ content: axe.source });
        for (const width of [1280, 390, 320]) {
          await page.setViewportSize({ width, height: 1044 });
          const violations = await page.evaluate(async () => (await (window as any).axe.run()).violations.map((v: any) => v.id));
          assert(!violations.length, `axe: ${example} ${width}: ${violations}`);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${example} page overflow`);
        }
        if (example === 'cards') {
          await page.locator('#add-note').click();
          await page.locator('#note-body').fill('Local note');
          await page.locator('#edit-form button').last().click();
          assert(await page.locator('#notes li').count() === 4, 'Card example add');
          await page.locator('#border').uncheck();
          await page.locator('#dividers').uncheck();
        } else {
          await page.locator('[data-edit]').first().click();
          await page.locator('#note-text').fill('Updated note');
          await page.locator('.editor button').last().click();
          await page.locator('[data-delete]').first().click();
          await page.locator('#confirm-delete').click();
          assert(await page.locator('#notes li').count() === 2, 'List deletion');
        }
      }
      assert(!errors.length, errors.join('\n'));
      await page.close();
      const plain = await browser.newPage({ javaScriptEnabled: false, colorScheme, viewport: { width: 390, height: 1000 } });
      await plain.goto('http://localhost:8471/demo.html');
      for (const direction of ['ltr', 'rtl']) {
        const result = await plain.evaluate(dir => {
          document.documentElement.dir = dir;
          const root = document.querySelector('#card-list-demo')!;
          const card = root.querySelector('m-card')!;
          const header = root.querySelector('m-card-header')!;
          const flush = root.querySelector('m-card-body[flush]')!;
          const list = root.querySelector('ol')!;
          const row = list.children[1] as HTMLElement;
          const start = row.getBoundingClientRect().height;
          const before = getComputedStyle(row).borderBlockStartColor;
          list.setAttribute('data-dividers', 'none');
          const none = getComputedStyle(row).borderBlockStartColor;
          const stable = row.getBoundingClientRect().height === start;
          list.removeAttribute('data-dividers');
          const inset = getComputedStyle(list).paddingInlineStart;
          const pad = getComputedStyle(header).paddingInlineStart;
          const unpadded = getComputedStyle(flush).paddingInlineStart;
          const sectionBorder = getComputedStyle(flush).borderBlockStartWidth;
          flush.removeAttribute('divider');
          const removed = getComputedStyle(flush).borderBlockStartWidth;
          flush.setAttribute('divider', '');
          const bodyPad = getComputedStyle(root.querySelector('m-card-body:not([flush])')!).paddingInlineStart;
          (card as HTMLElement).style.setProperty('--card-pad', '12px');
          const themed = getComputedStyle(list).paddingInlineStart;
          (card as HTMLElement).style.removeProperty('--card-pad');
          const customDefined = customElements.get('m-card');
          const canary = document.createElement('m-error'); document.body.append(canary);
          const parsed = getComputedStyle(canary).display; canary.remove();
          return { before, none, stable, inset, pad, unpadded, sectionBorder, removed, bodyPad, themed, customDefined: !!customDefined, parsed };
        }, direction);
        assert(result.none === 'rgba(0, 0, 0, 0)' && result.before !== result.none && result.stable, 'Divider opt-out paint/geometry');
        assert(result.inset === result.pad && result.unpadded === '0px', 'Flush/list inset composition');
        assert(result.sectionBorder === '1px' && result.removed === '0px', 'Section divider attribute');
        assert(result.bodyPad === result.pad && result.themed === '12px', 'Padding theme');
        assert(!result.customDefined && result.parsed === 'none', 'CSS-only contract / parse canary');
      }
      console.log(await plain.locator('#card-list-demo').ariaSnapshot());
      await plain.close();
      console.log(`${engine.name()} ${colorScheme}: layout, axe, example actions, no-JS, RTL, dividers, inset composition, and theme checks pass`);
    }
  } finally { await browser.close(); }
}
