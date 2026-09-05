/* Optional enhancement for authored breadcrumb ancestor disclosures.
 * Native details works without this module. No content or roles are generated. */
class MBreadcrumbOverflow extends HTMLElement {
  #cleanup;
  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected || this.#cleanup) return;
      const details = this.querySelector(':scope > details');
      const summary = details?.firstElementChild;
      const menu = details?.querySelector(':scope > [data-breadcrumb-menu]');
      if (!summary?.matches('summary') || !menu || !this.closest('nav[data-breadcrumbs]')) return;
      const controller = new AbortController();
      const { signal } = controller;
      let frame = 0;
      const close = () => { details.open = false; };
      const position = () => {
        frame = 0;
        if (!details.open) return;
        const r = summary.getBoundingClientRect();
        const v = window.visualViewport;
        const left = v?.offsetLeft ?? 0, top = v?.offsetTop ?? 0;
        const width = v?.width ?? document.documentElement.clientWidth, height = v?.height ?? innerHeight;
        const css = getComputedStyle(menu);
        const gutter = parseFloat(css.paddingLeft) || 8;
        const gap = parseFloat(css.marginTop) || 0;
        const w = menu.getBoundingClientRect().width;
        const start = getComputedStyle(this).direction === 'rtl' ? r.right - w : r.left;
        const below = Math.max(0, top + height - r.bottom - gap - gutter);
        const above = Math.max(0, r.top - top - gap - gutter);
        const desired = menu.scrollHeight + 2 * (parseFloat(css.borderTopWidth) || 0);
        const flip = below < Math.min(desired, above);
        menu.style.setProperty('--m-breadcrumb-left', `${Math.max(left + gutter, Math.min(start, left + width - w - gutter))}px`);
        menu.style.setProperty('--m-breadcrumb-height', `${flip ? above : below}px`);
        menu.style.setProperty('--m-breadcrumb-top', `${flip ? r.top - Math.min(desired, above) - 2 * gap : r.bottom}px`);
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(position); };
      details.addEventListener('toggle', schedule, { signal });
      details.addEventListener('keydown', event => {
        if (event.key === 'Escape' && details.open) {
          event.preventDefault(); event.stopPropagation(); close(); summary.focus();
        }
      }, { signal });
      document.addEventListener('click', event => { if (!this.contains(event.target)) close(); }, { signal });
      details.addEventListener('focusout', event => {
        if (event.relatedTarget) { if (!this.contains(event.relatedTarget)) close(); }
        else requestAnimationFrame(() => { if (!signal.aborted && !this.contains(document.activeElement)) close(); });
      }, { signal });
      menu.addEventListener('click', event => {
        if (!event.target.closest('a[href]') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        queueMicrotask(() => {
          if (event.defaultPrevented) return;
          const focused = menu.contains(document.activeElement);
          close();
          if (focused) summary.focus();
        });
      }, { signal });
      window.addEventListener('resize', schedule, { signal, passive: true });
      window.addEventListener('scroll', schedule, { signal, passive: true, capture: true });
      window.visualViewport?.addEventListener('resize', schedule, { signal });
      window.visualViewport?.addEventListener('scroll', schedule, { signal });
      const observer = new ResizeObserver(schedule);
      observer.observe(menu); observer.observe(summary);
      this.setAttribute('data-m-breadcrumb-ready', '');
      schedule();
      this.#cleanup = () => {
        controller.abort(); observer.disconnect(); cancelAnimationFrame(frame); close();
        this.removeAttribute('data-m-breadcrumb-ready');
        for (const name of ['left', 'top', 'height']) menu.style.removeProperty(`--m-breadcrumb-${name}`);
      };
    });
  }
  disconnectedCallback() { this.#cleanup?.(); this.#cleanup = undefined; }
}
if (!customElements.get('m-breadcrumb-overflow')) customElements.define('m-breadcrumb-overflow', MBreadcrumbOverflow);
