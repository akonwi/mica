/* Optional sidebar shell enhancement. The panel, dialog, controls, and all
 * icons are authored HTML. Only the same panel is moved into the native
 * dialog on narrow containers; no UI or navigation is generated. */
class MSidebarLayout extends HTMLElement {
  #cleanup;
  #actions;
  #refresh;
  static observedAttributes = ['collapse'];
  attributeChangedCallback() { this.#refresh?.(); }
  open() { this.#actions?.open(); }
  close() { this.#actions?.close(); }
  toggle() { this.#actions?.toggle(); }

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected || this.#cleanup) return;
      const sidebar = this.querySelector(':scope > m-sidebar');
      const main = this.querySelector(':scope > [data-sidebar-main]');
      const dialog = this.querySelector(':scope > dialog[data-sidebar-dialog]');
      if (!sidebar?.id || !main || !dialog || !('showModal' in dialog) || dialog.open || dialog.children.length) return;
      const triggers = [...main.querySelectorAll('button[data-sidebar-toggle]')].filter(b => b.getAttribute('aria-controls') === sidebar.id);
      const closers = [...sidebar.querySelectorAll('button[data-sidebar-close]')];
      if (!triggers.length || !closers.length) return;
      const originalExpanded = triggers.map(b => b.getAttribute('aria-expanded'));
      const controller = new AbortController();
      const { signal } = controller;
      let mobile = false;
      let rail = false;
      let canRail = false;
      let opener = triggers[0];
      const focusable = 'a[href],button:not(:disabled),summary';
      const closePopovers = () => sidebar.querySelectorAll('[popover]:popover-open').forEach(p => p.hidePopover());
      const update = () => {
        this.toggleAttribute('data-m-sidebar-mobile', mobile);
        this.toggleAttribute('data-m-sidebar-rail', rail && canRail && !mobile);
        this.toggleAttribute('data-m-sidebar-can-rail', canRail && !mobile);
        for (const button of triggers) button.setAttribute('aria-expanded', String(mobile ? dialog.open : !(rail && canRail)));
      };
      const setRail = value => {
        closePopovers();
        const active = document.activeElement;
        rail = value && canRail;
        update();
        if (sidebar.contains(active) && active instanceof HTMLElement && !active.getClientRects().length) triggers[0].focus();
      };
      const open = () => {
        if (mobile) {
          if (!dialog.open) dialog.showModal();
          update();
        } else setRail(false);
      };
      const close = () => {
        if (mobile) {
          closePopovers();
          if (dialog.open) dialog.close();
          update();
        } else setRail(true);
      };
      const toggle = () => mobile ? (dialog.open ? close() : open()) : setRail(!rail);
      const measure = () => {
        const active = document.activeElement;
        // Icon collapse is explicitly requested and requires named, authored
        // icons. Invalid icon anatomy falls back to the expanded desktop panel.
        const items = [...sidebar.querySelectorAll('[data-sidebar-item]')].filter(e => !e.closest('[data-sidebar-subnav], [popover]'));
        canRail = this.getAttribute('collapse') === 'icon' && items.length > 0 && items.every(e => e.querySelector('[data-sidebar-icon]') && (e.hasAttribute('aria-label') || e.hasAttribute('aria-labelledby')));
        const nextMobile = this.getBoundingClientRect().width < 44 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (nextMobile !== mobile || sidebar.parentElement !== (nextMobile ? dialog : this)) {
          const hadSidebarFocus = sidebar.contains(active);
          closePopovers();
          if (dialog.open) dialog.close();
          mobile = nextMobile;
          if (mobile) dialog.append(sidebar);
          else this.insertBefore(sidebar, main);
          update();
          if (hadSidebarFocus && active instanceof HTMLElement) {
            if (mobile) opener.focus();
            else {
              // Preserve a focused nested link when returning to desktop.
              if (active.closest('[data-sidebar-subnav]')) rail = false;
              update();
              if (active.matches('[data-sidebar-close]')) sidebar.querySelector(focusable)?.focus();
              else active.focus();
            }
          } else if (!mobile && triggers.includes(active) && !canRail) sidebar.querySelector(focusable)?.focus();
        } else update();
      };
      for (const button of triggers) button.addEventListener('click', () => { opener = button; toggle(); }, { signal });
      for (const button of closers) button.addEventListener('click', close, { signal });
      dialog.addEventListener('close', () => {
        update();
        // WebKit can leave focus on body after closing a modal that contained
        // a popover. Preserve router-assigned focus elsewhere in the page.
        if (mobile && (document.activeElement === document.body || dialog.contains(document.activeElement))) opener.focus();
      }, { signal });
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
      }, { signal });
      sidebar.addEventListener('click', event => {
        const summary = event.target.closest('summary');
        if (summary && rail && !mobile) {
          event.preventDefault();
          setRail(false);
          summary.parentElement.open = true;
        }
        const link = event.target.closest('a[href]');
        if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) queueMicrotask(() => { if (!event.defaultPrevented && mobile) close(); });
      }, { signal });
      const observer = new ResizeObserver(measure);
      observer.observe(this);
      window.addEventListener('resize', measure, { signal, passive: true });
      this.#actions = { open, close, toggle };
      this.#refresh = measure;
      this.#cleanup = () => {
        controller.abort();
        observer.disconnect();
        closePopovers();
        if (dialog.open) dialog.close();
        this.insertBefore(sidebar, main);
        for (const name of ['ready', 'mobile', 'rail', 'can-rail']) this.removeAttribute(`data-m-sidebar-${name}`);
        triggers.forEach((b, i) => originalExpanded[i] === null ? b.removeAttribute('aria-expanded') : b.setAttribute('aria-expanded', originalExpanded[i]));
      };
      this.setAttribute('data-m-sidebar-ready', '');
      measure();
    });
  }

  disconnectedCallback() {
    this.#cleanup?.();
    this.#cleanup = this.#actions = this.#refresh = undefined;
  }
}

if (!customElements.get('m-sidebar-layout')) customElements.define('m-sidebar-layout', MSidebarLayout);
