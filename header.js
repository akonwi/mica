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
      if (!nav || !button || !nav.id ||
          button.getAttribute('popovertarget') !== nav.id ||
          !('showPopover' in nav) || nav.hasAttribute('popover')) return;

      const controller = new AbortController();
      const { signal } = controller;
      let frame = 0;
      const close = () => { if (nav.matches(':popover-open')) nav.hidePopover(); };
      const position = () => {
        frame = 0;
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
        nav.style.setProperty('--m-header-menu-height', `${height}px`);
        const desired = nav.scrollHeight + 2 * (parseFloat(getComputedStyle(nav).borderTopWidth) || 0);
        const below = Math.max(0, top + height - r.bottom - 2 * gutter);
        const above = Math.max(0, r.top - top - 2 * gutter);
        const flip = below < Math.min(desired, above);
        const menuHeight = Math.min(desired, flip ? above : below);
        nav.style.setProperty('--m-header-menu-height', `${menuHeight}px`);
        nav.style.setProperty('--m-header-menu-top', `${flip ? Math.max(top + gutter, r.top - gutter - menuHeight) : Math.max(top + gutter, r.bottom + gutter)}px`);
      };
      const schedule = () => {
        if (nav.matches(':popover-open') && !frame) frame = requestAnimationFrame(position);
      };
      const measure = () => {
        const collapsed = getComputedStyle(button).getPropertyValue('--m-header-collapse').trim() === '1';
        if (collapsed !== this.hasAttribute('data-m-header-collapsed')) {
          const active = document.activeElement;
          const hidingFocus = collapsed && (nav.contains(active) || this.querySelector(':scope > [data-actions]')?.contains(active));
          const triggerFocus = !collapsed && active === button;
          close();
          if (collapsed) nav.setAttribute('popover', 'auto');
          else nav.removeAttribute('popover');
          this.toggleAttribute('data-m-header-collapsed', collapsed);
          if (hidingFocus) button.focus();
          else if (!collapsed && nav.contains(active)) active.focus();
          else if (triggerFocus) nav.querySelector('a[href]')?.focus();
        }
        schedule();
      };
      // beforetoggle fires while the popover is still hidden. Measuring in
      // toggle gives actual link geometry, before the next paint.
      nav.addEventListener('toggle', () => { if (nav.matches(':popover-open')) position(); }, { signal });
      nav.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (link && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) close();
      }, { signal });
      window.addEventListener('scroll', schedule, { signal, capture: true, passive: true });
      window.addEventListener('resize', measure, { signal, passive: true });
      window.visualViewport?.addEventListener('resize', schedule, { signal, passive: true });
      window.visualViewport?.addEventListener('scroll', schedule, { signal, passive: true });
      const observer = new ResizeObserver(measure);
      observer.observe(this);
      this.#cleanup = () => {
        controller.abort();
        observer.disconnect();
        cancelAnimationFrame(frame);
        close();
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
