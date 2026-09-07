/* Type declarations for mica/combobox.js — side-effect module.
 * Registers <m-combobox>: filterable input + listbox over native markup.
 */
declare global {
  interface MComboboxChangeDetail { key: string; value: string; }
  interface HTMLElementEventMap { "m-on-change": CustomEvent<MComboboxChangeDetail>; }
  interface HTMLElementTagNameMap {
    "m-combobox": HTMLElement;
  }
}
export {};
