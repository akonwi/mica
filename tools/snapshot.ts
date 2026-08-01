#!/usr/bin/env bun
/**
 * Computed-style snapshot tests for mica.
 *
 * Feedback-loop Channel 0 (the automated deterministic probes): loads
 * demo.html in headless Chromium, resolves every design token and a
 * curated set of computed styles in BOTH color schemes, and writes
 * tools/snapshots/demo.json.
 *
 * First run: bun install && bunx playwright install chromium webkit
 *
 *   bun tools/snapshot.ts           # (re)write the baseline ("bless")
 *   bun tools/snapshot.ts --check   # diff against baseline; exit 1 on drift
 *
 * The baseline is committed; `git diff` is the regression report. Pixels
 * are never compared — values are text (oklch strings, px), so a diff says
 * exactly what changed. Notes:
 *   - reduced-motion is emulated; under the preset's kill-switch EVERY
 *     element carries an `all 0.01ms` transition, so probes use a fresh
 *     element per read (a reused element reads stale mid-transition
 *     values, in oklab form).
 *   - the parse-error canary is a hard assert, not a snapshot entry.
 *   - baseline values can be font/platform-sensitive in places; the
 *     baseline is blessed on macOS — regenerate rather than hand-edit.
 */

import { chromium, webkit } from "playwright";
import { join, dirname } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const ROOT = dirname(import.meta.dir);
const BASELINE = join(import.meta.dir, "snapshots", "demo.json");

// ---------------------------------------------------------------- tokens
// Only declarations inside `@layer mica.tokens` are design tokens; custom
// properties elsewhere are scoped attribute-transport (--gap, --align…)
// that resolve to nothing on :root and are covered by element probes.
const css = await Bun.file(join(ROOT, "mica.css")).text();
function tokensLayer(source: string): string {
  const at = source.indexOf("@layer mica.tokens {");
  if (at < 0) throw new Error("mica.tokens layer not found");
  let depth = 0;
  for (let i = source.indexOf("{", at); i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(at, i);
  }
  throw new Error("unbalanced braces in mica.tokens layer");
}
const names = [...new Set(tokensLayer(css).match(/--[a-z][a-z0-9-]*(?=\s*:)/g) ?? [])].sort();

function kindOf(name: string): "raw" | "color" | "length" {
  if (name.endsWith("-hue") || name.endsWith("-chroma")) return "raw";
  if (name === "--hue" || name === "--chroma") return "raw";
  // --measure is 60ch: font-dependent when resolved to px — keep as text
  if (name === "--measure" || name === "--check-glyph") return "raw";
  if (name === "--focus-ring-color") return "color";
  if (/^--(color|neutral|accent|danger|success|warn)-/.test(name)) return "color";
  if (/^--(space|size|radius|control)-/.test(name)) return "length";
  if (name === "--focus-ring-width" || name === "--focus-ring-offset") return "length";
  return "raw";
}

const TOKENS: Record<string, string> = Object.fromEntries(
  names.map((n) => [n, kindOf(n)]),
);

// ------------------------------------------------------------- elements
// [name, selector, properties] — stable, meaningful, curated. A missing
// selector snapshots as "MISSING": demo restructuring shows up as a diff
// instead of silently shrinking coverage.
const PROBES: [string, string, string[]][] = [
  ["body", "body", ["background-color", "color", "font-family", "line-height"]],
  ["vstack", "m-vstack", ["display", "flex-direction", "row-gap", "align-items"]],
  ["hstack", "m-hstack", ["display", "align-items", "column-gap", "flex-wrap"]],
  ["hstack.wrap", "m-hstack[wrap]", ["flex-wrap"]],
  ["zstack", "m-zstack", ["display", "align-items", "justify-items"]],
  ["box", "m-box", ["padding-top"]],
  ["grid", "m-grid", ["display", "row-gap"]],
  ["sidecar", "m-sidecar", ["display", "flex-wrap", "column-gap"]],
  ["switcher", "m-switcher", ["display", "column-gap"]],
  ["reel", "m-reel", ["display", "overflow-x", "scroll-snap-type"]],
  ["frame.square", 'm-frame[ratio="square"]', ["aspect-ratio", "overflow"]],
  ["frame.img", "m-frame > img", ["object-fit"]],
  ["cover", "m-cover", ["display", "flex-direction", "padding-top", "row-gap"]],
  ["button", "button:not([class]):not([disabled])",
    ["background-color", "color", "border-top-color", "border-radius", "font-weight"]],
  ["button.primary", "button.primary", ["background-color", "color", "border-top-color"]],
  ["button.ghost", "button.ghost", ["background-color", "border-top-color"]],
  ["button.danger", "button.danger", ["background-color", "color"]],
  ["button.small", "button.small", ["font-size", "padding-left"]],
  ["input.text", 'input[type="text"]',
    ["background-color", "border-top-color", "font-size", "border-radius"]],
  ["textarea", "textarea", ["field-sizing", "background-color"]],
  ["checkbox", 'input[type="checkbox"]:not(.switch)',
    ["appearance", "inline-size", "block-size", "border-top-color", "border-radius"]],
  ["radio", 'input[type="radio"]', ["border-radius", "inline-size"]],
  ["switch", "input.switch", ["inline-size", "block-size", "border-radius"]],
  ["segmented", "m-segmented", ["display", "border-top-color", "border-radius"]],
  ["segmented.checked", "m-segmented label:has(input:checked)",
    ["background-color", "color", "font-weight"]],
  ["segmented.disabled", "m-segmented label:has(input:disabled)",
    ["color", "cursor", "opacity"]],
  ["badge", "m-badge:not([variant]):not([count])",
    ["display", "border-top-color", "color", "font-size", "border-radius"]],
  ["badge.primary", 'm-badge[variant="primary"]', ["background-color", "color", "border-top-color"]],
  ["badge.success", 'm-badge[variant="success"]', ["background-color", "color", "border-top-color"]],
  ["badge.warning", 'm-badge[variant="warning"]', ["background-color", "color", "border-top-color"]],
  ["badge.danger", 'm-badge[variant="danger"]', ["background-color", "color", "border-top-color"]],
  ["badge.count", "m-badge[count]", ["min-inline-size", "font-family"]],
  ["select", "select", ["appearance", "background-color", "border-top-color"]],
  ["progress", "progress", ["block-size", "inline-size"]],
  ["dialog", "dialog", ["background-color", "border-top-color", "border-radius"]],
  ["popover", "[popover]", ["background-color", "border-top-color"]],
  ["details", "details", ["border-top-color"]],
  ["link", "a[href]", ["color", "text-decoration-line"]],
  ["code", "code", ["font-family", "background-color"]],
  ["h1", "h1", ["margin-block-start", "margin-block-end", "line-height"]],
  ["table", "table", ["border-collapse"]],
  // checked-state grammar (static — demo has checked + unchecked instances)
  ["checkbox.checked", 'input[type="checkbox"]:not(.switch):checked',
    ["background-color", "border-top-color"]],
  ["radio.checked", 'input[type="radio"]:checked', ["background-color"]],
  ["switch.checked", "input.switch:checked", ["background-color"]],
];

// -------------------------------------------------------- state probes
// Interactive states the static manifest can't see: hover, focus ring,
// open dialog (+ ::backdrop), open popover. Driven with real Playwright
// interactions per scheme; results land under `states` in the baseline.
const HOVER_PROBES: [string, string, string[]][] = [
  ["button.hover", "button:not([class]):not([disabled])", ["background-color"]],
  ["button.primary.hover", "button.primary:not([disabled])", ["background-color"]],
  ["button.danger.hover", "button.danger:not([disabled])", ["background-color"]],
];

// -------------------------------------------------------- visual probes
// Pixels ONLY where computed styles lie (vendor pseudos, drawn glyphs).
// Small element crops: reviewable diffs, few-KB baselines. Everything
// else stays computed-style — see the Storybook assessment rationale.
// Crops run in BOTH engines (chromium + webkit): engines disagree about
// exactly this territory — the iOS check-glyph bug shipped because the
// visual channel was Chromium-only. WebKit baselines carry a `.webkit`
// suffix; the JSON probes stay Chromium-only (cross-engine computed-style
// serialization is noise, not signal).
const VISUAL_PROBES: [string, string][] = [
  ["progress", "progress"],
  ["meter", "meter"],
  ["select", "select"],
  ["checkbox.checked", 'input[type="checkbox"]:not(.switch):checked'],
  ["checkbox.unchecked", 'input[type="checkbox"]:not(.switch):not(:checked):not([disabled])'],
  ["radio.checked", 'input[type="radio"]:checked'],
  ["switch.checked", "input.switch:checked"],
  ["switch.unchecked", "input.switch:not(:checked):not([disabled])"],
];
const VISUAL_DIR = join(import.meta.dir, "snapshots", "visual");

// runs in the browser
function collectInPage([tokens, probes]: [Record<string, string>, [string, string, string[]][]]) {
  const out: any = { tokens: {}, elements: {} };
  // One FRESH element per token — see file header for why.
  for (const [name, kind] of Object.entries(tokens)) {
    if (kind === "raw") {
      out.tokens[name] = getComputedStyle(document.documentElement)
        .getPropertyValue(name).trim();
      continue;
    }
    const el = document.createElement("div");
    document.body.append(el);
    if (kind === "color") {
      el.style.color = `var(${name})`;
      out.tokens[name] = getComputedStyle(el).color;
    } else {
      el.style.width = `var(${name})`;
      out.tokens[name] = getComputedStyle(el).width;
    }
    el.remove();
  }
  for (const [name, selector, props] of probes) {
    const el = document.querySelector(selector);
    if (!el) { out.elements[name] = "MISSING"; continue; }
    const cs = getComputedStyle(el);
    out.elements[name] = Object.fromEntries(
      props.map((p) => [p, cs.getPropertyValue(p)]));
  }
  // parse-error canary: hard assert, not a snapshot entry
  const c = document.createElement("m-error");
  document.body.append(c);
  out.canary = getComputedStyle(c).display;
  c.remove();
  return out;
}

// --------------------------------------------------------------- server
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(join(ROOT, path === "/" ? "demo.html" : path.slice(1)));
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    return new Response(file, { headers: { "Cache-Control": "no-store" } });
  },
});

// --------------------------------------------------------------- collect
const url = `http://127.0.0.1:${server.port}/demo.html`;
const result: Record<string, unknown> = {};
const visuals = new Map<string, Uint8Array>();
let browser;
try {
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error("chromium launch failed — first run? bunx playwright install chromium");
    throw e;
  }
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2, // glyph fidelity in visual crops; CSS px unaffected
      colorScheme: scheme,
      reducedMotion: "reduce",
    });
    try {
      const page = await ctx.newPage();
      const resp = await page.goto(url, { waitUntil: "load" });
      if (!resp?.ok()) throw new Error(`demo.html: HTTP ${resp?.status()}`);
      const data = await page.evaluate(collectInPage, [TOKENS, PROBES] as any);
      if (data.canary !== "none")
        throw new Error("PARSE CANARY FAILED: mica.css did not parse to the end");
      delete data.canary;

      // ---- state probes (real interactions) ----
      const states: Record<string, unknown> = {};
      const probe = (sel: string, props: string[], pseudo?: string) =>
        page.evaluate(([s, ps, pe]: [string, string[], string?]) => {
          const el = document.querySelector(s);
          if (!el) return "MISSING";
          const cs = getComputedStyle(el, pe || undefined);
          return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
        }, [sel, props, pseudo] as any);

      for (const [name, sel, props] of HOVER_PROBES) {
        await page.hover(sel);
        await page.waitForTimeout(50); // let the 0.01ms reduced-motion transition finish
        states[name] = await probe(sel, props);
      }
      await page.mouse.move(0, 0);

      await page.evaluate(() =>
        (document.querySelector('input[type="text"]') as HTMLElement)?.focus());
      await page.waitForTimeout(50);
      states["input.focus-ring"] = await probe('input[type="text"]',
        ["outline-color", "outline-width", "outline-offset", "outline-style"]);
      await page.evaluate(() =>
        (document.querySelector("m-segmented input:checked") as HTMLElement)?.focus());
      await page.waitForTimeout(50);
      states["segmented.focus-ring"] = await probe(
        "m-segmented label:has(input:focus-visible)",
        ["outline-color", "outline-width", "outline-offset", "outline-style"]);
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

      await page.evaluate(() => document.querySelector("dialog")?.showModal());
      await page.waitForTimeout(50);
      states["dialog.open"] = await probe("dialog[open]",
        ["background-color", "border-top-color", "box-shadow"]);
      states["dialog.backdrop"] = await probe("dialog[open]",
        ["background-color"], "::backdrop");
      await page.evaluate(() => document.querySelector("dialog[open]")?.close());

      await page.evaluate(() =>
        (document.querySelector("[popover]") as any)?.showPopover());
      await page.waitForTimeout(50);
      states["popover.open"] = await probe("[popover]:popover-open",
        ["background-color", "border-top-color"]);
      await page.evaluate(() =>
        (document.querySelector("[popover]:popover-open") as any)?.hidePopover());

      (data as any).states = states;

      // ---- visual probes (element crops, PNG baselines) ----
      for (const [name, sel] of VISUAL_PROBES) {
        const shot = await page.locator(sel).first()
          .screenshot({ animations: "disabled" });
        visuals.set(`${name}.${scheme}`, shot);
      }

      // ---- axe pass (hard assert, not a snapshot) ----
      await page.addScriptTag({ path: join(ROOT, "node_modules/axe-core/axe.min.js") });
      const axe = await page.evaluate(async () => {
        const res = await (window as any).axe.run(document, {
          // no disabled rules yet; add here WITH justification if needed
        });
        return res.violations.map((v: any) => ({
          id: v.id, impact: v.impact,
          nodes: v.nodes.slice(0, 5).map((n: any) => n.target.join(" ")),
        }));
      });
      if (axe.length) {
        console.error(`AXE VIOLATIONS (${scheme}):`);
        console.error(JSON.stringify(axe, null, 1));
        throw new Error(`axe found ${axe.length} violation(s) in ${scheme} mode`);
      }

      result[scheme] = data;
    } finally {
      await ctx.close();
    }
  }

  // ---- webkit pass: parse canary + visual crops only ----
  await browser.close();
  try {
    browser = await webkit.launch();
  } catch (e) {
    console.error("webkit launch failed — first run? bunx playwright install webkit");
    throw e;
  }
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      colorScheme: scheme,
      reducedMotion: "reduce",
    });
    try {
      const page = await ctx.newPage();
      const resp = await page.goto(url, { waitUntil: "load" });
      if (!resp?.ok()) throw new Error(`demo.html: HTTP ${resp?.status()} (webkit)`);
      const canary = await page.evaluate(() => {
        const c = document.createElement("m-error");
        document.body.append(c);
        const d = getComputedStyle(c).display;
        c.remove();
        return d;
      });
      if (canary !== "none")
        throw new Error("PARSE CANARY FAILED in webkit: mica.css did not parse to the end");
      for (const [name, sel] of VISUAL_PROBES) {
        const shot = await page.locator(sel).first()
          .screenshot({ animations: "disabled" });
        visuals.set(`${name}.${scheme}.webkit`, shot);
      }
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser?.close();
  server.stop();
}

// ---------------------------------------------------------------- output
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v as object).sort().map((k) => [k, sortKeys((v as any)[k])]));
  return v;
}
const text = JSON.stringify(sortKeys(result), null, 1) + "\n";
const count = Object.values(result as any)
  .reduce((n: number, v: any) => n + Object.keys(v.tokens).length + Object.keys(v.elements).length, 0);

// visual compare: exact-size match required; pixelmatch reports diffs.
// Baselines are same-machine artifacts (macOS-blessed, like the JSON).
async function compareVisuals(): Promise<string[]> {
  const failures: string[] = [];
  for (const [key, buf] of visuals) {
    const basePath = join(VISUAL_DIR, `${key}.png`);
    const baseFile = Bun.file(basePath);
    if (!(await baseFile.exists())) { failures.push(`${key}: no baseline`); continue; }
    const a = PNG.sync.read(Buffer.from(await baseFile.arrayBuffer()));
    const b = PNG.sync.read(Buffer.from(buf));
    if (a.width !== b.width || a.height !== b.height) {
      failures.push(`${key}: size ${a.width}x${a.height} -> ${b.width}x${b.height}`);
      await Bun.write(join(VISUAL_DIR, `${key}.current.png`), buf);
      continue;
    }
    const diffPng = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diffPng.data, a.width, a.height,
      { threshold: 0.1 });
    if (n > 0) {
      failures.push(`${key}: ${n} pixel(s) differ`);
      await Bun.write(join(VISUAL_DIR, `${key}.current.png`), buf);
      await Bun.write(join(VISUAL_DIR, `${key}.diff.png`),
        PNG.sync.write(diffPng));
    }
  }
  return failures;
}

const check = process.argv.includes("--check");
if (check) {
  const baseline = Bun.file(BASELINE);
  if (!(await baseline.exists())) {
    console.error("no baseline; run without --check first");
    process.exit(2);
  }
  const jsonOk = (await baseline.text()) === text;
  const visualFailures = await compareVisuals();
  if (jsonOk && visualFailures.length === 0) {
    console.log(`ok: ${count} probes + ${visuals.size} visuals match baseline (both schemes)`);
    process.exit(0);
  }
  if (!jsonOk) {
    const tmp = join(import.meta.dir, "snapshots", ".current.json");
    await Bun.write(tmp, text);
    Bun.spawnSync(
      ["git", "diff", "--no-index", "--color", BASELINE, tmp], { stdout: "inherit" });
    await Bun.file(tmp).delete();
  }
  for (const f of visualFailures)
    console.error(`VISUAL DRIFT ${f} (see tools/snapshots/visual/*.current.png|*.diff.png)`);
  console.error("\nSNAPSHOT DRIFT — intentional? re-bless: bun tools/snapshot.ts");
  process.exit(1);
} else {
  await Bun.write(BASELINE, text);
  for (const [key, buf] of visuals)
    await Bun.write(join(VISUAL_DIR, `${key}.png`), buf);
  // stale artifacts from previous failed checks
  for (const f of new Bun.Glob("*.{current,diff}.png").scanSync(VISUAL_DIR))
    await Bun.file(join(VISUAL_DIR, f)).delete();
  console.log(`blessed: ${count} probes + ${visuals.size} visuals -> tools/snapshots/`);
}
