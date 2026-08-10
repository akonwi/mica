/* Type declarations for mica/field.js — side-effect module.
 * Registers <m-field>: declarative validation errors via <m-error match>.
 */
declare global {
  interface HTMLElementTagNameMap {
    "m-field": HTMLElement;
    "m-error": HTMLElement;
  }
}
export {};
