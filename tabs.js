/* mica/tabs.js — <m-tabs>: accessible tabs. Tier 2.
 *
 * Enhances working light-DOM markup; never renders it. Without this
 * module, the nav buttons are inert and every panel is visible in
 * order — complete, readable content. With it: real tablist semantics,
 * roving tabindex, arrow-key navigation, automatic activation.
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

  connectedCallback() {
    const nav = this.querySelector(":scope > nav");
    if (!nav) return;
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
      tab.addEventListener("click", () => this.select(i));
    });

    nav.addEventListener("keydown", (e) => {
      const n = this.#tabs.length;
      const current = this.#tabs.findIndex(
        (t) => t.getAttribute("aria-selected") === "true",
      );
      let next = null;
      if (e.key === "ArrowRight") next = (current + 1) % n;
      else if (e.key === "ArrowLeft") next = (current - 1 + n) % n;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      if (next === null) return;
      e.preventDefault();
      this.select(next); // automatic activation, radix-style
      this.#tabs[next].focus();
    });

    const initial = this.#tabs.findIndex(
      (t) => t.hasAttribute("selected") || t.getAttribute("aria-selected") === "true",
    );
    this.select(initial === -1 ? 0 : initial);
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
