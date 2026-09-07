import { chromium, webkit } from 'playwright';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
for(const [name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();try{
 const page=await browser.newPage({viewport:{width:1100,height:950},hasTouch:true});
 await page.goto('http://localhost:8471/examples/location-search.html');
 await page.evaluate(()=>{(window as any).selections=[];document.querySelector('m-combobox')!.addEventListener('m-on-change',(e:any)=>(window as any).selections.push(e.detail));});
 const input=page.locator('#city'),options=page.locator('[role=option]'),popup=page.locator('[data-combobox-popup]');
 await input.fill('Paris');await page.waitForTimeout(750);assert.equal(await options.count(),2);assert.deepEqual(await page.evaluate(()=>(window as any).selections),[]);
 await options.nth(1).tap();assert.equal(await input.inputValue(),'Paris');assert.deepEqual(await page.evaluate(()=>(window as any).selections),[{key:'paris-tx',value:'Paris'}]);assert(!await popup.isVisible());
 await input.fill('NYC');await page.waitForTimeout(750);assert.equal(await options.first().innerText(),'New York\nNew York, United States');assert(await options.first().isVisible());
 await page.keyboard.press('Escape');await page.locator('#locations').evaluate(e=>e.append(new Option('Late result')));await page.waitForTimeout(50);assert(!await popup.isVisible(),'late results respect Escape');
 await input.fill('error');await page.waitForTimeout(750);assert(await popup.isVisible());assert((await page.locator('#status').innerText()).includes('Could not'));assert.equal(await options.count(),0);
 for(const colorScheme of ['light','dark'] as const){await page.emulateMedia({colorScheme});await input.fill('Paris');await page.waitForTimeout(750);
 const geometry=await page.evaluate(()=>{const a=document.querySelector('#city')!.getBoundingClientRect(),b=document.querySelector('[data-combobox-popup]')!.getBoundingClientRect();return {gap:b.top-a.bottom,width:b.width-a.width};});assert.deepEqual(geometry,{gap:8,width:0});
 await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const violations=await page.evaluate(async()=>(await (window as any).axe.run()).violations.map((v:any)=>v.id));assert.deepEqual(violations,[]);
 await page.screenshot({path:`/tmp/combobox-${name}-${colorScheme}.png`});}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`/tmp/combobox-${name}-mobile.png`});
 await page.evaluate(()=>{const box=document.querySelector('m-combobox')!,parent=box.parentElement!;box.remove();if(document.querySelector('[data-combobox-popup]'))throw Error('left popup');if(box.querySelector('input')!.getAttribute('list')!=='locations')throw Error('lost native list');if(box.querySelector(':scope > [role=status]')===null)throw Error('lost status');parent.append(box);});
 await input.fill('Paris');await page.waitForTimeout(750);await options.first().tap();assert.equal((await page.evaluate(()=>(window as any).selections)).length,2,'no duplicate listeners after reconnect');
 await page.goto('http://localhost:8471/docs/combobox.html');const staticInput=page.locator('m-combobox input').first();await staticInput.fill('Ru');assert.equal(await page.locator('[role=option]:visible').count(),1);assert.equal(await page.locator('[role=option]:visible').innerText(),'Rust');await page.keyboard.press('Enter');assert.equal(await staticInput.inputValue(),'Rust');
 const native=await browser.newPage({javaScriptEnabled:false});await native.goto('http://localhost:8471/docs/combobox.html');assert.equal(await native.locator('m-combobox input').first().getAttribute('list'),'dcb-langs');
 console.log(name+': keyed touch selection, manual/static filtering, feedback, Escape/late updates, reconnect, geometry, axe and no-JS pass');
 }finally{await browser.close();}
}
