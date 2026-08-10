/* Type declarations for mica/toast.js.
 * Importing registers <m-toast> (queueing, auto-dismiss, restacking) and
 * exports the imperative spawner.
 */
export interface ToastOptions {
  description?: string;
  variant?: "success" | "warning" | "danger";
  /** Auto-dismiss delay in ms; string accepted as attribute passthrough. */
  duration?: number | string;
}
/** Create, show, and return an <m-toast> element. */
export function toast(title: string, options?: ToastOptions): HTMLElement;
declare global {
  interface HTMLElementTagNameMap {
    "m-toast": HTMLElement;
  }
}
