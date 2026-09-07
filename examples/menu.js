import '../menu.js';
const root=document.getElementById('file-menu');
document.getElementById('icons').onchange=e=>root.classList.toggle('no-icons',!e.target.checked);
const status=document.getElementById('activity'),rename=document.getElementById('rename-dialog');
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{if(button.getAttribute('aria-disabled')==='true')return;if(button.dataset.action==='rename')rename.showModal();else status.textContent=button.dataset.action==='assign'?`Reassigned to ${button.textContent.trim()} in this demo.`:`${button.textContent.trim()} selected in this demo.`;}));
rename.addEventListener('close',()=>{if(rename.returnValue==='save'){document.getElementById('file-name').textContent=document.getElementById('rename-input').value;status.textContent='File renamed in this demo.'}document.getElementById('more').focus();});
