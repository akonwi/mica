import { chromium, webkit } from 'playwright';
import { resolve } from 'node:path';
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
for (const [name, engine] of Object.entries({chromium, webkit})) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({viewport:{width:1100,height:900}, reducedMotion:'reduce'});
    await page.goto('http://localhost:8471/examples/command.html');
    const input = page.locator('#inline-command input');
    await input.fill('add new');
    assert(await page.locator('#inline-command [data-command-item]:visible').count() === 1, 'keyword filtering');
    await input.press('Enter');
    assert(await page.locator('#create').evaluate((e: HTMLDialogElement) => e.open), 'native action activation');
    await page.locator('#create button[value=cancel]').click();
    await input.fill('no such command');
    assert(await page.locator('#inline-command [data-command-empty]').isVisible(), 'empty state');
    await input.fill('');
    for (let i=0;i<7;i++) {
      await input.press('ArrowDown');
      assert(await input.evaluate(e => !document.getElementById(e.getAttribute('aria-activedescendant')!)?.matches(':disabled')), 'skip disabled');
    }
    await page.locator('#open').click();
    await page.locator('#palette input').press('Escape');
    await page.waitForTimeout(50);
    assert(await page.locator('#open').evaluate(e=>e===document.activeElement), 'restore focus');
    // Dynamic application results and reconnect cleanup.
    await page.evaluate(() => {
      const root = document.querySelector('m-command-palette')!;
      root.setAttribute('filter','manual');
      root.querySelector('m-command-list')!.innerHTML='<button data-command-item>Remote result</button><a data-command-item aria-disabled="true" href="#bad">Unavailable</a>';
    });
    await input.fill('unrelated');
    assert(await page.locator('#inline-command [data-command-item]:visible').count()===2, 'manual results stay visible');
    assert(await input.evaluate(e=>document.getElementById(e.getAttribute('aria-activedescendant')!)?.textContent==='Remote result'), 'dynamic active result');
    const restored = await page.evaluate(() => {
      const root=document.querySelector('m-command-palette')!;const parent=root.parentElement!;root.remove();
      const native=root.querySelector('button')!.getAttribute('role')===null;
      parent.append(root);return native;
    });
    assert(restored,'disconnect restores native roles');
    await page.reload();
    for(const colorScheme of ['light','dark'] as const) {
      await page.emulateMedia({colorScheme});
      await page.waitForTimeout(300);
      await page.screenshot({path:`/tmp/command-integrated-${name}-${colorScheme}.png`});
      await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=> (await (window as any).axe.run()).violations);
      assert(!violations.length, JSON.stringify(violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))));
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#open').click();
    await page.waitForTimeout(100);
    assert(await page.locator('#palette m-command-palette').evaluate(e=>getComputedStyle(e).padding==='0px'),'dialog composition');
    await page.screenshot({path:`/tmp/command-integrated-${name}-mobile.png`});
    console.log(`${name}: filtering, actions, disabled skipping, empty, manual results, reconnect, dialog, both themes and axe pass`);
  } finally { await browser.close(); }
}
