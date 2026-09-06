import { chromium, webkit } from 'playwright';
import axe from 'axe-core';
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const colorScheme of ['light', 'dark'] as const) {
      const page = await browser.newPage({ colorScheme, viewport: { width: 1280, height: 1044 } });
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:8471/examples/data-table.html');
      await page.waitForFunction(() => document.querySelectorAll('[data-select]').length === 10);
      assert(await page.evaluate(() => { const e = document.createElement('m-error'); document.body.append(e); const value = getComputedStyle(e).display; e.remove(); return value === 'none'; }), 'CSS parse canary failed');
      await page.addScriptTag({ content: axe.source });
      const checkAxe = async () => {
        await page.waitForTimeout(300);
        const violations = await page.evaluate(async () => (await (window as any).axe.run()).violations.map((v: any) => ({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));
        assert(!violations.length, `axe: ${JSON.stringify(violations)}`);
      };
      await checkAxe();
      await page.locator('[data-page="2"]').first().click();
      assert(await page.locator('#range').innerText() === '11–20 of 54', 'Page range');
      await page.locator('#search').fill('website');
      assert(await page.locator('#range').innerText() === '1–3 of 3', 'Search/page reset');
      await page.locator('#reset').click();
      await page.locator('[data-sort="owner"]').click();
      assert(await page.locator('th[aria-sort]').getAttribute('data-column') === 'owner', 'Sort header');
      await page.locator('#columns-trigger').click();
      await page.locator('[data-column-toggle="owner"]').uncheck();
      assert(await page.locator('th[data-column="owner"]').isHidden(), 'Column visibility');
      assert(await page.locator('th[aria-sort]').getAttribute('class') === 'project', 'Hidden sorted column resets sort');
      await page.keyboard.press('Escape');
      for (const width of [1280, 751, 390, 320]) {
        await page.setViewportSize({ width, height: 1044 });
        await page.waitForTimeout(100);
        const top = () => page.locator('m-table-scroll').evaluate(e => e.getBoundingClientRect().top + scrollY);
        const start = await top();
        await page.locator('[data-select]').first().check();
        assert(await top() === start, `Selection shifted at ${width}`);
        assert(await page.locator('#select-page').evaluate((e: HTMLInputElement) => e.indeterminate), 'Page checkbox mixed state');
        assert(await page.locator('[data-table-filters]').evaluate((e: HTMLElement) => e.inert), 'Filters not inert');
        const tree = await page.locator('main').ariaSnapshot();
        assert(!tree.includes('Search projects') && tree.includes('Selected project actions'), 'Selection accessibility tree');
        await page.locator('#select-page').check();
        assert(await top() === start, 'Select all shifted');
        await page.waitForTimeout(300);
        const contained = await page.locator('#bulk').evaluate(e => {
          const r = e.getBoundingClientRect();
          return [...e.children].every(c => { const b = c.getBoundingClientRect(); return b.top >= r.top && b.bottom <= r.bottom && b.right <= r.right; });
        });
        assert(contained, 'Bulk controls overflow');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflow');
        await page.screenshot({ path: `/tmp/table-integrated-${engine.name()}-${colorScheme}-${width}.png`, fullPage: true });
        await checkAxe();
        await page.locator('#clear-selection').click();
        assert(await top() === start && await page.locator('#search').isVisible(), 'Clear selection failed');
        assert(await page.locator('#select-page').evaluate(e => e === document.activeElement), 'Clear focus restoration');
      }
      // Edge indicators track native scrolling in both writing directions.
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(dir => document.documentElement.dir = dir, dir);
        await page.locator('[data-table-region]').evaluate(e => e.scrollLeft = 0);
        await page.waitForTimeout(100);
        const overflowSide = dir === 'ltr' ? 'right' : 'left';
        assert(await page.locator(`m-table-scroll[data-m-overflow-${overflowSide}]`).count(), 'Initial edge');
        await page.locator('[data-table-region]').evaluate((e, dir) => e.scrollLeft = dir === 'ltr' ? 80 : -80, dir);
        await page.waitForTimeout(100);
        assert(await page.locator('m-table-scroll[data-m-overflow-left][data-m-overflow-right]').count(), 'Middle edges');
        const frozen = await page.locator('th.project').boundingBox();
        assert(frozen!.width <= 177, 'Pinned column expands after hiding a column');
        await page.locator('[data-table-region]').evaluate((e, dir) => e.scrollLeft = dir === 'ltr' ? 150 : -150, dir);
        const moved = await page.locator('th.project').boundingBox();
        assert(Math.abs(frozen!.x - moved!.x) < 1, 'Frozen column moved');
      }
      await page.evaluate(() => document.documentElement.dir = 'ltr');
      await page.locator('[data-table-region]').evaluate(e => e.scrollLeft = 0);
      await page.locator('#select-page').check();
      await page.locator('#archive-selected').click();
      assert(await page.locator('#notice').innerText() === '10 projects archived.', 'Bulk action');
      await page.locator('[data-view]').first().click();
      assert(await page.locator('dialog').isVisible(), 'Row details');
      await page.locator('dialog button').click();
      await page.locator('#search').fill('zzznomatch');
      assert(await page.locator('.table-empty strong').innerText() === 'No matching projects', 'No matches');
      await page.waitForTimeout(100);
      assert(await page.locator('m-table-scroll[data-m-overflow-left],m-table-scroll[data-m-overflow-right]').count() === 0, 'Empty edge indicators');
      for (const state of ['loading', 'error', 'empty']) {
        await page.locator('#scenario').selectOption(state);
        await checkAxe();
      }
      await page.locator('#scenario').selectOption('error');
      await page.locator('[data-empty-action="retry"]').click();
      assert(await page.locator('#scenario').inputValue() === 'ready', 'Retry');
      await page.locator('#reset').click();
      await page.evaluate(() => { const e = document.querySelector('m-table-scroll')!; const parent = e.parentElement!; const next = e.nextSibling; e.remove(); parent.insertBefore(e, next); });
      await page.waitForTimeout(100);
      assert(await page.locator('m-table-scroll[data-m-overflow-right]').count(), 'Reconnect');
      await page.goto('http://localhost:8471/docs/pagination.html');
      await page.locator('[data-page-status]').evaluate(e => e.remove());
      assert(await page.locator('[data-pagination]').evaluate(e => e.scrollWidth <= e.clientWidth), 'Full pagination does not wrap');
      assert(await page.locator('[data-page-number]').first().isVisible(), 'Numbers hidden without compact status');
      assert(!errors.length, `Page errors: ${errors}`);
      await page.close();
      const plain = await browser.newPage({ javaScriptEnabled: false, colorScheme, viewport: { width: 390, height: 1044 } });
      await plain.goto('http://localhost:8471/examples/data-table.html');
      assert(await plain.locator('tbody tr').count() === 3, 'Static rows missing without JS');
      assert(await plain.locator('[data-table-region]').evaluate(e => e.scrollWidth > e.clientWidth), 'Native overflow missing');
      await plain.close();
      console.log(`${engine.name()} ${colorScheme}: collection, stable selection, RTL overflow, a11y, reconnect, and no-JS checks passed`);
    }
  } finally { await browser.close(); }
}
