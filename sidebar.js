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
      const originalToggleHints = new Map();
      let blocked = false;
      let warned = new Set();
      const originalExpanded = triggers.map(b => b.getAttribute('aria-expanded'));
      const controller = new AbortController();
      const { signal } = controller;
      let mobile = false;
      const cookieName = `mica-sidebar-${encodeURIComponent(sidebar.id)}`;
      const persists = () => this.getAttribute('persist') !== 'false';
      let rail = false;
      if (persists()) {
        try { rail = document.cookie.split(';').some(part => part.trim() === `${cookieName}=collapsed`); }
        catch { /* Storage restrictions must not prevent enhancement. */ }
      }
      const saveRail = () => {
        if (!persists()) return;
        try {
          document.cookie = `${cookieName}=${rail ? 'collapsed' : 'expanded'}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        } catch { /* The sidebar still works when cookies are unavailable. */ }
      };
      let canRail = false;
      let opener = triggers[0];
      const focusable = 'a[href],button:not(:disabled),summary';
      const closePopovers = () => sidebar.querySelectorAll('[popover]:popover-open').forEach(p => p.hidePopover());
      const update = () => {
        this.toggleAttribute('data-m-sidebar-mobile', mobile);
        this.toggleAttribute('data-m-sidebar-rail', rail && canRail && !mobile);
        this.toggleAttribute('data-m-sidebar-can-rail', canRail && !mobile);
        this.toggleAttribute('data-m-sidebar-collapse-blocked', blocked && !mobile);
        triggers.forEach(button => {
          button.setAttribute('aria-expanded', String(mobile ? dialog.open : !(rail && canRail)));
          if (blocked && !mobile) {
            if (!originalToggleHints.has(button)) originalToggleHints.set(button, ['aria-disabled', 'title'].map(name => [name, button.getAttribute(name)]));
            button.setAttribute('aria-disabled', 'true');
            button.title = 'Sidebar collapse is unavailable: each item needs a named icon or avatar.';
          } else if (originalToggleHints.has(button)) {
            for (const [name, value] of originalToggleHints.get(button)) {
              if (value === null) button.removeAttribute(name);
              else button.setAttribute(name, value);
            }
            originalToggleHints.delete(button);
          }
        });
      };
      const setRail = value => {
        closePopovers();
        const active = document.activeElement;
        const previous = rail;
        rail = value && canRail;
        if (canRail && rail !== previous) saveRail();
        update();
        if (sidebar.contains(active) && active instanceof HTMLElement && !active.getClientRects().length) triggers[0].focus();
      };
      const open = () => {
        if (mobile) {
          if (!dialog.open) {
            // Start at the named dialog, not the first navigation action.
            // Preserve an explicitly authored autofocus target.
            const focusContainer = !dialog.hasAttribute('autofocus') && !sidebar.querySelector('[autofocus]');
            if (focusContainer) dialog.setAttribute('autofocus', '');
            try {
              dialog.showModal();
              // Some engines still choose a descendant during showModal().
              if (focusContainer) dialog.focus({ preventScroll: true });
            }
            finally { if (focusContainer) dialog.removeAttribute('autofocus'); }
          }
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
      const toggle = () => blocked && !mobile ? undefined : mobile ? (dialog.open ? close() : open()) : setRail(!rail);
      const measure = () => {
        const active = document.activeElement;
        const requested = this.getAttribute('collapse') === 'icon';
        const items = [...sidebar.querySelectorAll('[data-sidebar-item]')].filter(e => !e.closest('[data-sidebar-subnav], [popover]'));
        const invalid = requested ? items.filter(item => {
          const visual = [...item.querySelectorAll('[data-sidebar-icon], m-avatar')].some(el =>
            !el.closest('[data-sidebar-label], [data-sidebar-badge], [data-sidebar-subnav], h2'));
          const named = item.getAttribute('aria-label')?.trim() ||
            item.getAttribute('aria-labelledby')?.trim().split(/\s+/).some(id => document.getElementById(id)?.textContent?.trim());
          return !visual || !named;
        }) : [];
        canRail = requested && items.length > 0 && invalid.length === 0;
        blocked = requested && !canRail;
        if (blocked) rail = false;
        for (const item of invalid) {
          if (!warned.has(item)) console.warn('[mica sidebar] Icon collapse unavailable. Give this item a [data-sidebar-icon] or m-avatar outside its hidden label, and a nonempty aria-label or aria-labelledby referencing label text. Keeping the sidebar expanded.', item);
        }
        if (blocked && !items.length && !warned.has(sidebar)) console.warn('[mica sidebar] Icon collapse unavailable: no [data-sidebar-item] elements found. Keeping the sidebar expanded.', sidebar);
        warned = new Set(invalid.length ? invalid : blocked ? [sidebar] : []);
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
      const anatomyObserver = new MutationObserver(measure);
      anatomyObserver.observe(sidebar, { subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['data-sidebar-item', 'data-sidebar-icon', 'data-sidebar-label', 'data-sidebar-badge', 'aria-label', 'aria-labelledby', 'id'] });
      window.addEventListener('resize', measure, { signal, passive: true });
      this.#actions = { open, close, toggle };
      this.#refresh = measure;
      this.#cleanup = () => {
        controller.abort();
        observer.disconnect();
        anatomyObserver.disconnect();
        closePopovers();
        if (dialog.open) dialog.close();
        this.insertBefore(sidebar, main);
        for (const name of ['ready', 'mobile', 'rail', 'can-rail', 'collapse-blocked']) this.removeAttribute(`data-m-sidebar-${name}`);
        for (const [button, attributes] of originalToggleHints) {
          for (const [name, value] of attributes) {
            if (value === null) button.removeAttribute(name); else button.setAttribute(name, value);
          }
        }
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
