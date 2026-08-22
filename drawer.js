/* mica/drawer.js — JS-enhanced: swipe-to-dismiss and a managed scrim for
 * dialog[data-drawer] bottom sheets on small screens.
 *
 * Enhances working markup, never replaces it: without this module the
 * drawer opens/closes via buttons and Esc; with it, the mobile sheet
 * grows a grab handle (CSS keys off :root[data-drawer-gestures] — an
 * affordance may only appear when the behavior exists) and vaul-style
 * drag physics: the sheet follows a downward drag, resists upward,
 * and dismisses past 1/3 of its height or on a flick. A fixed visual
 * overlay replaces the CSS-only scrim so its dimming can follow the drag
 * and fade on iOS, where ::backdrop disappears immediately on close.
 *
 * Drag surface: the handle / header strip. Drag-from-content is
 * deliberately out of scope — it requires scroll-vs-drag heuristics
 * (vaul's hardest code) for little gain over a clear grab target.
 */

const SHEET = matchMedia("(max-width: 40rem)");
const CLOSE_DISTANCE = 1 / 3; // of sheet height
const CLOSE_VELOCITY = 0.6; // px/ms, downward flick
const DRAWER = "dialog[data-drawer]";

let overlay;
const dismissCleanup = new WeakMap();

const overlayElement = () => {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.setAttribute("data-mica-drawer-overlay", "");
  overlay.setAttribute("aria-hidden", "true");
  overlay.inert = true;
  overlay.style.setProperty("--m-drawer-overlay-opacity", "0");
  document.body.append(overlay);
  // Commit the transparent state before the first open transition.
  overlay.getBoundingClientRect();
  return overlay;
};

const setOverlayOpacity = (value) => {
  if (!overlay && value === 0) return;
  overlayElement().style.setProperty(
    "--m-drawer-overlay-opacity",
    String(Math.max(0, Math.min(1, value))),
  );
};

const syncOverlay = () => {
  const openDrawer = document.querySelector(`${DRAWER}[open]`);
  // iOS can drop the closed dialog before its translate transition runs,
  // so transitionend never clears the drag-dismiss inline style. Clear a
  // pending exit synchronously on reopen, before the next frame paints.
  if (openDrawer) dismissCleanup.get(openDrawer)?.();
  setOverlayOpacity(openDrawer ? 1 : 0);
};

new MutationObserver(syncOverlay).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["open"],
  subtree: true,
});

document.documentElement.setAttribute("data-drawer-gestures", "");
syncOverlay();

document.addEventListener("pointerdown", (down) => {
  if (!SHEET.matches) return;
  const dialog =
    down.target instanceof Element &&
    down.target.closest(`${DRAWER}[open]`);
  if (!dialog) return;
  if (down.target.closest("button, a, input, select, textarea")) return;

  // start only from the header or the top (handle) strip
  const rect = dialog.getBoundingClientRect();
  const inHeader = down.target.closest(`${DRAWER} > header`);
  if (!inHeader && down.clientY - rect.top > 32) return;

  let dy = 0;
  let lastY = down.clientY;
  let lastT = down.timeStamp;
  let velocity = 0;

  dialog.setPointerCapture(down.pointerId);
  const baseTransition = dialog.style.transition;
  const scrim = overlayElement();
  const baseOverlayTransition = scrim.style.transition;
  dialog.style.transition = "none";
  scrim.style.transition = "none";

  const move = (e) => {
    dy = e.clientY - down.clientY;
    velocity = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
    lastY = e.clientY;
    lastT = e.timeStamp;
    // follow downward; resist upward
    dialog.style.translate = `0 ${dy > 0 ? dy : dy / 4}px`;
    // Clear by half a sheet: a one-to-one distance mapping was too subtle
    // against dark surfaces (a quarter pull only moved alpha .4 → .3).
    setOverlayOpacity(1 - Math.max(0, dy) / (rect.height / 2));
  };

  const up = () => {
    dialog.removeEventListener("pointermove", move);
    dialog.removeEventListener("pointerup", up);
    dialog.removeEventListener("pointercancel", up);
    dialog.style.transition = baseTransition;
    scrim.style.transition = baseOverlayTransition;
    if (dy > rect.height * CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
      // continue the motion DOWNWARD off-screen. close() fires its exit
      // (scrim fade + display flip at the end via allow-discrete);
      // the inline translate overrides the small CSS exit offset so the
      // sheet keeps sliding down instead of snapping back up into view
      // (the flash). Clear it only at transitionend — display:none by
      // then, so clearing is invisible. iOS may never fire that event,
      // so a timeout clears it while closed and syncOverlay clears it if
      // the drawer reopens first.
      let cleanupTimer;
      const onTransitionEnd = (e) => {
        if (e.propertyName === "translate") clearDismiss();
      };
      const clearDismiss = () => {
        if (dismissCleanup.get(dialog) !== clearDismiss) return;
        clearTimeout(cleanupTimer);
        dialog.removeEventListener("transitionend", onTransitionEnd);
        dialog.style.translate = "";
        dismissCleanup.delete(dialog);
      };
      dismissCleanup.set(dialog, clearDismiss);
      dialog.addEventListener("transitionend", onTransitionEnd);
      cleanupTimer = setTimeout(() => {
        if (!dialog.open) clearDismiss();
      }, 200);
      setOverlayOpacity(0);
      requestAnimationFrame(() => { dialog.style.translate = "0 100dvh"; });
      dialog.close();
    } else {
      dialog.style.translate = ""; // spring back
      setOverlayOpacity(1);
    }
  };

  dialog.addEventListener("pointermove", move);
  dialog.addEventListener("pointerup", up);
  dialog.addEventListener("pointercancel", up);
});
