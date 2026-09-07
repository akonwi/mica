declare global {
  interface HTMLElementTagNameMap {
    "m-menu": HTMLElement & { refresh(): void };
  }
}
export {};
