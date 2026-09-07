import '../combobox.js';
const input=document.querySelector('#city'),list=document.querySelector('#locations'),status=document.querySelector('#status'),receipt=document.querySelector('#receipt'),payload=document.querySelector('#payload');
const data=[{key:'paris-fr',label:'Paris',region:'Île-de-France, France',latitude:48.8566,longitude:2.3522},{key:'paris-tx',label:'Paris',region:'Texas, United States',latitude:33.6609,longitude:-95.5555},{key:'new-york-us',label:'New York',region:'New York, United States',latitude:40.7128,longitude:-74.006}];
let timer,version=0;
function search(){
 clearTimeout(timer);const v=++version,q=input.value.trim().toLowerCase();list.replaceChildren();
 receipt.textContent=q?`Typing “${input.value}” — no location selected.`:'No location chosen yet.';payload.textContent='selection: null';status.hidden=false;
 if(q.length<2){status.textContent='Type at least 2 characters to search.';return;}
 status.textContent='Searching…';
 timer=setTimeout(()=>{
  if(v!==version)return;
  if(q==='error'){status.textContent='Could not search locations. Change the query or try again.';return;}
  const results=data.filter(e=>e.label.toLowerCase().includes(q)||(q==='nyc'&&e.key==='new-york-us'));
  for(const item of results){const o=new Option(item.label,item.label);o.label=item.region;o.dataset.key=item.key;list.append(o);}
  status.hidden=results.length>0;status.textContent=results.length?'':'No locations found. Try a different place name.';
 },600);
}
input.addEventListener('input',e=>{if(e.isTrusted)search();});
document.querySelector('#search').addEventListener('m-on-change',e=>{
 clearTimeout(timer);++version;const item=data.find(o=>o.key===e.detail.key);status.hidden=true;
 receipt.textContent=`Selected ${item.label} · ${item.region}`;
 payload.textContent=JSON.stringify({event:e.type,detail:e.detail,'app looks up':{latitude:item.latitude,longitude:item.longitude}},null,2);
});
document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{input.value=b.dataset.query;input.focus();search();});
document.querySelector('#reset').onclick=()=>{input.value='';input.focus();search();};
