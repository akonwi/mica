// Measure rendered boxes and computed styles in Chromium and WebKit, light
// and dark. Use it to check code against a Paper spec.
//
//   bun .agents/skills/mica-design/scripts/measure.ts <url> <selector>... \
//     [--props padding-left,line-height,background-color] [--width 1200]
//
// <url> is usually a served page (bun run docs:serve, port 8471), e.g.
// http://localhost:8471/docs/button.html. Each selector reports every
// match: box size and position, plus the requested computed properties.
// Non-local requests are blocked so remote resources can't hang the page.
import { chromium, webkit } from "playwright";

const args = process.argv.slice(2);
let props: string[] = [];
let width = 1200;
const rest: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--props") props = args[++i].split(",");
  else if (args[i] === "--width") width = Number(args[++i]);
  else rest.push(args[i]);
}
const [url, ...selectors] = rest;
if (!url || !selectors.length) {
  console.error("usage: measure.ts <url> <selector>... [--props a,b] [--width n]");
  process.exit(1);
}

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]] as const) {
  const browser = await engine.launch();
  for (const scheme of ["light", "dark"] as const) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme });
    await page.route("**/*", (r) => {
      const host = new URL(r.request().url()).hostname;
      return ["localhost", "127.0.0.1", ""].includes(host) ? r.continue() : r.abort();
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    console.log(`\n${name} · ${scheme} · ${width}px`);
    for (const sel of selectors) {
      const rows = await page.$$eval(sel, (els, props) => els.map((el) => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        const p = props.map((k) => `${k}: ${cs.getPropertyValue(k)}`).join("; ");
        return `${+r.width.toFixed(2)}×${+r.height.toFixed(2)} @ ${+r.left.toFixed(2)},${+r.top.toFixed(2)}${p ? "  " + p : ""}`;
      }), props);
      console.log(`  ${sel}${rows.length ? "" : "  (no match)"}`);
      rows.forEach((r, i) => console.log(`    [${i}] ${r}`));
    }
    await page.close();
  }
  await browser.close();
}
