import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
for (const [name, engine] of Object.entries({chromium, webkit})) {
 const browser=await engine.launch();
 try {
  const page=await browser.newPage();
  await page.goto('http://localhost:8471/demo.html');
  await page.evaluate(()=>customElements.whenDefined('m-field'));
  const actual=await page.evaluate(()=>{
   const host=document.createElement('div');host.innerHTML=`<m-field><input type="email" required aria-describedby="help extra"><p id="help">Helper</p><p id="extra">More help</p><m-error id="missing" match="value-missing">Required</m-error><m-error id="format" match="type-mismatch">Email needed</m-error></m-field>`;document.body.append(host);
   const field=host.querySelector('input')!;const result:Record<string,string|null>={};
   const check=(key:string)=>{field.checkValidity();result[key]=field.getAttribute('aria-describedby');};
   check('missing');check('repeat');field.value='bad';check('format');
   field.setAttribute('aria-describedby',field.getAttribute('aria-describedby')+' dynamic');
   field.value='valid@example.com';field.dispatchEvent(new Event('input',{bubbles:true}));result.valid=field.getAttribute('aria-describedby');
   field.value='';check('again');field.setCustomValidity('server error');field.value='valid@example.com';check('unmatched');
   field.setCustomValidity('');field.setAttribute('aria-describedby','help missing');field.value='';check('authoredError');field.value='valid@example.com';field.dispatchEvent(new Event('input',{bubbles:true}));result.authoredCleared=field.getAttribute('aria-describedby');
   field.removeAttribute('aria-describedby');field.value='';check('noHelper');field.value='valid@example.com';field.dispatchEvent(new Event('input',{bubbles:true}));result.noHelperCleared=field.getAttribute('aria-describedby');
   host.remove();return result;
  });
  assert.deepEqual(actual,{missing:'help extra missing',repeat:'help extra missing',format:'help extra format',valid:'help extra dynamic',again:'help extra dynamic missing',unmatched:'help extra dynamic',authoredError:'help missing',authoredCleared:'help missing',noHelper:'missing',noHelperCleared:null});
  console.log(name+': helper IDs preserved through error changes, repeated validation, live clearing, dynamic descriptions, authored error IDs, and no-match states');
 } finally {await browser.close();}
}
