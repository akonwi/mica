/* mica/drawer.js — JS-enhanced: swipe-to-dismiss for dialog[data-drawer]
 * bottom sheets on small screens.
 *
 * Enhances working markup, never replaces it: without this module the
 * drawer opens/closes via buttons and Esc; with it, the mobile sheet
 * grows a grab handle (CSS keys off :root[data-drawer-gestures] — an
 * affordance may only appear when the behavior exists) and vaul-style
 * drag physics: the sheet follows a downward drag, resists upward,
 * and dismisses past 1/3 of its height or on a flick.
 *
 * Drag surface: the handle / header strip. Drag-from-content is
 * deliberately out of scope — it requires scroll-vs-drag heuristics
 * (vaul's hardest code) for little gain over a clear grab target.
 */

const SHEET = matchMedia("(max-width: 40rem)");
const CLOSE_DISTANCE = 1 / 3; // of sheet height
const CLOSE_VELOCITY = 0.6; // px/ms, downward flick
const DRAWER = "dialog[data-drawer]";

document.documentElement.setAttribute("data-drawer-gestures", "");

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
  dialog.style.transition = "none";

  const move = (e) => {
    dy = e.clientY - down.clientY;
    velocity = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
    lastY = e.clientY;
    lastT = e.timeStamp;
    // follow downward; resist upward
    dialog.style.translate = `0 ${dy > 0 ? dy : dy / 4}px`;
  };

  const up = () => {
    dialog.removeEventListener("pointermove", move);
    dialog.removeEventListener("pointerup", up);
    dialog.removeEventListener("pointercancel", up);
    dialog.style.transition = baseTransition;
    if (dy > rect.height * CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
      // continue the motion DOWNWARD off-screen. close() fires its exit
      // (backdrop fade + display flip at the end via allow-discrete);
      // the inline translate overrides the small CSS exit offset so the
      // sheet keeps sliding down instead of snapping back up into view
      // (the flash). Clear it only at transitionend — display:none by
      // then, so clearing is invisible and the next open starts clean.
      dialog.addEventListener(
        "transitionend",
        (e) => { if (e.propertyName === "translate") dialog.style.translate = ""; },
        { once: true },
      );
      requestAnimationFrame(() => { dialog.style.translate = "0 100dvh"; });
      dialog.close();
    } else {
      dialog.style.translate = ""; // spring back
    }
  };

  dialog.addEventListener("pointermove", move);
  dialog.addEventListener("pointerup", up);
  dialog.addEventListener("pointercancel", up);
});
