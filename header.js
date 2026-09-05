/* Optional responsive enhancement for <m-header>.
 * Authored nav stays inline without this module. At narrow container widths,
 * the same nav becomes a native popover invoked by button[data-menu].
 * No generated links, routing, shared runtime, or menu keyboard emulation.
 */
class MHeader extends HTMLElement {
  #cleanup;

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected || this.#cleanup) return;
      const nav = this.querySelector(':scope > nav');
      const button = this.querySelector(':scope > button[data-menu]');
      if (!nav || nav.hasAttribute('popover')) return;
      const canCollapse = Boolean(button && nav.id && button.getAttribute('popovertarget') === nav.id && 'showPopover' in nav);

      const controller = new AbortController();
      const { signal } = controller;
      let frame = 0;
      const groups = nav.hasAttribute('data-navigation-menu')
        ? [...nav.querySelectorAll(':scope > details')].filter(d => d.firstElementChild?.matches('summary') && d.querySelector(':scope > [data-nav-panel]'))
        : [];
      const closeGroups = () => { for (const group of groups) group.open = false; };
      const positionGroups = () => {
        if (this.hasAttribute('data-m-header-collapsed')) return;
        const viewport = window.visualViewport;
        const left = viewport?.offsetLeft ?? 0;
        const top = viewport?.offsetTop ?? 0;
        const width = viewport?.width ?? document.documentElement.clientWidth;
        const height = viewport?.height ?? innerHeight;
        for (const group of groups) {
          if (!group.open) continue;
          const panel = group.querySelector(':scope > [data-nav-panel]');
          const r = group.firstElementChild.getBoundingClientRect();
          // A computed length resolves rem/calc tokens to pixels, unlike reading
          // the raw custom property. Gap is inert on the block panel itself.
          const gap = Math.max(0, parseFloat(getComputedStyle(panel).rowGap) || 0);
          panel.style.setProperty('--m-nav-max-width', `${Math.max(0, width - 2 * gap)}px`);
          const panelWidth = panel.getBoundingClientRect().width;
          const start = getComputedStyle(nav).direction === 'rtl' ? r.right - panelWidth : r.left;
          panel.style.setProperty('--m-nav-left', `${Math.max(left + gap, Math.min(start, left + width - gap - panelWidth))}px`);
          const below = Math.max(0, top + height - r.bottom - 2 * gap);
          const above = Math.max(0, r.top - top - 2 * gap);
          const desired = panel.scrollHeight + 2 * (parseFloat(getComputedStyle(panel).borderTopWidth) || 0);
          const flip = below < Math.min(desired, above);
          panel.style.setProperty('--m-nav-height', `${flip ? above : below}px`);
          panel.style.setProperty('--m-nav-top', `${flip ? r.top - gap - Math.min(desired, above) : r.bottom + gap}px`);
        }
      };
      const close = () => { if (nav.matches(':popover-open')) nav.hidePopover(); };
      const position = () => {
        frame = 0;
        positionGroups();
        if (!nav.matches(':popover-open')) return;
        const r = this.getBoundingClientRect();
        const viewport = window.visualViewport;
        const left = viewport?.offsetLeft ?? 0;
        const top = viewport?.offsetTop ?? 0;
        const width = viewport?.width ?? document.documentElement.clientWidth;
        const height = viewport?.height ?? window.innerHeight;
        const gutter = parseFloat(getComputedStyle(nav).paddingTop) || 8;
        const available = Math.max(0, width - 2 * gutter);
        const menuWidth = Math.min(r.width, available);
        nav.style.setProperty('--m-header-menu-width', `${menuWidth}px`);
        nav.style.setProperty('--m-header-menu-left', `${Math.max(left + gutter, Math.min(r.left, left + width - gutter - menuWidth))}px`);
        // Measure the rendered links: labels may wrap, fonts may be enlarged,
        // and compact-only actions need not have the same height as links.
        // Measure content without expanding the scroll container: changing its
        // height during a scroll event resets scrollTop and strands lower links.
        const rows = [...nav.children].map(e => e.getBoundingClientRect()).filter(r => r.height);
        const css = getComputedStyle(nav);
        const desired = (rows.length ? Math.max(...rows.map(r => r.bottom)) - Math.min(...rows.map(r => r.top)) : 0)
          + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom)
          + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
        const below = Math.max(0, top + height - r.bottom - 2 * gutter);
        const above = Math.max(0, r.top - top - 2 * gutter);
        const flip = below < Math.min(desired, above);
        const menuHeight = Math.min(desired, flip ? above : below);
        nav.style.setProperty('--m-header-menu-height', `${menuHeight}px`);
        nav.style.setProperty('--m-header-menu-top', `${flip ? Math.max(top + gutter, r.top - gutter - menuHeight) : Math.max(top + gutter, r.bottom + gutter)}px`);
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(position);
      };
      const measure = () => {
        const collapsed = canCollapse && getComputedStyle(button).getPropertyValue('--m-header-collapse').trim() === '1';
        if (collapsed !== this.hasAttribute('data-m-header-collapsed')) {
          const active = document.activeElement;
          const hidingFocus = collapsed && (nav.contains(active) || this.querySelector(':scope > [data-actions]')?.contains(active));
          const triggerFocus = !collapsed && active === button;
          close();
          closeGroups();
          if (collapsed) nav.setAttribute('popover', 'auto');
          else nav.removeAttribute('popover');
          this.toggleAttribute('data-m-header-collapsed', collapsed);
          if (hidingFocus) button.focus();
          else if (!collapsed && nav.contains(active)) {
            const group = groups.find(d => d.contains(active));
            (group ? group.firstElementChild : active).focus();
          }
          else if (triggerFocus) nav.querySelector('a[href], summary')?.focus();
        }
        schedule();
      };
      // beforetoggle fires while the popover is still hidden. Measuring in
      // toggle gives actual link geometry, before the next paint.
      nav.addEventListener('toggle', event => { if (event.target !== nav) return; if (nav.matches(':popover-open')) position(); else closeGroups(); }, { signal });
      nav.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) queueMicrotask(() => { if (!event.defaultPrevented) { closeGroups(); close(); } });
      }, { signal });
      window.addEventListener('scroll', schedule, { signal, capture: true, passive: true });
      window.addEventListener('resize', measure, { signal, passive: true });
      window.visualViewport?.addEventListener('resize', schedule, { signal, passive: true });
      window.visualViewport?.addEventListener('scroll', schedule, { signal, passive: true });
      const observer = new ResizeObserver(measure);
      observer.observe(this);
      for (const group of groups) {
        group.addEventListener('toggle', () => {
          if (group.open) for (const other of groups) if (other !== group) other.open = false;
          schedule();
        }, { signal });
        observer.observe(group.querySelector(':scope > [data-nav-panel]'));
      }
      if (groups.length) {
        nav.setAttribute('data-m-navigation-ready', '');
        nav.addEventListener('keydown', event => {
          if (event.key !== 'Escape') return;
          const group = groups.find(d => d.open);
          if (!group) return;
          event.preventDefault();
          event.stopPropagation();
          group.open = false;
          group.firstElementChild.focus();
        }, { signal });
        document.addEventListener('click', event => {
          if (!nav.contains(event.target)) closeGroups();
        }, { signal });
        nav.addEventListener('focusout', event => {
          if (event.relatedTarget) {
            if (!nav.contains(event.relatedTarget)) closeGroups();
          } else requestAnimationFrame(() => {
            if (!signal.aborted && !nav.contains(document.activeElement)) closeGroups();
          });
        }, { signal });
      }
      this.#cleanup = () => {
        controller.abort();
        observer.disconnect();
        cancelAnimationFrame(frame);
        close();
        closeGroups();
        nav.removeAttribute('data-m-navigation-ready');
        for (const group of groups) {
          const panel = group.querySelector(':scope > [data-nav-panel]');
          for (const name of ['left', 'top', 'height', 'max-width']) panel.style.removeProperty(`--m-nav-${name}`);
        }
        nav.removeAttribute('popover');
        this.removeAttribute('data-m-header-collapsed');
        for (const name of ['width', 'left', 'height', 'top']) nav.style.removeProperty(`--m-header-menu-${name}`);
      };
      measure();
    });
  }

  disconnectedCallback() {
    this.#cleanup?.();
    this.#cleanup = undefined;
  }
}

if (!customElements.get('m-header')) customElements.define('m-header', MHeader);
