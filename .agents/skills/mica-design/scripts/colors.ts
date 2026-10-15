// Resolve CSS color expressions against the real mica.css, in both schemes.
// Prints the computed value, sRGB hex, and (with --on) WCAG contrast.
//
//   bun .agents/skills/mica-design/scripts/colors.ts [--on <color>] <expr>...
//
// Each <expr> is any CSS color: a token (var(--color-danger)), a mix
// (color-mix(in oklab, var(--color-danger) 88%, var(--color-text))), a
// literal. --on is the foreground to test contrast against, also resolved
// per scheme (e.g. --on 'var(--color-on-danger)'). Run from the repo root.
import { chromium, webkit } from "playwright";
import { readFileSync } from "fs";

const args = process.argv.slice(2);
let on: string | undefined;
const exprs: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--on") on = args[++i];
  else exprs.push(args[i]);
}
if (!exprs.length) {
  console.error("usage: colors.ts [--on <color>] <css color expr>...");
  process.exit(1);
}
const css = readFileSync("mica.css", "utf8");
const all = on ? [...exprs, on] : exprs;
const html = (scheme: string) =>
  `<style>${css}</style><body style="color-scheme:${scheme}">` +
  all.map((e) => `<i style="display:block;width:2px;height:2px;background:${e}"></i>`).join("") +
  `<m-error></m-error>`;

const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return ((x + 0.05) / (y + 0.05)).toFixed(2);
};
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]] as const) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  for (const scheme of ["light", "dark"]) {
    await page.setContent(html(scheme));
    const out = await page.$$eval("i", (is) => is.map((i) => {
      const v = getComputedStyle(i).backgroundColor;
      const c = document.createElement("canvas"); c.width = c.height = 1;
      const x = c.getContext("2d")!; x.fillStyle = v; x.fillRect(0, 0, 1, 1);
      return { v, rgb: [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)] };
    }));
    const canary = await page.$eval("m-error", (e) => getComputedStyle(e).display);
    console.log(`\n${name} · ${scheme}${canary === "none" ? "" : "  !! parse canary failed: mica.css did not parse to the end"}`);
    const fg = on ? out[out.length - 1].rgb : undefined;
    exprs.forEach((e, i) => {
      const { v, rgb } = out[i];
      console.log(`  ${e}\n    ${v}  ${hex(rgb)}${fg ? `  contrast ${ratio(rgb, fg)}:1` : ""}`);
    });
  }
  await browser.close();
}
