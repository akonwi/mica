/* Optional action-menu enhancement over authored native popovers.
 * No actions, labels, icons, or submenu markup are generated. */
class MMenu extends HTMLElement {
  #controller;
  #observer;
  #saved = new Map();
  #origin;
  #anchor;
  #point;
  #timer;
  #press;
  #pressTimer;
  #suppressReleaseClick = false;
  #touchContextUntil = 0;
  #typed = '';
  #typedAt = 0;
  get #parent() { return this.parentElement?.closest('m-menu'); }
  get #root() { return this.#parent?.#root ?? this; }
  get #open() { return this.matches(':popover-open'); }
  #items(visible = true) {
    return [...this.children].filter(e => e.matches('button,a[href]') && (!visible || (!e.hidden && getComputedStyle(e).display !== 'none')));
  }
  #set(element, name, value) {
    if (!this.#saved.has(element)) this.#saved.set(element, new Map());
    const attrs = this.#saved.get(element);
    if (!attrs.has(name)) attrs.set(name, element.getAttribute(name));
    if (value === null) element.removeAttribute(name); else element.setAttribute(name, String(value));
  }
  #contexts() { return [...document.querySelectorAll('[data-context-menu]')].filter(e => e.getAttribute('data-context-menu') === this.id); }
  #triggers() { return [...document.querySelectorAll('button[popovertarget]')].filter(b => b.getAttribute('popovertarget') === this.id); }
  #submenu(item) {
    const target = document.getElementById(item?.getAttribute('popovertarget'));
    return target instanceof MMenu && target.#parent === this ? target : null;
  }
  #closeChildren(except) {
    for (const child of this.querySelectorAll('m-menu')) if (child !== except && !except?.contains(child) && child.#open) child.hidePopover();
  }
  #close(restore = true) {
    clearTimeout(this.#timer);
    if (this.#parent) clearTimeout(this.#parent.#timer);
    this.#closeChildren();
    if (this.#open) this.hidePopover();
    if (restore && this.#origin?.isConnected) {
      const origin = this.#origin;
      origin.focus({preventScroll:true});
      // WebKit can defer the parent's :has() visibility update after Back.
      if (this.#parent) requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!this.#open && origin.isConnected && (!this.#parent || this.#parent.#open)) origin.focus({preventScroll:true});
      }));
    }
  }
  #show(anchor, point = null, last = false, focus = true) {
    if (!this.isConnected || !this.hasAttribute('popover')) return;
    this.#origin = this.#anchor = anchor;
    this.#point = point;
    if (this.#parent) clearTimeout(this.#parent.#timer);
    this.#parent?.#closeChildren(this);
    if (!this.#parent) for (const menu of document.querySelectorAll('m-menu[data-m-menu-enhanced]')) {
      if (menu !== this && !menu.#parent && menu.#open) menu.#close(false);
    }
    this.refresh();
    if (!this.#open) this.showPopover();
    this.#place();
    if (focus === true) (last ? this.#items().at(-1) : this.#items()[0])?.focus({preventScroll:true});
    else if (focus === false) this.focus({preventScroll:true});
  }
  #place() {
    if (!this.#open || !this.#anchor?.isConnected) return;
    const rect = this.#anchor.getBoundingClientRect();
    const width = this.offsetWidth, height = this.offsetHeight;
    const gap = parseFloat(getComputedStyle(this).rowGap) || 0;
    const edge = 8, mobile = matchMedia('(max-width: 600px)').matches;
    const rtl = getComputedStyle(this).direction === 'rtl';
    let x, y;
    if (this.#parent) {
      const parent = this.#parent.getBoundingClientRect();
      x = mobile ? parent.left : rtl ? parent.left-width-gap : parent.right+gap;
      y = mobile ? parent.top : rect.top;
      if (!mobile && (x < edge || x+width > innerWidth-edge)) x = rtl ? parent.right+gap : parent.left-width-gap;
    } else {
      const end = this.getAttribute('align') === 'end';
      x = (this.#point ? this.#point.x + (this.#point.width ?? 0) : undefined) ?? ((end !== rtl) ? rect.right-width : rect.left);
      if (this.#point && x+width > innerWidth-edge) x = this.#point.x-width;
      y = this.#point?.y ?? rect.bottom+gap;
      if (y+height > innerHeight-edge) y = this.#point ? this.#point.y-height : rect.top-height-gap;
    }
    this.style.setProperty('--m-menu-x', `${Math.max(edge,Math.min(x,innerWidth-width-edge))}px`);
    this.style.setProperty('--m-menu-y', `${Math.max(edge,Math.min(y,innerHeight-height-edge))}px`);
  }
  /** Reconcile authored items and triggers, including dynamically added actions. */
  refresh() {
    if (!this.#controller) return;
    this.#observer?.disconnect();
    // Release detached item references and restore their native semantics.
    for (const [element, attrs] of this.#saved) if (element !== this && !this.contains(element) && !this.#triggers().includes(element) && !this.#contexts().includes(element)) {
      for (const [key,value] of attrs) { if (value === null) element.removeAttribute(key); else element.setAttribute(key,value); }
      this.#saved.delete(element);
    }
    for (const context of this.#contexts()) this.#set(context,'data-m-menu-context','');
    // Keep native top-layer rendering; enhancement owns dismissal so touch
    // release cannot light-dismiss a menu opened during that same gesture.
    this.#set(this,'popover','manual');
    this.#set(this,'role','menu'); this.#set(this,'tabindex','-1');
    this.#set(this,'data-m-menu-enhanced','');
    for (const item of this.#items(false)) {
      this.#set(item,'role','menuitem'); this.#set(item,'tabindex','-1');
      // ARIA menus keep unavailable items focusable, unlike native disabled buttons.
      if (item.disabled) { this.#set(item,'aria-disabled','true'); this.#set(item,'disabled',null); }
    }
    for (const child of this.children) {
      if (child.matches('[data-menu-heading]')) this.#set(child,'aria-hidden','true');
      if (child.matches('hr')) this.#set(child,'role','separator');
    }
    for (const trigger of this.#triggers()) {
      this.#set(trigger,'aria-haspopup','menu'); this.#set(trigger,'aria-expanded',this.#open);
    }
    this.#observer?.observe(this,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','popovertarget']});
  }
  connectedCallback() {
    if (this.#controller || !this.hasAttribute('popover')) return;
    this.#controller = new AbortController();
    const {signal} = this.#controller;
    this.#observer = new MutationObserver(()=>this.refresh());
    this.refresh();
    this.addEventListener('toggle',()=>{
      this.refresh();
      if (this.#open) { this.#anchor ??= this.#triggers()[0]; this.#place(); }
      else { clearTimeout(this.#timer); this.#closeChildren(); }
    },{signal});
    // Capture before application click handlers so disabled actions never run,
    // and normal actions can safely open a dialog after the menu has closed.
    document.addEventListener('click',event=>{
      if (this.#suppressReleaseClick && event.detail !== 0) {
        this.#suppressReleaseClick = false;
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      const target = event.target.closest?.('button,a[href]');
      if (!target) return;
      if (target.closest('m-menu') === this) {
        if (target.getAttribute('aria-disabled') === 'true') { event.preventDefault(); event.stopImmediatePropagation(); return; }
        const sub = this.#submenu(target);
        if (sub) { event.preventDefault(); sub.#show(target,null,false,event.detail===0); return; }
        if (target.hasAttribute('data-menu-back')) { event.preventDefault(); this.#close(); return; }
        this.#root.#close();
      } else if (!this.#parent && target.getAttribute('popovertarget') === this.id) {
        event.preventDefault();
        if (this.#open) this.#close(); else this.#show(target,null,false,event.detail===0);
      }
    },{capture:true,signal});
    document.addEventListener('keydown',event=>{
      if (event.isComposing) return;
      const context = event.target.closest?.('[data-context-menu]');
      if (context?.getAttribute('data-context-menu') === this.id && (event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)) {
        event.preventDefault(); this.#show(context); return;
      }
      const trigger = event.target.closest?.('button[popovertarget]');
      if (!this.#parent && trigger?.getAttribute('popovertarget') === this.id && ['ArrowDown','ArrowUp'].includes(event.key)) {
        event.preventDefault(); this.#show(trigger,null,event.key==='ArrowUp'); return;
      }
      if (event.target.closest?.('m-menu') !== this) return;
      const list=this.#items(),i=list.indexOf(document.activeElement),rtl=getComputedStyle(this).direction==='rtl';
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault(); const n=event.key==='Home'?0:event.key==='End'?list.length-1:i<0?(event.key==='ArrowDown'?0:list.length-1):(i+(event.key==='ArrowDown'?1:-1)+list.length)%list.length;
        this.#closeChildren(); list[n]?.focus();
      } else if (event.key===(rtl?'ArrowLeft':'ArrowRight') && this.#submenu(event.target) && event.target.getAttribute('aria-disabled')!=='true') {
        event.preventDefault(); this.#submenu(event.target).#show(event.target);
      } else if (event.key===(rtl?'ArrowRight':'ArrowLeft') && this.#parent) {
        event.preventDefault(); this.#close();
      } else if (event.key==='Escape') {
        event.preventDefault(); event.stopPropagation(); this.#close();
      } else if (event.key==='Tab') {
        this.#root.#close(); // Let the browser continue from the original invoker.
      } else if ((event.key==='Enter'||event.key===' ') && event.target.getAttribute('aria-disabled')==='true') {
        event.preventDefault(); event.stopImmediatePropagation();
      } else if (event.key===' ' && event.target.matches('a[href]')) {
        event.preventDefault(); event.target.click();
      } else if(event.key.length===1 && event.key!==' ' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); this.#typed=Date.now()-this.#typedAt>650?event.key:this.#typed+event.key;this.#typedAt=Date.now();
        const q=/^(.)\1+$/.test(this.#typed)?this.#typed[0]:this.#typed;
        const match=[...list.slice(i+1),...list.slice(0,i+1)].find(e=>(e.getAttribute('aria-label')??e.textContent.trim()).toLocaleLowerCase().startsWith(q.toLocaleLowerCase()));
        if(match){this.#closeChildren();match.focus();}
      }
    },{capture:true,signal});
    // A touch hold is scoped to the same authored context surface as right-click.
    // Do not prevent touchstart/move: scrolling and pinch zoom remain native.
    const cancelPress = () => {
      clearTimeout(this.#pressTimer); this.#press = null;
    };
    document.addEventListener('pointerdown', event => {
      this.#suppressReleaseClick = false;
      if (!this.#parent && this.#open && !this.contains(event.target) &&
          !this.#triggers().some(trigger => trigger.contains(event.target))) this.#close(false);
    }, {capture:true, signal});
    document.addEventListener('touchstart', event => {
      cancelPress();
      this.#suppressReleaseClick = false;
      const context = event.target.closest?.('[data-context-menu]');
      if (this.#parent || event.touches.length !== 1 || context?.getAttribute('data-context-menu') !== this.id ||
          event.target.closest?.('input,textarea,select,button,a[href],[contenteditable]:not([contenteditable="false"])')) return;
      this.#touchContextUntil = Date.now() + 1500;
      const touch = event.touches[0];
      const press = this.#press = {context, id:touch.identifier, x:touch.clientX, y:touch.clientY, opened:false};
      this.#pressTimer = setTimeout(() => {
        if (this.#press !== press || !context.isConnected) return;
        press.opened = true;
        this.#suppressReleaseClick = true;
        this.#show(context, {x:press.x, y:press.y,width:10,height:10},false,false);

      }, 500);
    }, {passive:true, signal});
    document.addEventListener('touchmove', event => {
      const press = this.#press;
      if (!press || press.opened) return;
      const touch = [...event.touches].find(t => t.identifier === press.id);
      if (!touch || event.touches.length !== 1 || (Math.abs(touch.clientX-press.x) > 10 || Math.abs(touch.clientY-press.y) > 10)) cancelPress();
    }, {passive:true, signal});
    document.addEventListener('touchend', event => {
      if (this.#press?.opened) {
        // Suppress the compatibility click from the activating finger, not the next tap.
        event.preventDefault(); this.#suppressReleaseClick = true;

      }
      cancelPress();
    }, {passive:false, capture:true, signal});
    document.addEventListener('touchcancel', cancelPress, {signal});
    document.addEventListener('scroll', () => { if (!this.#press?.opened) cancelPress(); }, {capture:true, signal});
    window.addEventListener('blur', cancelPress, {signal});
    document.addEventListener('contextmenu',event=>{
      const context=event.target.closest?.('[data-context-menu]');
      if(context?.getAttribute('data-context-menu')!==this.id || this.#parent) return;
      event.preventDefault();
      if (this.#press || this.#touchContextUntil > Date.now()) return;
      this.#close(false);
      const point=(event.clientX||event.clientY)?{x:event.clientX,y:event.clientY}:null;
      const show=()=>{clearTimeout(this.#timer);this.#timer=setTimeout(()=>this.#show(context,point,false,!point),0);};
      // WebKit dispatches contextmenu on pointerdown; wait for release to avoid
      // the same gesture immediately light-dismissing the newly opened popover.
      if(event.buttons)document.addEventListener('pointerup',show,{once:true,signal});else show();
    },{signal});
    this.addEventListener('pointerover',event=>{
      if(event.pointerType==='touch'||matchMedia('(max-width: 600px)').matches)return;
      const item=event.target.closest('button,a[href]');
      if(item?.closest('m-menu')!==this)return;
      clearTimeout(this.#timer);item.focus({preventScroll:true});
      const sub=this.#submenu(item);
      if(sub && item.getAttribute('aria-disabled')!=='true')this.#timer=setTimeout(()=>sub.#show(item,null,false,null),220);
      else this.#closeChildren();
    },{signal});
    this.addEventListener('pointerleave',()=>clearTimeout(this.#timer),{signal});
    window.addEventListener('resize',()=>this.#place(),{signal});
    document.addEventListener('scroll',event=>{if(!event.target.closest?.('m-menu'))this.#place();},{capture:true,signal});
  }
  disconnectedCallback() {
    this.#controller?.abort();this.#controller=null;this.#observer?.disconnect();clearTimeout(this.#timer);
    clearTimeout(this.#pressTimer);this.#touchContextUntil=0;this.#press=null;this.#suppressReleaseClick=false;
    for(const [element,attrs]of this.#saved)for(const [key,value]of attrs){if(value===null)element.removeAttribute(key);else element.setAttribute(key,value);}
    this.#saved.clear();this.style.removeProperty('--m-menu-x');this.style.removeProperty('--m-menu-y');
    this.#origin=this.#anchor=this.#point=null;
  }
}
if(!customElements.get('m-menu'))customElements.define('m-menu',MMenu);
