// Run bun run docs:serve first. Screenshots are written to /tmp for review.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import axe from 'axe-core';
for(const [name,engine] of Object.entries({chromium,webkit})){
const browser=await engine.launch();try { const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});let fetches=0;page.on('request',r=>{if(r.url().endsWith('search-index.json'))fetches++;});
await page.goto('http://localhost:8471/index.html');assert.equal(fetches,0);
await page.locator('[data-search-open]').click();await page.locator('#docs-search-results a').first().waitFor();assert.equal(fetches,1);assert.equal(await page.locator('#docs-search-retry').isVisible(),false);
const input=page.locator('#docs-search-input');assert(await input.evaluate(el=>el===document.activeElement));
await input.fill('mobile menu');await page.waitForTimeout(100);assert((await page.locator('#docs-search-results').innerText()).includes('sidebar'));
await input.press('ArrowDown');assert.equal(await input.getAttribute('aria-activedescendant'),'docs-search-option-1');await input.press('ArrowUp');await page.keyboard.press('Escape');await page.waitForTimeout(50);assert(await page.locator('[data-search-open]').evaluate(el=>el===document.activeElement));
await page.keyboard.press('Control+k');assert.equal(fetches,1);await input.fill('flush');await page.waitForTimeout(100);
const href=await page.locator('#docs-search-results a').first().getAttribute('href');await input.press('Enter');await page.waitForURL(href);assert(new URL(page.url()).hash);assert(await page.locator(new URL(page.url()).hash).count());
await page.keyboard.press('Control+k');await input.fill('zzzznonexistent');await page.waitForFunction(()=>document.getElementById('docs-search-status').textContent.includes('No results'));assert((await page.locator('#docs-search-status').innerText()).includes('No results'));await input.fill('round corners');assert((await page.locator('#docs-search-results').innerText()).includes('Tokens'));
for(const scheme of ['light','dark']){await page.emulateMedia({colorScheme:scheme});await page.waitForTimeout(300);await page.screenshot({path:`/tmp/search-${name}-${scheme}.png`});}
await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await page.locator('[data-sidebar-toggle]').click();await page.locator('[data-search-open]').click();await input.fill('loading');await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/search-${name}-mobile.png`});await page.keyboard.press('Escape');await page.waitForTimeout(50);assert(await page.locator('[data-search-open]').evaluate(el=>el===document.activeElement));
// Failed requests can be retried without reloading the docs.
await page.goto('http://localhost:8471/index.html');await page.route('**/search-index.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.keyboard.press('Control+k');await page.locator('#docs-search-retry').waitFor();await page.unroute('**/search-index.json');await page.locator('#docs-search-retry').click();await page.locator('#docs-search-results a').first().waitFor();
await page.addScriptTag({content:axe.source});const violations=await page.evaluate(async()=> (await axe.run(document)).violations.map(v=>v.id));assert.deepEqual(violations,[]);
console.log(name+': lazy load, intent search, keyboard, section navigation, empty/retry, mobile focus, axe pass');} finally { await browser.close(); }}
