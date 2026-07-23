/* mica/select.js — align the open select picker so the selected option
 * overlays the trigger (macOS-native / Base UI `alignItemWithTrigger`
 * behavior). Tier 2, and about as small as a module can be:
 *
 * JS supplies exactly one datum — the selected index, as a custom
 * property. All geometry lives in mica.css (anchor positioning).
 * Without this module, selects keep the anchored-below picker. Only
 * meaningful where `appearance: base-select` is supported.
 */

const ALIGNED = "picker-aligned";
const SELECTOR = "select:not([multiple]):not([size])";

function sync(select) {
  select.style.setProperty("--m-sel-index", select.selectedIndex);
  select.classList.add(ALIGNED);
}

if (CSS.supports("appearance", "base-select")) {
  for (const s of document.querySelectorAll(SELECTOR)) sync(s);
  document.addEventListener("change", (e) => {
    if (e.target.matches?.(SELECTOR)) sync(e.target);
  });
}
