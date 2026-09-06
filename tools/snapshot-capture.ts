import type { Locator } from "playwright";

/** Keep long-page layout changes from changing the rasterization phase.
 * Preserve the specimen's size, inherited styles, and existing transform.
 * Only its capture position changes; restore inline styles even on failure.
 */
export async function captureVisual(locator: Locator): Promise<Buffer> {
  await locator.evaluate(async (element) => {
    await document.fonts.ready;
    const images = element instanceof HTMLImageElement
      ? [element] : [...element.querySelectorAll("img")];
    await Promise.all(images.map((image) => image.decode().catch(() => {})));
  });
  await locator.scrollIntoViewIfNeeded();
  // Allow the preset's tiny reduced-motion transitions (including restoration
  // from a previous crop) to finish before reading the geometry/transform.
  await locator.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const original = await locator.getAttribute("style");
  try {
    await locator.evaluate((element) => {
      const el = element as HTMLElement;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.position !== "static" && style.position !== "relative")
        throw new Error("Visual probes must be in normal flow for pixel alignment");
      const left = style.position === "relative"
        ? (style.left !== "auto" ? parseFloat(style.left) : -(parseFloat(style.right) || 0)) : 0;
      const top = style.position === "relative"
        ? (style.top !== "auto" ? parseFloat(style.top) : -(parseFloat(style.bottom) || 0)) : 0;
      el.style.setProperty("transition", "none", "important");
      // Relative offsets move layout paint; transforms can merely composite an
      // already fractionally rasterized native control onto an integer crop.
      el.style.setProperty("position", "relative", "important");
      el.style.setProperty("left", `${left + Math.round(rect.x) - rect.x}px`, "important");
      el.style.setProperty("top", `${top + Math.round(rect.y) - rect.y}px`, "important");
      el.style.setProperty("right", "auto", "important");
      el.style.setProperty("bottom", "auto", "important");
    });
    let previous = await locator.screenshot({ animations: "disabled" });
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await locator.screenshot({ animations: "disabled" });
      if (previous.equals(current)) return current;
      previous = current;
    }
    throw new Error(`Visual capture did not settle: ${locator}`);
  } finally {
    await locator.evaluate((element, style) => {
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    }, original);
  }
}
