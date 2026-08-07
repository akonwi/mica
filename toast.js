/* mica/toast.js — toast stacking, auto-dismiss, and a spawn helper.
 * JS-enhanced module.
 *
 * Enhances the no-JS <m-toast> recipe (corner-pinned manual popovers).
 * Declared toasts keep working without this module — it adds:
 *
 * - stacking: open toasts stack upward; JS ships one number per toast
 *   (--m-toast-offset), CSS owns the geometry and the reflow motion
 * - auto-dismiss: `duration` attribute in ms (default 5000,
 *   "0" = sticky), paused while hovered
 * - toast(title, { description, variant, duration }): spawns the same
 *   recipe markup (`variant`: success, warning, or danger), shows it,
 *   and removes it after dismissal
 */

const GAP = 8;
const DEFAULT_DURATION = 5000;

const open = [];
const timers = new WeakMap();

const isToast = (el) =>
  el instanceof HTMLElement && el.matches("m-toast[popover]");

function restack() {
  let offset = 0;
  for (let i = open.length - 1; i >= 0; i--) {
    open[i].style.setProperty("--m-toast-offset", `${offset}px`);
    offset += open[i].getBoundingClientRect().height + GAP;
  }
}

function startTimer(el) {
  const duration = el.getAttribute("duration");
  const ms = duration !== null
    ? Number(duration)
    : DEFAULT_DURATION;
  if (!ms) return;
  timers.set(el, setTimeout(() => el.hidePopover(), ms));
}

function stopTimer(el) {
  clearTimeout(timers.get(el));
}

function attachHoverPause(el) {
  if (el.__mToastHover) return;
  el.__mToastHover = true;
  el.addEventListener("pointerenter", () => stopTimer(el));
  el.addEventListener("pointerleave", () => {
    if (el.matches(":popover-open")) startTimer(el);
  });
}

// toggle doesn't bubble; capture reaches the target anyway
document.addEventListener(
  "toggle",
  (e) => {
    const el = e.target;
    if (!isToast(el)) return;
    if (e.newState === "open") {
      open.push(el);
      attachHoverPause(el);
      startTimer(el);
    } else {
      const i = open.indexOf(el);
      if (i > -1) open.splice(i, 1);
      stopTimer(el);
      if (el.dataset.ephemeral !== undefined) el.remove();
    }
    restack();
  },
  true,
);

export function toast(title, { description = "", variant = "", duration } = {}) {
  const el = document.createElement("m-toast");
  el.popover = "manual";
  if (variant) el.setAttribute("variant", variant);
  el.setAttribute("role", "status");
  el.dataset.ephemeral = "";
  if (duration !== undefined) el.setAttribute("duration", String(duration));

  const x = document.createElement("button");
  x.className = "close";
  x.setAttribute("aria-label", "Dismiss");
  x.textContent = "\u2715";
  x.addEventListener("click", () => el.hidePopover());

  const b = document.createElement("b");
  b.textContent = title;

  el.append(x, b);
  if (description) {
    const s = document.createElement("span");
    s.textContent = description;
    el.append(s);
  }
  document.body.append(el);
  el.showPopover();
  return el;
}
