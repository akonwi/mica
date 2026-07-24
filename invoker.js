/* mica/invoker.js — temporary shim for <button commandfor command>.
 *
 * Invoker commands are Baseline newly-available (Chrome 135+, Firefox
 * 144+, Safari/iOS 26.2+). Mica's dialog recipes use them; include this
 * shim until support is widely available. Where the browser handles
 * commands natively, this module installs nothing.
 *
 * Scope: the dialog commands mica's recipes use — show-modal and close.
 * (Popover recipes use popovertarget, which is already widely available.)
 * Note: in shimmed browsers a commandfor button inside a <form> would
 * still submit it — mica's recipes never place one there.
 */
if (!("commandForElement" in HTMLButtonElement.prototype)) {
  document.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element &&
      event.target.closest("button[commandfor][command]");
    if (!button || button.disabled) return;
    const dialog = document.getElementById(button.getAttribute("commandfor"));
    if (!(dialog instanceof HTMLDialogElement)) return;
    const command = button.getAttribute("command");
    if (command === "show-modal" && !dialog.open) dialog.showModal();
    else if (command === "close" && dialog.open) dialog.close();
  });
}
