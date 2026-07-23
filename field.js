/* mica/field.js — <m-field>: declarative validation errors. Tier 2.
 *
 * Enhances working light-DOM markup; never renders it. Without this
 * module, fields inside <m-field> fall back to native bubbles plus the
 * CSS-only generic <m-error> (see mica.css).
 *
 *   <m-field>
 *     <label for="email">Email</label>
 *     <input id="email" type="email" required>
 *     <m-error match="value-missing">Email is required.</m-error>
 *     <m-error match="type-mismatch">Not a valid email.</m-error>
 *     <m-error></m-error>  <!-- catch-all; empty = browser's message -->
 *   </m-field>
 *
 * What the module does:
 * - preventDefault() on `invalid` — kills the browser bubble while the
 *   form still blocks bad submits
 * - focuses the first invalid field on a submit attempt (the browser
 *   normally does this; preventDefault suppresses it)
 * - mirrors ValidityState onto <m-field invalid="value-missing ...">
 * - activates the first <m-error> whose `match` applies, else the
 *   catch-all; empty catch-alls get the browser's validationMessage
 * - wires aria-invalid + aria-describedby to the active error
 */

const CAUSES = {
  "value-missing": "valueMissing",
  "type-mismatch": "typeMismatch",
  "pattern-mismatch": "patternMismatch",
  "too-long": "tooLong",
  "too-short": "tooShort",
  "range-underflow": "rangeUnderflow",
  "range-overflow": "rangeOverflow",
  "step-mismatch": "stepMismatch",
  "bad-input": "badInput",
  "custom-error": "customError",
};

class MField extends HTMLElement {
  #uid;

  connectedCallback() {
    this.addEventListener("invalid", this.#onInvalid, true);
    this.addEventListener("blur", this.#onBlur, true);
    this.addEventListener("input", this.#onInput);
  }

  get field() {
    return this.querySelector("input, textarea, select");
  }

  #onInvalid = (event) => {
    event.preventDefault();
    this.#update(true);
    // focus the first invalid field on a submit attempt (the browser
    // normally does this; preventDefault suppressed it). Checked
    // deterministically — invalid events fire per-field and flags
    // can't survive the interleaved microtask checkpoints.
    const form = event.target.form;
    const first = form?.querySelector(
      "input:invalid, select:invalid, textarea:invalid",
    );
    if (event.target === first) event.target.focus();
  };

  #onBlur = (event) => {
    if (event.target.matches?.(":user-invalid")) this.#update(true);
  };

  #onInput = () => {
    // once an error is showing, revalidate live so it clears on fix
    if (this.hasAttribute("invalid")) this.#update(true);
  };

  #update(show) {
    const field = this.field;
    if (!field) return;
    const errors = [...this.querySelectorAll("m-error")];

    if (field.validity.valid) {
      this.removeAttribute("invalid");
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      for (const el of errors) el.removeAttribute("active");
      return;
    }
    if (!show) return;

    const causes = Object.keys(CAUSES).filter((k) => field.validity[CAUSES[k]]);
    this.setAttribute("invalid", causes.join(" "));

    const active =
      errors.find((el) => causes.includes(el.getAttribute("match"))) ??
      errors.find((el) => !el.hasAttribute("match"));
    for (const el of errors) el.toggleAttribute("active", el === active);

    if (active) {
      if ("auto" in active.dataset || !active.textContent.trim()) {
        active.dataset.auto = "";
        active.textContent = field.validationMessage;
      }
      active.id ||=
        `m-error-${(this.#uid ??= Math.random().toString(36).slice(2, 8))}` +
        `-${errors.indexOf(active)}`;
      field.setAttribute("aria-describedby", active.id);
      field.setAttribute("aria-invalid", "true");
    }
  }
}

if (!customElements.get("m-field")) customElements.define("m-field", MField);
