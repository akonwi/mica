import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

// Synthetic viewport events exercise lifecycle and positioning deterministically.
// They complement, not replace, the software-keyboard test on shipped iOS.
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 695 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:8471/demo.html');
    await page.evaluate(async () => {
      const viewport = Object.assign(new EventTarget(), { height: 695, offsetTop: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
      document.body.innerHTML = `<dialog data-drawer id="test-drawer" style="bottom:12px!important;max-height:420px!important"><header><h2 tabindex="-1" autofocus>Details</h2></header><div id="scroll-body" style="height:800px"><input id="first" aria-label="First field"><div style="height:600px"></div><input id="last" aria-label="Last field"></div><footer><button>Save</button></footer></dialog>`;
      await import('../drawer.js');
      (document.querySelector('dialog') as HTMLDialogElement).showModal();
    });
    const tick = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const changeViewport = async (height: number, offsetTop = 0, scale = 1) => {
      await page.evaluate(({ height, offsetTop, scale }) => {
        Object.assign(visualViewport!, { height, offsetTop, scale });
        visualViewport!.dispatchEvent(new Event('resize'));
      }, { height, offsetTop, scale });
      await tick();
    };
    const style = () => page.locator('#test-drawer').evaluate(el => [
      (el as HTMLElement).style.bottom, (el as HTMLElement).style.maxHeight,
      (el as HTMLElement).style.getPropertyPriority('bottom'),
    ]);
    await tick();
    const original = await style();
    assert.equal(await page.locator('#last').evaluate(el => getComputedStyle(el).fontSize), '16px');
    await changeViewport(376);
    assert.deepEqual(await style(), original, 'do not move a sheet without editable focus');
    await page.locator('#last').focus();
    await tick();
    assert.deepEqual((await style()).slice(0, 2), ['319px', '376px']);
    const visible = await page.evaluate(() => {
      const field = document.querySelector('#last')!.getBoundingClientRect();
      const body = document.querySelector('#scroll-body')!.getBoundingClientRect();
      const footer = document.querySelector('footer')!.getBoundingClientRect();
      return field.top >= body.top && field.bottom <= body.bottom + 1 && footer.bottom <= 376 + 1;
    });
    assert.ok(visible, 'field and footer fit');
    await page.locator('#first').focus();
    await tick();
    assert.ok(await page.locator('#first').evaluate(el => {
      const r = el.getBoundingClientRect();
      const b = el.parentElement!.getBoundingClientRect();
      return r.top >= b.top && r.bottom <= b.bottom;
    }), 'switching to an earlier field scrolls it into view');
    await page.locator('#last').focus();
    await tick();
    await changeViewport(376, 100);
    assert.equal((await style())[0], '219px', 'follow viewport panning');
    await changeViewport(300, 0, 1.5);
    assert.deepEqual(await style(), original, 'pinch zoom restores authored styles');
    await changeViewport(376);
    await page.locator('#test-drawer').evaluate(el => el.setAttribute('data-avoid-keyboard', 'false'));
    await tick();
    assert.deepEqual(await style(), original, 'live opt out');
    await page.locator('#test-drawer').evaluate(el => el.removeAttribute('data-avoid-keyboard'));
    await tick();
    assert.equal((await style())[1], '376px');
    await changeViewport(695);
    assert.deepEqual(await style(), original, 'keyboard dismissal');
    await changeViewport(376);
    await page.setViewportSize({ width: 900, height: 695 });
    await tick();
    assert.deepEqual(await style(), original, 'desktop breakpoint');
    await page.setViewportSize({ width: 393, height: 695 });
    await tick();
    await page.locator('#test-drawer').evaluate(el => (el as HTMLDialogElement).close());
    await tick();
    assert.deepEqual(await style(), original, 'close restores style values and priority');
    await page.locator('#test-drawer').evaluate(el => (el as HTMLDialogElement).showModal());
    await page.locator('#last').focus();
    await tick();
    assert.equal((await style())[1], '376px', 'reopen');
    const detached = await page.evaluate(async () => {
      const dialog = document.querySelector('#test-drawer') as HTMLDialogElement;
      dialog.remove();
      await new Promise(resolve => requestAnimationFrame(resolve));
      return [dialog.style.bottom, dialog.style.maxHeight, dialog.style.getPropertyPriority('bottom')];
    });
    assert.deepEqual(detached, original, 'removal cleanup');
    console.log(`${name}: sizing, focus, pan, zoom, opt-out, dismissal, breakpoint, close/reopen and removal passed`);
  } finally { await browser.close(); }
}
