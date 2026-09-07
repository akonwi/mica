import '../command.js';
// Application-owned dialog opening and sample actions.
const inline=document.getElementById('inline-command');
const palette=document.getElementById('palette');
const copy=palette.querySelector('m-command-palette');
let opener;
function open(){if(palette.open)return;opener=document.getElementById('open');copy.querySelector('input').value='';palette.showModal();copy.refresh();copy.querySelector('input').focus();}
document.getElementById('open').onclick=open;palette.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();palette.close();}});palette.addEventListener('close',()=>opener?.focus());
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!document.getElementById('create').open){event.preventDefault();palette.open?palette.close():open();}});
const activity=document.getElementById('activity');
for(const root of document.querySelectorAll('m-command-palette'))root.addEventListener('click',async event=>{
 const item=event.target.closest('[data-command-item]');if(!item||item.disabled)return;
 if(palette.open)palette.close();
 if(item.dataset.value==='create'){document.getElementById('create').showModal();document.getElementById('project-name').focus();}
 if(item.dataset.value==='notifications')activity.textContent='Notifications paused in this demo.';
 if(item.dataset.value==='copy'){try{await navigator.clipboard.writeText(location.href);activity.textContent='Page link copied.';}catch{activity.textContent='Copy this page’s address from your browser.';}}
});
document.getElementById('create').addEventListener('close',event=>{if(event.target.returnValue==='create')activity.textContent=`Created “${document.getElementById('project-name').value}” in this demo.`;});
document.getElementById('reset').onclick=()=>{document.querySelectorAll('m-command-palette').forEach(root=>{root.querySelector('input').value='';root.refresh();});activity.textContent='Actions in this demo stay local.';};

document.getElementById('compact').onchange = event => document.querySelectorAll('m-command-palette').forEach(root => root.toggleAttribute('data-compact', event.target.checked));
document.getElementById('dividers').onchange = event => document.querySelectorAll('m-command-list').forEach(list => list.toggleAttribute('dividers', event.target.checked));
