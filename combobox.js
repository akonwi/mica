/* Optional combobox enhancement over authored input + datalist markup.
 * Application code owns fetching and status content. */
let uid = 0;
class MCombobox extends HTMLElement {
  #input; #datalist; #popup; #list; #status; #marker; #controller; #observer;
  #options = []; #active = -1; #saved = new Map(); #dismissed = false; #choosing = false;
  connectedCallback() {
    if (this.#controller) return;
    this.#input = this.querySelector('input'); this.#datalist = this.querySelector('datalist');
    if (!this.#input || !this.#datalist) return;
    this.#controller = new AbortController();
    const {signal} = this.#controller;
    for (const name of ['list','role','aria-expanded','aria-autocomplete','autocomplete','aria-controls','aria-activedescendant']) this.#saved.set(name,this.#input.getAttribute(name));
    this.#input.removeAttribute('list');
    this.#input.setAttribute('role','combobox'); this.#input.setAttribute('aria-expanded','false');
    this.#input.setAttribute('aria-autocomplete','list'); this.#input.autocomplete='off';
    this.#popup=document.createElement('div');this.#popup.setAttribute('data-combobox-popup','');this.#popup.hidden=true;
    this.#list=document.createElement('div');this.#list.id=`m-cb-${++uid}`;this.#list.setAttribute('role','listbox');
    this.#popup.append(this.#list);
    this.#status=this.querySelector(':scope > [role="status"]');
    if(this.#status){this.#marker=document.createComment('combobox status');this.#status.before(this.#marker);this.#popup.append(this.#status);}
    this.append(this.#popup);this.#input.setAttribute('aria-controls',this.#list.id);
    this.#buildOptions();
    this.#observer=new MutationObserver(records=>{
      if(records.some(r=>r.target===this.#datalist||this.#datalist.contains(r.target)))this.#buildOptions();
      if(!this.#dismissed && this.contains(document.activeElement))this.#openAndFilter();
    });
    this.#observer.observe(this.#datalist,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['value','label','data-key','disabled']});
    if(this.#status)this.#observer.observe(this.#status,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
    this.#observer.observe(this,{attributes:true,attributeFilter:['filter']});
    this.#input.addEventListener('input',()=>{if(!this.#choosing){this.#dismissed=false;this.#openAndFilter();}},{signal});
    this.#input.addEventListener('focus',()=>{if(!this.#choosing&&!this.#dismissed){this.#dismissed=false;this.#openAndFilter();}},{signal});
    this.#input.addEventListener('pointerdown',()=>{this.#dismissed=false;if(document.activeElement===this.#input)this.#openAndFilter();},{signal});
    this.#input.addEventListener('keydown',e=>this.#onKey(e),{signal});
    this.addEventListener('focusout',e=>{if(!this.contains(e.relatedTarget)){this.#close();this.#dismissed=false;}},{signal});
  }
  disconnectedCallback(){
    this.#controller?.abort();this.#controller=null;this.#observer?.disconnect();
    if(this.#marker){this.#marker.replaceWith(this.#status);this.#marker=null;}
    this.#popup?.remove();
    for(const [name,value]of this.#saved){if(value===null)this.#input.removeAttribute(name);else this.#input.setAttribute(name,value);}
    this.#saved.clear();this.#options=[];this.#active=-1;this.#dismissed=false;
  }
  #buildOptions(){
    this.#list.replaceChildren();
    this.#options=[...this.#datalist.options].map((source,i)=>{
      const row=document.createElement('div');row.id=`${this.#list.id}-${i}`;row.setAttribute('role','option');row.tabIndex=-1;
      const value=source.value,key=source.getAttribute('data-key')??value;
      const label=document.createElement('span');label.textContent=value;row.append(label);
      if(source.label && source.label!==value){const detail=document.createElement('small');detail.textContent=source.label;row.append(detail);}
      if(source.disabled)row.setAttribute('aria-disabled','true');
      // Keep the input focused until a completed tap/click selects the row.
      // Otherwise the iOS keyboard can dismiss and move the target mid-tap.
      let press;
      row.addEventListener('pointerdown',e=>{e.preventDefault();press={id:e.pointerId,x:e.clientX,y:e.clientY};});
      row.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)press=null;});
      row.addEventListener('pointercancel',()=>{press=null;});
      row.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'&&press?.id===e.pointerId){e.preventDefault();this.#choose(row);}press=null;});
      row.addEventListener('click',()=>{if(!this.#popup.hidden)this.#choose(row);});
      row.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')this.#setActive(this.#visible().indexOf(row));});
      this.#list.append(row);return {row,value,key,disabled:source.disabled};
    });this.#active=-1;
  }
  #visible(){return this.#options.filter(o=>!o.row.hidden&&!o.disabled).map(o=>o.row);}
  #openAndFilter(){
    const q=this.#input.value.trim().toLocaleLowerCase(),manual=this.getAttribute('filter')==='manual';
    for(const o of this.#options)o.row.hidden=!manual&&q!==''&&!o.row.textContent.toLocaleLowerCase().includes(q);
    const any=this.#options.some(o=>!o.row.hidden);
    this.#list.hidden=!any;
    this.#popup.hidden=!(any||(this.#status&&!this.#status.hidden));
    this.#input.setAttribute('aria-expanded',String(!this.#popup.hidden));
    this.#setActive(this.#visible().length?0:-1);
  }
  #close(){this.#dismissed=true;this.#popup.hidden=true;this.#input.setAttribute('aria-expanded','false');this.#setActive(-1);}
  #setActive(i){
    const rows=this.#visible();this.#active=i;
    for(const o of this.#options)o.row.setAttribute('aria-selected',String(o.row===rows[i]));
    if(rows[i]){this.#input.setAttribute('aria-activedescendant',rows[i].id);rows[i].scrollIntoView({block:'nearest'});}
    else this.#input.removeAttribute('aria-activedescendant');
  }
  #onKey(e){
    if(e.isComposing)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      if(this.#popup.hidden){this.#dismissed=false;this.#openAndFilter();if(e.key==='ArrowUp')this.#setActive(this.#visible().length-1);return;}
      const n=this.#visible().length;if(n)this.#setActive((this.#active+(e.key==='ArrowDown'?1:-1)+n)%n);
    }else if(e.key==='Enter'&&!this.#popup.hidden&&this.#active>=0){e.preventDefault();this.#choose(this.#visible()[this.#active]);}
    else if(e.key==='Escape'){this.#close();}
    else if(e.key==='Tab')this.#close();
  }
  #choose(row){
    const option=this.#options.find(o=>o.row===row);if(!option||option.disabled)return;
    this.#choosing=true;
    try{
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
      if(setter)setter.call(this.#input,option.value);else this.#input.value=option.value;
      this.#close();this.#input.focus({preventScroll:true});
      this.#input.dispatchEvent(new Event('input',{bubbles:true}));
      this.#input.dispatchEvent(new Event('change',{bubbles:true}));
      this.dispatchEvent(new CustomEvent('m-on-change',{bubbles:true,detail:{key:option.key,value:option.value}}));
    }finally{this.#choosing=false;}
  }
}
if(!customElements.get('m-combobox'))customElements.define('m-combobox',MCombobox);
