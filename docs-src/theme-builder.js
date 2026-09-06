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
let css = '';
function update() {
 const [accent,primary,neutral,radius,density,font] = fields.map(field => field.value);
 const properties = {
  '--hue':accent, '--chroma':accent === '263' ? '0.21' : '0.14', '--neutral-chroma':neutral,
  '--color-primary':primary === 'accent' ? 'var(--accent-9)' : 'var(--neutral-12)',
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
