// Optional light-DOM enhancement. Buttons and links remain authored by the app.
let nextId = 0;
class MCommand extends HTMLElement {
  static observedAttributes = ['filter'];
  #controller;
  #observer;
  #saved = new Map();
  #input;
  #list;
  #items = [];
  #active;
  #set(element, name, value) {
    if (!this.#saved.has(element)) this.#saved.set(element, new Map());
    const attributes = this.#saved.get(element);
    if (!attributes.has(name)) attributes.set(name, element.getAttribute(name));
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, String(value));
  }
  connectedCallback() {
    if (this.#controller) return;
    this.#controller = new AbortController();
    const options = {signal: this.#controller.signal};
    this.addEventListener('input', event => {
      if (event.target === this.#input) { this.#active = null; this.refresh(); }
    }, options);
    this.addEventListener('keydown', event => {
      if (event.target !== this.#input || event.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const items = this.#available();
        const i = items.indexOf(this.#active);
        this.#select(items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length], true);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (this.#available().includes(this.#active)) this.#active.click();
      }
    }, options);
    this.addEventListener('pointermove', event => {
      const item = event.target.closest('[data-command-item]');
      if (this.#available().includes(item)) this.#select(item);
    }, options);
    this.addEventListener('mousedown', event => {
      if (event.button === 0 && this.#items.includes(event.target.closest('[data-command-item]'))) event.preventDefault();
    }, options);
    this.addEventListener('click', event => {
      const item = event.target.closest('[data-command-item]');
      if (this.#items.includes(item) && item.getAttribute('aria-disabled') === 'true') {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, {...options, capture: true});
    this.#observer = new MutationObserver(() => this.refresh());
    this.refresh();
  }
  disconnectedCallback() {
    this.#controller?.abort(); this.#controller = null;
    this.#observer?.disconnect();
    for (const [element, attributes] of this.#saved) for (const [name, value] of attributes) {
      if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
    }
    this.#saved.clear(); this.#active = null;
  }
  attributeChangedCallback() { if (this.#controller) this.refresh(); }
  #watch() {
    this.#observer?.observe(this, {subtree:true, childList:true, characterData:true, attributes:true,
      attributeFilter:['hidden','disabled','aria-disabled','data-keywords']});
  }
  #available() {
    return this.#items.filter(item => !item.closest('[hidden]') && !item.disabled && item.getAttribute('aria-disabled') !== 'true');
  }
  #select(item, scroll = false) {
    this.#active = item;
    this.#items.forEach(option => this.#set(option, 'aria-selected', option === item));
    if (this.#input) this.#set(this.#input, 'aria-activedescendant', item?.id ?? null);
    if (scroll) item?.scrollIntoView({block:'nearest'});
  }
  /** Reconcile application-authored results; useful after synchronous manual updates. */
  refresh() {
    this.#observer?.disconnect();
    for (const [element, attributes] of this.#saved) if (!this.contains(element)) {
      for (const [name, value] of attributes) {
        if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
      }
      this.#saved.delete(element);
    }
    this.#input = this.querySelector('[data-command-input]');
    this.#list = this.querySelector('m-command-list');
    if (!this.#input || !this.#list) { this.#watch(); return; }
    const identify = element => { if (!element.id) this.#set(element, 'id', `mica-command-${++nextId}`); };
    identify(this.#list);
    this.#set(this.#input, 'hidden', null);
    this.#set(this.#input, 'role', 'combobox');
    this.#set(this.#input, 'aria-autocomplete', 'list');
    this.#set(this.#input, 'aria-controls', this.#list.id);
    this.#set(this.#list, 'role', 'listbox');
    this.#items = [...this.#list.querySelectorAll('[data-command-item]')];
    const words = this.#input.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const manual = this.getAttribute('filter') === 'manual';
    for (const item of this.#items) {
      identify(item);
      this.#set(item, 'role', 'option'); this.#set(item, 'tabindex', '-1');
      if (!manual) {
        const text = `${item.textContent} ${item.dataset.keywords ?? ''}`.toLocaleLowerCase();
        this.#set(item, 'hidden', words.every(word => text.includes(word)) ? null : '');
      }
    }
    for (const group of this.#list.querySelectorAll('m-command-group')) {
      this.#set(group, 'role', 'group');
      const heading = group.querySelector('h2,h3,h4,h5,h6');
      if (heading) { identify(heading); this.#set(group, 'aria-labelledby', heading.id); this.#set(heading, 'aria-hidden', 'true'); }
      if (!manual) this.#set(group, 'hidden', [...group.querySelectorAll('[data-command-item]')].some(item => !item.hidden) ? null : '');
    }
    const visible = this.#items.filter(item => !item.closest('[hidden]'));
    const empty = this.querySelector('[data-command-empty]');
    if (empty) this.#set(empty, 'hidden', visible.length ? '' : null);
    this.#set(this.#input, 'aria-expanded', visible.length > 0);
    const available = this.#available();
    this.#select(available.includes(this.#active) ? this.#active : available[0]);
    this.#watch();
  }
}
if (!customElements.get('m-command-palette')) customElements.define('m-command-palette', MCommand);
