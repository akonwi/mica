declare global {
  interface HTMLElementTagNameMap {
    'm-command-palette': HTMLElement & { refresh(): void };
  }
}
export {};
