import { chromium, webkit } from 'playwright';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
for (const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch();
 try {
  const page=await browser.newPage({viewport:{width:1100,height:950},reducedMotion:'reduce'});
  await page.goto('http://localhost:8471/examples/menu.html');
  const menu=page.locator('#file-menu'),child=page.locator('#people-menu');
  const isOpen=async (locator:any)=>locator.evaluate((e:HTMLElement)=>e.matches(':popover-open'));
  await page.locator('#more').click(); assert(await isOpen(menu));
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'file-menu','pointer opens without selecting an item');
  await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Move to trash');
  await page.keyboard.press('Escape');await page.locator('#more').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Open file','keyboard opens at first item');
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Move to trash');
  await page.keyboard.press('Home');await page.keyboard.press('d');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Duplicate');
  await page.locator('[data-action=download]').focus();await page.keyboard.press('Enter');assert(await isOpen(menu),'disabled action stays open');
  await page.locator('#reassign').focus();await page.keyboard.press('ArrowRight');assert(await isOpen(child));
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement?.id),'reassign');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement?.id),'more');
  await page.locator('.file').click({button:'right'});await page.waitForTimeout(80);assert(await isOpen(menu),'pointer context');
  await page.keyboard.press('Escape');await page.locator('.file').focus();await page.keyboard.press('Shift+F10');assert(await isOpen(menu),'keyboard context');
  await page.keyboard.press('Escape');await page.locator('#more').click();await page.locator('[data-action=rename]').click();
  assert(await page.locator('#rename-dialog').evaluate((e:HTMLDialogElement)=>e.open),'action opens dialog');
  assert(await page.locator('#rename-input').evaluate(e=>e===document.activeElement),'dialog gets focus');
  await page.locator('#rename-dialog [value=cancel]').click();
  await page.locator('#more').click();await page.keyboard.press('Tab');assert(!await isOpen(menu),'Tab dismisses');
  await page.locator('#more').click();await page.mouse.click(10,10);assert(!await isOpen(menu),'outside dismissal');
  const cleanup=await page.evaluate(()=>{
    const menu=document.getElementById('file-menu')!,host=menu.parentElement!;
    const item=document.createElement('button');item.textContent='Dynamic action';menu.append(item);
    (menu as any).refresh();const enhanced=item.getAttribute('role')==='menuitem';menu.remove();
    const restored=item.getAttribute('role')===null&&menu.querySelector('[data-action=download]')!.hasAttribute('disabled');
    host.append(menu);return {enhanced,restored};
  });assert.deepEqual(cleanup,{enhanced:true,restored:true});
  await page.reload();
  for(const colorScheme of ['light','dark'] as const){
    await page.emulateMedia({colorScheme});await page.locator('#more').click();await page.waitForTimeout(150);
    await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
    const violations=await page.evaluate(async()=> (await (window as any).axe.run()).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));
    assert.deepEqual(violations,[]);
    await page.locator('#reassign').focus();await page.keyboard.press('ArrowRight');
    await page.screenshot({path:`/tmp/menu-integrated-${name}-${colorScheme}.png`});
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#more').click();await page.locator('#reassign').click();await page.waitForTimeout(150);
  assert(await page.locator('[data-menu-back]').isVisible());assert(!await page.locator('[data-action=remove]').isVisible());
  await page.screenshot({path:`/tmp/menu-integrated-${name}-mobile.png`});
  await page.locator('[data-menu-back]').click();assert(await isOpen(menu));assert(!await isOpen(child));
  await page.waitForFunction(()=>document.activeElement?.id==='reassign');
  await page.keyboard.press('Escape');assert(!await isOpen(menu),'Escape after mobile Back closes root');
  await page.setViewportSize({width:1100,height:950});await page.locator('html').evaluate(e=>e.dir='rtl');await page.waitForTimeout(150);
  await page.locator('#more').click();await page.mouse.move(5,5);await page.locator('#reassign').focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(50);assert(await isOpen(child),'RTL open');
  await page.keyboard.press('ArrowRight');assert(!await isOpen(child),'RTL back');
  const native=await browser.newPage({javaScriptEnabled:false});await native.goto('http://localhost:8471/examples/menu.html');await native.locator('#more').click();assert(await isOpen(native.locator('#file-menu')),'native fallback');
  console.log(`${name}: keyboard, context, disabled, nested/RTL/mobile, dismissal, dynamic/reconnect, dialog focus, no-JS and axe pass`);
 } finally {await browser.close();}
}
