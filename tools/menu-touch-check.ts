import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
for (const [name, engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch();
 try {
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 await page.goto('http://localhost:8471/examples/menu.html');
 const open=()=>page.locator('#file-menu').evaluate(e=>e.matches(':popover-open'));
 const touch=async(type:string,x=90,count=1,selector='.file')=>page.evaluate(({type,x,count,selector})=>{
  const target=document.querySelector(selector)!;
  const touches=Array.from({length:count},(_,identifier)=>({identifier,target,clientX:x+identifier*20,clientY:300}));
  const event=new Event(type,{bubbles:true,cancelable:true});
  Object.defineProperties(event,{touches:{value:type==='touchend'||type==='touchcancel'?[]:touches},changedTouches:{value:touches}});
  return target.dispatchEvent(event);
 },{type,x,count,selector});
 for(const cancel of ['release','move','scroll','multi','cancel','editable']){
  if(cancel==='editable')await page.locator('.file').evaluate(e=>{const input=document.createElement('input');e.append(input);});
  await touch('touchstart',90,1,cancel==='editable'?'.file input':'.file');
  if(cancel==='release')await touch('touchend');
  if(cancel==='move')await touch('touchmove',120);
  if(cancel==='scroll')await page.evaluate(()=>document.dispatchEvent(new Event('scroll')));
  if(cancel==='multi')await touch('touchstart',90,2);
  if(cancel==='cancel')await touch('touchcancel');
  await page.waitForTimeout(550);assert(!await open(),cancel+' cancels');await touch('touchend');
 }
 await touch('touchstart');
 assert.equal(await page.locator('.file').evaluate(e=>getComputedStyle(e).getPropertyValue('-webkit-user-select')), 'none','selection suppressed during hold');
 await page.waitForTimeout(550);assert(await open(),'hold opens');assert.equal(await page.evaluate(()=>document.activeElement?.id),'file-menu','touch opens without an active item');
 assert.equal(await touch('touchend'),false,'release prevents compatibility click');
 assert.equal(await page.locator('.file').evaluate(e=>e.style.getPropertyValue('-webkit-user-select')),'','gesture does not mutate authored styles');
 assert(await open(),'release keeps open');await page.locator('[data-action=open]').tap();assert(!await open(),'next tap activates');
 await touch('touchstart');await page.locator('#file-menu').evaluate(e=>e.remove());await page.waitForTimeout(550);assert.equal(await page.locator('.file').getAttribute('data-m-menu-context'),null,'disconnect restores context surface');
 console.log(name+': hold, movement/scroll/multitouch/cancel/editable guards, release, next tap and disconnect pass');
 if(name==='chromium'){
  await page.reload();await page.locator('.file').scrollIntoViewIfNeeded();
  const box=(await page.locator('.file').boundingBox())!;const cdp=await page.context().newCDPSession(page);
  await page.evaluate(()=>{(window as any).menuTransitions=[];document.querySelector('#file-menu')!.addEventListener('beforetoggle',(e:any)=>(window as any).menuTransitions.push(e.newState));});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+35,y:box.y+35}]});
  await page.waitForTimeout(650);assert(await open(),'trusted hold opens');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);assert(await open(),'trusted release keeps open');assert.deepEqual(await page.evaluate(()=>(window as any).menuTransitions),['open'],'hold and release open once without flicker');
  await page.locator('[data-action=open]').tap();assert(!await open(),'trusted next tap activates');
  console.log('chromium: trusted touch hold/release/action pass');
 }
 } finally {await browser.close();}
}
