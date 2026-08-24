/* mica/tabs.js — <m-tabs>: accessible tabs. JS-enhanced module.
 *
 * Enhances working light-DOM markup; never renders it. Without this
 * module, the nav buttons are inert and every panel is visible in
 * order — complete, readable content. With it: real tablist semantics,
 * roving tabindex, arrow-key navigation, automatic activation, and
 * selected-tab reveal with position-aware overflow markers.
 *
 *   <m-tabs>
 *     <nav>
 *       <button>Account</button>
 *       <button selected>Password</button>   <!-- optional initial -->
 *     </nav>
 *     <section>…account panel…</section>
 *     <section>…password panel…</section>
 *   </m-tabs>
 *
 * Buttons pair with panels positionally, or explicitly via
 * aria-controls="panel-id".
 */

let uid = 0;

class MTabs extends HTMLElement {
  #tabs = [];
  #panels = [];
  #nav = null;
  #overflowing = false;
  #resizeObserver = null;
  #revealFrame = null;
  #onScroll = () => this.#syncOverflow();
  #cancelReveal = () => {
    if (this.#revealFrame !== null) cancelAnimationFrame(this.#revealFrame);
    this.#revealFrame = null;
  };
  #onClick = (event) => {
    const tab = event.target instanceof Element ? event.target.closest("button") : null;
    const index = this.#tabs.indexOf(tab);
    if (index === -1) return;
    this.select(index);
    this.#reveal(index);
  };
  #onKeyDown = (event) => {
    const n = this.#tabs.length;
    const current = this.#tabs.findIndex(
      (tab) => tab.getAttribute("aria-selected") === "true",
    );
    let next = null;
    if (event.key === "ArrowRight") next = (current + 1) % n;
    else if (event.key === "ArrowLeft") next = (current - 1 + n) % n;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    if (next === null) return;
    event.preventDefault();
    this.select(next); // automatic activation, radix-style
    this.#tabs[next].focus({ preventScroll: true });
    this.#reveal(next);
  };

  connectedCallback() {
    const nav = this.querySelector(":scope > nav");
    if (!nav) return;
    this.#nav = nav;
    this.#tabs = [...nav.querySelectorAll("button")];
    const sections = [...this.querySelectorAll(":scope > section")];
    this.#panels = this.#tabs.map((b, i) => {
      const id = b.getAttribute("aria-controls");
      return id ? this.querySelector(`#${CSS.escape(id)}`) : sections[i];
    });

    nav.setAttribute("role", "tablist");
    this.#tabs.forEach((tab, i) => {
      tab.setAttribute("role", "tab");
      tab.id ||= `m-tab-${++uid}`;
      const panel = this.#panels[i];
      if (panel) {
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", tab.id);
        panel.tabIndex = 0;
      }
    });

    nav.addEventListener("click", this.#onClick);
    nav.addEventListener("keydown", this.#onKeyDown);
    nav.addEventListener("pointerdown", this.#cancelReveal, { passive: true });
    nav.addEventListener("wheel", this.#cancelReveal, { passive: true });

    const initial = this.#tabs.findIndex(
      (t) => t.hasAttribute("selected") || t.getAttribute("aria-selected") === "true",
    );
    this.select(initial === -1 ? 0 : initial);

    nav.addEventListener("scroll", this.#onScroll, { passive: true });
    this.#resizeObserver = new ResizeObserver(() => this.#measureOverflow());
    this.#resizeObserver.observe(nav);
    this.#tabs.forEach((tab) => this.#resizeObserver.observe(tab));
    this.#measureOverflow();
  }

  disconnectedCallback() {
    this.#nav?.removeEventListener("click", this.#onClick);
    this.#nav?.removeEventListener("keydown", this.#onKeyDown);
    this.#nav?.removeEventListener("pointerdown", this.#cancelReveal);
    this.#nav?.removeEventListener("wheel", this.#cancelReveal);
    this.#nav?.removeEventListener("scroll", this.#onScroll);
    this.#resizeObserver?.disconnect();
    this.#cancelReveal();
    for (const property of [
      "--m-tabs-overflow-start-gutter",
      "--m-tabs-overflow-end-gutter",
      "--m-tabs-overflow-start",
      "--m-tabs-overflow-end",
    ]) this.#nav?.style.removeProperty(property);
    this.#nav = null;
    this.#resizeObserver = null;
  }

  #measureOverflow() {
    const nav = this.#nav;
    if (!nav) return;
    const style = getComputedStyle(nav);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const padding = (Number.parseFloat(style.paddingInlineStart) || 0) +
      (Number.parseFloat(style.paddingInlineEnd) || 0);
    const tabsWidth = this.#tabs.reduce(
      (width, tab) => width + tab.getBoundingClientRect().width,
      padding + gap * Math.max(0, this.#tabs.length - 1),
    );
    this.#overflowing = tabsWidth > nav.clientWidth + 1;
    this.#syncOverflow();
  }

  #syncOverflow() {
    const nav = this.#nav;
    if (!nav) return;
    const offset = Math.abs(nav.scrollLeft);
    const max = nav.scrollWidth - nav.clientWidth;
    const start = this.#overflowing && offset > 1;
    const end = this.#overflowing && offset < max - 1;
    nav.style.setProperty("--m-tabs-overflow-start", String(start ? 1 : 0));
    nav.style.setProperty("--m-tabs-overflow-end", String(end ? 1 : 0));
    nav.style.setProperty(
      "--m-tabs-overflow-start-gutter",
      start ? "var(--space-md)" : "0px",
    );
    nav.style.setProperty(
      "--m-tabs-overflow-end-gutter",
      end ? "var(--space-md)" : "0px",
    );
  }

  #reveal(index) {
    const nav = this.#nav;
    if (!nav || !this.#tabs[index]) return;
    this.#cancelReveal();
    const durations = getComputedStyle(nav, "::before").transitionDuration.split(",");
    const duration = durations.reduce((longest, value) => {
      const time = Number.parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
      return Math.max(longest, time);
    }, 0);
    // Follow the moving gutters through their transition, plus two frames
    // for the scroll event that activates the newly exposed marker.
    const settleAt = performance.now() + duration + 34;
    let firstFrame = true;
    const reveal = (now) => {
      const nav = this.#nav;
      const tab = this.#tabs[index];
      if (!nav || !tab) return;
      const navRect = nav.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const beforeStyle = getComputedStyle(nav, "::before");
      const afterStyle = getComputedStyle(nav, "::after");
      const before = Math.max(0,
        (Number.parseFloat(beforeStyle.inlineSize) || 0) +
        (Number.parseFloat(beforeStyle.marginInlineEnd) || 0));
      const after = Math.max(0,
        (Number.parseFloat(afterStyle.inlineSize) || 0) +
        (Number.parseFloat(afterStyle.marginInlineStart) || 0));
      const rtl = getComputedStyle(nav).direction === "rtl";
      const left = navRect.left + (rtl ? after : before);
      const right = navRect.right - (rtl ? before : after);
      if (tabRect.left < left) nav.scrollBy({ left: tabRect.left - left });
      else if (tabRect.right > right) nav.scrollBy({ left: tabRect.right - right });
      if (firstFrame) {
        this.#syncOverflow();
        firstFrame = false;
      }
      if (now < settleAt) this.#revealFrame = requestAnimationFrame(reveal);
      else this.#revealFrame = null;
    };
    this.#revealFrame = requestAnimationFrame(reveal);
  }

  select(index) {
    this.#tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      this.#panels[i]?.toggleAttribute("hidden", !on);
    });
  }
}

if (!customElements.get("m-tabs")) customElements.define("m-tabs", MTabs);
