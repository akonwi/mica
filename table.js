/** Optional overflow indicators. Authored rows, selection, sorting, and paging
 * remain application-owned. The native scroll region works without this module. */
class MicaTableScroll extends HTMLElement {
  connectedCallback() {
    this._abort?.abort();
    this._resize?.disconnect();
    this._mutation?.disconnect();
    this._abort = new AbortController();
    this._update = () => {
      cancelAnimationFrame(this._frame);
      this._frame = requestAnimationFrame(() => this._measure());
    };
    this.addEventListener('scroll', this._update, { capture: true, passive: true, signal: this._abort.signal });
    window.addEventListener('resize', this._update, { signal: this._abort.signal });
    this._resize = new ResizeObserver(this._update);
    this._observe = () => {
      this._resize.disconnect();
      this._resize.observe(this);
      const region = this.querySelector(':scope > [data-table-region]');
      if (region) this._resize.observe(region);
      const table = region?.querySelector('table');
      if (table) this._resize.observe(table);
      this._update();
    };
    this._mutation = new MutationObserver(this._observe);
    this._mutation.observe(this, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'data-state', 'dir'] });
    this._observe();
  }
  _measure() {
    const region = this.querySelector(':scope > [data-table-region]');
    const table = region?.querySelector('table');
    if (!region || !table) return;
    const r = region.getBoundingClientRect(), t = table.getBoundingClientRect();
    const overflow = !region.hasAttribute('data-state') && region.scrollWidth > region.clientWidth + 1;
    this.toggleAttribute('data-m-overflow-left', overflow && t.left < r.left - 1);
    this.toggleAttribute('data-m-overflow-right', overflow && t.right > r.right + 1);
    let left = 0, right = 0;
    const rtl = getComputedStyle(region).direction === 'rtl';
    for (const cell of table.querySelectorAll('thead [data-table-sticky]')) {
      if (getComputedStyle(cell).position !== 'sticky' || !cell.getClientRects().length) continue;
      const c = cell.getBoundingClientRect();
      if (rtl) right = Math.max(right, r.right - c.left);
      else left = Math.max(left, c.right - r.left);
    }
    this.style.setProperty('--m-table-edge-left', `${left}px`);
    this.style.setProperty('--m-table-edge-right', `${right}px`);
  }
  disconnectedCallback() {
    this._abort?.abort();
    this._resize?.disconnect();
    this._mutation?.disconnect();
    cancelAnimationFrame(this._frame);
    this.removeAttribute('data-m-overflow-left');
    this.removeAttribute('data-m-overflow-right');
    this.style.removeProperty('--m-table-edge-left');
    this.style.removeProperty('--m-table-edge-right');
  }
}
if (!customElements.get('m-table-scroll')) customElements.define('m-table-scroll', MicaTableScroll);
