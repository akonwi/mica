export interface MSidebarLayoutElement extends HTMLElement {
  open(): void;
  close(): void;
  toggle(): void;
}
declare global {
  interface HTMLElementTagNameMap {
    "m-sidebar": HTMLElement;
    "m-sidebar-layout": MSidebarLayoutElement;
  }
}
