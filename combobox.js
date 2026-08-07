/* mica/combobox.js — <m-combobox>: filterable input + listbox. JS-enhanced module.
 *
 * The no-JS state is a native <datalist> — real autocomplete, fully
 * functional, just unstylable. The module upgrades it into the ARIA
 * combobox pattern: styled listbox, substring filtering, arrow-key
 * active-descendant navigation. Options come from the author's
 * datalist markup — the module presents them, it doesn't invent them.
 *
 *   <m-combobox>
 *     <input list="langs" placeholder="Language…" />
 *     <datalist id="langs">
 *       <option>Ard</option>
 *       <option>Go</option>
 *     </datalist>
 *   </m-combobox>
 */

let uid = 0;

class MCombobox extends HTMLElement {
  #input;
  #list;
  #options = [];
  #active = -1;

  connectedCallback() {
    this.#input = this.querySelector("input");
    const datalist = this.querySelector("datalist");
    if (!this.#input || !datalist) return;

    // disable the native popup; the module takes over
    this.#input.removeAttribute("list");
    this.#input.setAttribute("role", "combobox");
    this.#input.setAttribute("aria-expanded", "false");
    this.#input.setAttribute("aria-autocomplete", "list");
    this.#input.autocomplete = "off";

    const listId = `m-cb-${++uid}`;
    this.#list = document.createElement("div");
    this.#list.id = listId;
    this.#list.setAttribute("role", "listbox");
    this.#list.hidden = true;

    this.#options = [...datalist.options].map((o, i) => {
      const d = document.createElement("div");
      d.setAttribute("role", "option");
      d.id = `${listId}-${i}`;
      d.textContent = o.value || o.textContent;
      // pointerdown so the input never loses focus
      d.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.#choose(d);
      });
      // hover moves the highlight (cmdk behavior)
      d.addEventListener("pointerenter", () => {
        this.#setActive(this.#visible().indexOf(d));
      });
      this.#list.append(d);
      return d;
    });
    this.append(this.#list);
    this.#input.setAttribute("aria-controls", listId);

    this.#input.addEventListener("input", (e) => {
      // ignore our own dispatched events from #choose — they'd reopen
      if (e.isTrusted) this.#openAndFilter();
    });
    this.#input.addEventListener("keydown", (e) => this.#onKey(e));
    this.addEventListener("focusout", (e) => {
      if (!this.contains(e.relatedTarget)) this.#close();
    });
  }

  #visible() {
    return this.#options.filter((o) => !o.hidden);
  }

  #openAndFilter() {
    const q = this.#input.value.trim().toLowerCase();
    let any = false;
    for (const o of this.#options) {
      o.hidden = q !== "" && !o.textContent.toLowerCase().includes(q);
      if (!o.hidden) any = true;
    }
    this.#list.hidden = !any;
    this.#input.setAttribute("aria-expanded", String(any));
    // first match is pre-highlighted so Enter always has a target
    this.#setActive(any ? 0 : -1);
  }

  #close() {
    this.#list.hidden = true;
    this.#input.setAttribute("aria-expanded", "false");
    this.#setActive(-1);
  }

  #setActive(i) {
    const vis = this.#visible();
    this.#active = i;
    for (const o of this.#options) o.setAttribute("aria-selected", "false");
    if (i >= 0 && vis[i]) {
      vis[i].setAttribute("aria-selected", "true");
      vis[i].scrollIntoView({ block: "nearest" });
      this.#input.setAttribute("aria-activedescendant", vis[i].id);
    } else {
      this.#input.removeAttribute("aria-activedescendant");
    }
  }

  #onKey(e) {
    const vis = this.#visible();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.#list.hidden) this.#openAndFilter();
      if (this.#visible().length) this.#setActive((this.#active + 1) % this.#visible().length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (vis.length) this.#setActive((this.#active - 1 + vis.length) % vis.length);
    } else if (e.key === "Enter") {
      if (this.#active >= 0 && !this.#list.hidden) {
        e.preventDefault();
        this.#choose(vis[this.#active]);
      }
    } else if (e.key === "Escape") {
      this.#close();
    }
  }

  #choose(option) {
    this.#input.value = option.textContent;
    this.#close();
    this.#input.dispatchEvent(new Event("input", { bubbles: true }));
    this.#input.dispatchEvent(new Event("change", { bubbles: true }));
    this.#input.focus();
  }
}

if (!customElements.get("m-combobox")) customElements.define("m-combobox", MCombobox);
