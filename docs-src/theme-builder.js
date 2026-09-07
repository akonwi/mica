const ids = ['accent','primary','neutral','radius','density','font'];
const presets = {
 mica: ['263','neutral','0','0','comfortable','system'],
 slate: ['263','accent','0.008','0.375','compact','system'],
 grove: ['170','accent','0.016','0.75','comfortable','serif'],
 rose: ['10','accent','0.008','0.375','comfortable','system'],
};
const fonts = {system:'system-ui, sans-serif',serif:'Georgia, "Times New Roman", serif',mono:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'};
const fields = ids.map(id => document.getElementById(id));
const frame = document.getElementById('preview');
const accentColor = document.getElementById('accent-color');
const accentHex = document.getElementById('accent-hex');
const swatches = {'263':'#306bef','170':'#008a65','310':'#8356ac','10':'#b5516e'};
// Convert the native picker's sRGB color to OKLCH hue/chroma. The existing
// Mica ramp owns lightness, keeping light and dark shades paired.
function accentTokens(hex) {
 const [r,g,b] = hex.match(/[a-f0-9]{2}/gi).map(pair => {
  const value = parseInt(pair,16)/255;
  return value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4;
 });
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
 const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
 const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 const a=1.9779984951*l-2.428592205*m+.4505937099*s;
 const bb=.0259040371*l+.7827717662*m-.808675766*s;
 const chroma=Math.hypot(a,bb);
 return {hue:chroma < .0001 ? '0' : ((Math.atan2(bb,a)*180/Math.PI+360)%360).toFixed(3),chroma:chroma.toFixed(5)};
}
let css = '';
function update() {
 const [accent,primary,neutral,radius,density,font] = fields.map(field => field.value);
 if(accent !== 'custom') accentColor.value=swatches[accent];
 accentHex.value=accentColor.value.toUpperCase();
 const custom=accent === 'custom' ? accentTokens(accentColor.value) : null;
 const properties = {
  '--hue':custom?.hue ?? accent, '--chroma':custom?.chroma ?? (accent === '263' ? '0.21' : '0.14'), '--neutral-chroma':neutral,
  '--color-primary':primary === 'accent' ? 'var(--accent-10)' : 'var(--neutral-12)',
  '--color-primary-hover':primary === 'accent' ? 'var(--accent-11)' : 'color-mix(in oklch, var(--color-primary) 90%, var(--color-surface))',
  '--color-primary-active':primary === 'accent' ? 'var(--accent-11)' : 'color-mix(in oklch, var(--color-primary) 80%, var(--color-surface))',
  '--color-on-primary':primary === 'accent' ? 'var(--color-on-accent)' : 'var(--neutral-1)',
  '--radius-sm':radius === '0.75' ? 'var(--radius-full)' : `${Number(radius)/2}rem`, '--radius-md':`${radius}rem`, '--radius-lg':`${Number(radius)*2}rem`,
  '--font-body':fonts[font],
 };
 if (density === 'compact') Object.assign(properties, {'--space-sm':'.625rem','--space-md':'.875rem','--space-lg':'1.125rem','--space-xl':'1.75rem','--space-2xl':'3rem'});
 css = '/* Load after mica.css */\n:root {\n'+Object.entries(properties).map(([key,value])=>`  ${key}: ${value};`).join('\n')+'\n}\n';
 if(frame.contentDocument?.head){
  let style=frame.contentDocument.getElementById('theme-overrides');
  if(!style){style=frame.contentDocument.createElement('style');style.id='theme-overrides';frame.contentDocument.head.append(style);}
  style.textContent=css;
 }
 const selected=Object.entries(presets).find(([,values])=>values.every((value,i)=>value===fields[i].value))?.[0];
 document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===selected)));
 document.getElementById('preset-name').textContent=selected ? selected[0].toUpperCase()+selected.slice(1) : 'Custom';
 document.getElementById('css-output').value=css;
}
function preset(name){presets[name].forEach((value,i)=>fields[i].value=value);update();}
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>preset(button.dataset.preset)));
fields.forEach(field=>field.addEventListener('change',update));
accentColor.addEventListener('input',()=>{document.getElementById('accent').value='custom';update();});
frame.addEventListener('load',update);
document.getElementById('reset').addEventListener('click',()=>preset('mica'));
document.getElementById('narrow').addEventListener('change',event=>document.getElementById('canvas').dataset.narrow=String(event.target.checked));
const dialog=document.getElementById('export-dialog');
document.getElementById('export').addEventListener('click',()=>{document.getElementById('copy-status').textContent='';dialog.showModal();});
document.getElementById('close-export').addEventListener('click',()=>dialog.close());
document.getElementById('copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(css);document.getElementById('copy-status').textContent='Copied. Paste into your stylesheet.';}
 catch{document.getElementById('css-output').select();document.getElementById('copy-status').textContent='Select and copy the CSS above.';}
});
update();

// Recipe selection and source export belong to the documentation site.
{
const picker=document.getElementById('recipe'), recipeFrame=document.getElementById('preview');
const captions={overview:'Sidebar · cards · activity list',projects:'Filters · table · bulk actions · pagination',settings:'Cards · fields · switches · save actions',detail:'Breadcrumbs · notes list · progress · callout',components:'The original component sampler'};
const urls={components:'theme-preview.html'};
picker.onchange=()=>{recipeFrame.src=urls[picker.value]??`recipe-${picker.value}.html`;document.getElementById('recipe-caption').textContent=captions[picker.value];};
recipeFrame.addEventListener('load',()=>{const key=new URL(recipeFrame.contentWindow.location.href).pathname.match(/recipe-(\w+)\.html/)?.[1];if(key){picker.value=key;document.getElementById('recipe-caption').textContent=captions[key];}});
const dialog=document.getElementById('html-dialog'),output=document.getElementById('html-output'),status=document.getElementById('html-status');
document.getElementById('view-html').onclick=async()=>{status.textContent='';output.value='Loading…';document.getElementById('copy-html').disabled=true;dialog.showModal();try{const response=await fetch(recipeFrame.contentWindow.location.href);if(!response.ok)throw Error();const doc=new DOMParser().parseFromString(await response.text(),'text/html');doc.querySelector('script[src$="appearance.js"]')?.remove();doc.querySelectorAll('[src],[href]').forEach(el=>{for(const attr of ['src','href'])if(el.getAttribute(attr)?.startsWith('../'))el.setAttribute(attr,el.getAttribute(attr).slice(3));});output.value='<!doctype html>\n'+doc.documentElement.outerHTML;document.getElementById('copy-html').disabled=false;status.textContent='Place beside mica.css and sidebar.js. Recipe links refer to companion recipe files; replace them with your app routes.';}catch{output.value='';status.textContent='Could not load recipe markup. Please try again.'}};
document.getElementById('close-html').onclick=()=>dialog.close();
document.getElementById('copy-html').onclick=async()=>{try{await navigator.clipboard.writeText(output.value);status.textContent='Copied recipe HTML.';}catch{output.select();status.textContent='Select and copy the HTML above.'}};

}
