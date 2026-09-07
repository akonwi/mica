import '../command.js';
// Docs-only search: a native modal with a combobox/listbox interaction.
const dialog = document.getElementById('docs-search');
const input = document.getElementById('docs-search-input');
const list = document.getElementById('docs-search-results');
const status = document.getElementById('docs-search-status');
const retry = document.getElementById('docs-search-retry');
const base = new URL('../', import.meta.url);
let index;
let loading;
let results = [];
const command = dialog.querySelector("m-command-palette");
let returnFocus;
const normalize = text => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const popular = ['Introduction', 'Theme builder', 'Tokens & theming', 'button', 'sidebar'];

function render() {
  if (!index || !dialog.open) return;
  const words = normalize(input.value).split(' ').filter(Boolean);
  if (!words.length) results = popular.map(title => index.find(entry => entry.title === title && !entry.url.includes('#'))).filter(Boolean);
  else {
    const ranked = index.map(entry => {
      const title=normalize(entry.title), keywords=normalize(entry.keywords), description=normalize(entry.description), text=normalize(entry.text);
      let score=0;
      for(const word of words) {
        if(title.includes(word)) score+=20;
        else if(keywords.includes(word)) score+=12;
        else if(description.includes(word)) score+=5;
        else if(text.includes(word)) score+=1;
        else return {entry,score:0};
      }
      return {entry,score};
    }).filter(result=>result.score>0).sort((a,b)=>b.score-a.score);
    const pages=new Set();
    results=ranked.filter(({entry})=>{if(pages.has(entry.page))return false;pages.add(entry.page);return true;}).slice(0,8).map(({entry})=>entry);
  }
  input.removeAttribute('aria-activedescendant');
  list.replaceChildren();
  results.forEach((entry,i)=>{
    const option=document.createElement('a');
    option.id=`docs-search-option-${i}`;option.href=new URL(entry.url,base).href;
    option.setAttribute('data-command-item','');
    const heading=document.createElement('strong');heading.textContent=entry.url.includes('#') ? `${entry.page} / ${entry.title}` : entry.title;
    const group=document.createElement('small');group.textContent=entry.group;
    const excerpt=document.createElement('p');
    const match=words.length ? entry.text.toLowerCase().indexOf(words[0]) : -1;
    excerpt.textContent=match>100 ? `…${entry.text.slice(Math.max(0,match-45),match+120)}…` : entry.description;
    option.append(heading,group,excerpt);
    list.append(option);
  });
  input.setAttribute('aria-expanded',String(results.length>0));
  status.textContent=words.length ? (results.length ? `${results.length} result${results.length===1?'':'s'}` : 'No results. Try a component name or a different phrase.') : 'Common destinations';
  command.refresh();
}
async function load() {
  if(index){render();return;}
  status.textContent='Loading search…';retry.hidden=true;
  if(!loading) loading=fetch(new URL('search-index.json',import.meta.url)).then(response=>{
    if(!response.ok)throw new Error('Search index unavailable');return response.json();
  }).then(data=>{if(!Array.isArray(data))throw new Error('Invalid search index');index=data;}).finally(()=>{loading=null;});
  try {await loading;render();}
  catch {if(dialog.open){status.textContent='Search could not load. Please try again.';retry.hidden=false;}}
}
function open(opener = document.activeElement) {
  if(dialog.open)return;
  returnFocus=opener;
  dialog.showModal();input.focus();input.select();load();
}
document.querySelectorAll('[data-search-open]').forEach(button=>{button.hidden=false;button.addEventListener('click',()=>open(button));});
document.querySelectorAll('[data-search-shortcut]').forEach(label=>{label.textContent=/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';});
retry.addEventListener('click',load);
input.addEventListener('input',render);
dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.isComposing){event.preventDefault();event.stopPropagation();dialog.close();}});
dialog.addEventListener('close',()=>{input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(returnFocus?.isConnected)returnFocus.focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&!event.altKey&&event.key.toLowerCase()==='k'){
    if(document.querySelector('dialog[open]:not(#docs-search):not([data-sidebar-dialog])'))return;
    event.preventDefault();dialog.open ? dialog.close() : open();
  }
});
