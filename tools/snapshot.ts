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
import type { Browser } from "playwright";
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
  ["header", "#header-demo m-header", ["display", "background-color", "border-bottom-color", "padding-top"]],
  ["header.end", "#demo-header-wide", ["display", "justify-content"]],
  ["header.current", "#demo-header-wide > [aria-current]", ["color", "background-color", "font-weight"]],
  ["header.compact", "#demo-header-nav", ["display"]],
  ["header.trigger", '#header-demo button[data-menu]', ["display"]],
  ["sidebar", "#sidebar-demo m-sidebar", ["display", "flex-direction", "padding-top", "background-color", "border-right-width"]],
  ["navigation.summary", "#navigation-menu-demo summary", ["display", "color", "padding-top", "font-size"]],
  ["navigation.panel", "#navigation-menu-demo [data-nav-panel]", ["position", "background-color", "border-top-width", "padding-top"]],
  ["navigation.link", "#navigation-menu-demo [data-nav-panel] a", ["display", "font-size", "padding-top"]],
  ["sidebar.nav", "#sidebar-demo nav", ["overflow-y", "padding-top"]],
  ["sidebar.active", '#sidebar-demo [aria-current="page"]', ["color", "background-color", "font-weight", "box-shadow", "border-top-width"]],
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
  ["button.primary", 'button[data-variant="primary"]', ["background-color", "color", "border-top-color"]],
  ["button.ghost", 'button[data-variant="ghost"]', ["background-color", "border-top-color"]],
  ["button.danger", 'button[data-variant="danger"]', ["background-color", "color"]],
  ["button.small", 'button[data-size="small"]', ["font-size", "padding-left"]],
  ["input.text", 'input[type="text"]',
    ["background-color", "border-top-color", "font-size", "border-radius"]],
  ["textarea", "textarea", ["field-sizing", "background-color"]],
  ["checkbox", 'input[type="checkbox"]:not([role="switch"])',
    ["appearance", "inline-size", "block-size", "border-top-color", "border-radius"]],
  ["radio", 'input[type="radio"]', ["border-radius", "inline-size"]],
  ["switch", 'input[type="checkbox"][role="switch"]', ["inline-size", "block-size", "border-radius"]],
  ["segmented", "m-segmented", ["display", "border-top-color", "border-radius"]],
  ["segmented.checked", "m-segmented label:has(input:checked)",
    ["background-color", "color", "font-weight"]],
  ["segmented.disabled", "m-segmented label:has(input:disabled)",
    ["color", "cursor", "opacity"]],
  ["stepper", "m-stepper",
    ["display", "overflow-x", "border-top-color", "border-radius", "background-color"]],
  ["stepper.value", "m-stepper > :nth-child(2)",
    ["display", "overflow-x", "text-overflow", "background-color", "font-weight"]],
  ["stepper.step", 'm-stepper > [data-step="previous"]',
    ["inline-size", "border-top-width", "border-radius", "background-color"]],
  ["stepper.reset", "m-stepper > [data-reset]",
    ["border-inline-start-color", "border-inline-start-width"]],
  ["stepper.no-reset.next", 'm-stepper:not(:has(> [data-reset])) > [data-step="next"]',
    ["border-start-end-radius", "border-end-end-radius"]],
  ["badge", "m-badge:not([variant]):not([count])",
    ["display", "border-top-color", "color", "font-size", "border-radius"]],
  ["badge.primary", 'm-badge[variant="primary"]', ["background-color", "color", "border-top-color"]],
  ["badge.success", 'm-badge[variant="success"]', ["background-color", "color", "border-top-color"]],
  ["badge.warning", 'm-badge[variant="warning"]', ["background-color", "color", "border-top-color"]],
  ["badge.danger", 'm-badge[variant="danger"]', ["background-color", "color", "border-top-color"]],
  ["badge.count", "m-badge[count]", ["min-inline-size", "font-family"]],
  ["avatar.initials", "m-avatar:not([blobatar]):not(:has(> img))",
    ["display", "inline-size", "block-size", "background-color", "color", "font-size", "border-radius"]],
  ["avatar.image", "m-avatar > img",
    ["position", "inset-block-start", "inline-size", "block-size", "object-fit"]],
  ["avatar.blobatar", "m-avatar[blobatar]:not([contained])",
    ["inline-size", "block-size", "color", "border-radius"]],
  ["avatar.contained", "m-avatar[blobatar][contained]",
    ["inline-size", "block-size", "color", "border-radius"]],
  ["skeleton", "m-skeleton:not([style])",
    ["display", "inline-size", "block-size", "flex", "overflow-x", "border-radius", "background-color", "animation-name"]],
  ["skeleton.sized", "m-skeleton[style]",
    ["inline-size", "block-size", "border-radius"]],
  ["stat-grid", "dl.stat-grid",
    ["display", "flex-wrap", "gap", "padding", "overflow-x", "border-radius", "background-color"]],
  ["stat-grid.stat", "dl.stat-grid > div.stat",
    ["display", "flex-direction", "flex", "gap", "min-inline-size", "padding", "background-color"]],
  ["stat-grid.term", "dl.stat-grid > div.stat > dt",
    ["color", "font-size", "font-weight", "line-height"]],
  ["stat-grid.description", "dl.stat-grid > div.stat > dd",
    ["display", "flex-direction", "flex", "gap", "margin-block-start", "margin-block-end"]],
  ["stat-grid.value", "dl.stat-grid > div.stat > dd > :first-child",
    ["color", "font-size", "font-weight", "font-variant-numeric", "line-height", "overflow-wrap"]],
  ["stat-grid.support", "dl.stat-grid > div.stat > dd > small",
    ["margin-block-start", "color", "font-size", "line-height"]],
  ["tabs.default.rail", "m-tabs:not([variant]) > nav",
    ["display", "gap", "padding", "border-block-end-width", "border-block-end-style", "border-radius", "background-color", "overflow-x", "scrollbar-width"]],
  ["tabs.default.selected", 'm-tabs:not([variant]) > nav > button[aria-selected="true"]',
    ["background-color", "color", "box-shadow", "border-radius", "padding-inline-start", "white-space"]],
  ["tabs.underline.rail", 'm-tabs[variant="underline"] > nav',
    ["display", "gap", "padding", "border-block-end-width", "border-block-end-style", "border-block-end-color", "border-radius", "background-color", "overflow-x", "scrollbar-width"]],
  ["tabs.underline.selected", 'm-tabs[variant="underline"] > nav > button[aria-selected="true"]',
    ["background-color", "color", "box-shadow", "border-radius", "padding-inline-start", "padding-inline-end", "white-space"]],
  ["tabs.underline.last", 'm-tabs[variant="underline"] > nav > button:last-of-type',
    ["padding-inline-start", "padding-inline-end"]],
  // a11y primitives. These also stand in for the parse canary's blind
  // spot: they are the last rule block in mica.elements, after m-error.
  ["visually-hidden", "[data-visually-hidden]:not([data-visually-hidden=\"focusable\"])",
    ["position", "inline-size", "block-size", "overflow", "clip-path", "white-space"]],
  ["visually-hidden.focusable", '[data-visually-hidden="focusable"]',
    ["position", "inline-size", "clip-path"]],
  ["select", "select", ["appearance", "background-color", "border-top-color"]],
  ["progress", "progress", ["block-size", "inline-size"]],
  ["dialog", "dialog", ["background-color", "border-top-color", "border-radius"]],
  ["popover", "[popover]", ["background-color", "border-top-color"]],
  ["toast", "m-toast:not([variant])",
    ["inline-size", "max-inline-size", "padding-top", "padding-right"]],
  ["toast.success", 'm-toast[variant="success"]',
    ["border-inline-start-color", "border-inline-start-width"]],
  ["details", "details", ["border-top-color"]],
  ["link", "a[href]", ["color", "text-decoration-line"]],
  ["code", "code", ["font-family", "background-color"]],
  ["h1", "h1", ["margin-block-start", "margin-block-end", "line-height"]],
  ["table", "table", ["border-collapse"]],
  // checked-state grammar (static — demo has checked + unchecked instances)
  ["checkbox.checked", 'input[type="checkbox"]:not([role="switch"]):checked',
    ["background-color", "border-top-color"]],
  ["radio.checked", 'input[type="radio"]:checked', ["background-color"]],
  ["switch.checked", 'input[type="checkbox"][role="switch"]:checked', ["background-color"]],
];

// -------------------------------------------------------- state probes
// Interactive states the static manifest can't see: hover, focus ring,
// open dialog (+ ::backdrop), open popover. Driven with real Playwright
// interactions per scheme; results land under `states` in the baseline.
const HOVER_PROBES: [string, string, string[]][] = [
  ["button.hover", "button:not([class]):not([disabled])", ["background-color"]],
  ["button.primary.hover", 'button[data-variant="primary"]:not([disabled])', ["background-color"]],
  ["button.danger.hover", 'button[data-variant="danger"]:not([disabled])', ["background-color"]],
  ["stepper.step.hover", 'm-stepper > [data-step="previous"]', ["background-color"]],
  ["tabs.underline.hover", 'm-tabs[variant="underline"] > nav > button:not([aria-selected="true"])',
    ["background-color", "color"]],
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
  ["checkbox.checked", 'input[type="checkbox"]:not([role="switch"]):checked'],
  ["checkbox.unchecked", 'input[type="checkbox"]:not([role="switch"]):not(:checked):not([disabled])'],
  ["radio.checked", 'input[type="radio"]:checked'],
  ["switch.checked", 'input[type="checkbox"][role="switch"]:checked'],
  ["switch.unchecked", 'input[type="checkbox"][role="switch"]:not(:checked):not([disabled])'],
  ["avatar.blobatar", "m-avatar[blobatar]:not([contained])"],
  ["avatar.contained", "m-avatar[blobatar][contained]"],
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

async function assertTabsOverflowRuntime(browser: Browser, engine: string) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    for (const direction of ["ltr", "rtl"] as const) {
      const ctx = await browser.newContext({
        viewport: { width: 351, height: 740 },
        colorScheme: "light",
        reducedMotion,
      });
      try {
        const page = await ctx.newPage();
        const resp = await page.goto(url, { waitUntil: "load" });
        if (!resp?.ok())
          throw new Error(`demo.html: HTTP ${resp?.status()} (${engine} tabs runtime)`);
        const state = await page.evaluate(async ([direction, reducedMotion]) => {
          const component = document.querySelector('m-tabs[variant="underline"]')!;
          component.setAttribute("dir", direction);
          const rail = component.querySelector(":scope > nav") as HTMLElement;
          const enhancedScrollbar = getComputedStyle(rail).scrollbarWidth;
          rail.removeAttribute("role");
          const fallbackScrollbar = getComputedStyle(rail).scrollbarWidth;
          rail.setAttribute("role", "tablist");
          const tabs = () => [...rail.querySelectorAll("button")] as HTMLElement[];
          const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const marker = (pseudo: "::before" | "::after") => {
            const style = getComputedStyle(rail, pseudo);
            const margin = pseudo === "::before" ? style.marginInlineEnd : style.marginInlineStart;
            const duration = style.transitionDuration.split(",").reduce((longest, value) => {
              const time = Number.parseFloat(value) *
                (value.trim().endsWith("ms") ? 1 : 1000);
              return Math.max(longest, time);
            }, 0);
            return {
              duration,
              opacity: Number(style.opacity),
              gutter: Math.max(0,
                (Number.parseFloat(style.inlineSize) || 0) +
                (Number.parseFloat(margin) || 0)),
            };
          };
          const partialTab = () => {
            const railRect = rail.getBoundingClientRect();
            const before = marker("::before").gutter;
            const after = marker("::after").gutter;
            const left = railRect.left + (direction === "rtl" ? after : before);
            const right = railRect.right - (direction === "rtl" ? before : after);
            const index = tabs().findIndex((tab) => {
              const rect = tab.getBoundingClientRect();
              return (rect.left < left && rect.right > left) ||
                (rect.left < right && rect.right > right);
            });
            if (index === -1) throw new Error("no partially visible tab found");
            return index;
          };
          const fullyVisible = (tab: HTMLElement) => {
            const railRect = rail.getBoundingClientRect();
            const rect = tab.getBoundingClientRect();
            const before = marker("::before").gutter;
            const after = marker("::after").gutter;
            const left = railRect.left + (direction === "rtl" ? after : before);
            const right = railRect.right - (direction === "rtl" ? before : after);
            return rect.left >= left - 1 && rect.right <= right + 1;
          };
          const reduced = reducedMotion === "reduce";
          const midpointWait = reduced ? 10 : 75;
          const waitForMarker = async (opacity: number, gutter: number) => {
            const deadline = performance.now() + 500;
            let state = marker("::before");
            while ((state.opacity !== opacity || Math.abs(state.gutter - gutter) > 0.01) &&
              performance.now() < deadline) {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              state = marker("::before");
            }
            return state;
          };
          await wait(reduced ? 20 : 200);
          const initialStationary = rail.scrollLeft === 0;
          rail.scrollLeft = direction === "rtl" ? -60 : 60;
          rail.dispatchEvent(new Event("scroll"));
          await wait(midpointWait);
          const fadeIn = marker("::before");
          const shown = await waitForMarker(1, 16);
          rail.scrollLeft = 0;
          rail.dispatchEvent(new Event("scroll"));
          await wait(midpointWait);
          const fadeOut = marker("::before");
          const hidden = await waitForMarker(0, 0);

          const revealIndex = partialTab();
          tabs()[revealIndex].click();
          await wait(reduced ? 50 : 220);
          const reveal = {
            selected: tabs()[revealIndex].getAttribute("aria-selected") === "true",
            fullyVisible: fullyVisible(tabs()[revealIndex]),
          };

          (component as HTMLElement & { select(index: number): void }).select(0);
          rail.scrollLeft = 0;
          const parent = component.parentNode!;
          const next = component.nextSibling;
          component.remove();
          parent.insertBefore(component, next);
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const reconnectedTabs = tabs();
          reconnectedTabs[0].focus();
          reconnectedTabs[0].dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
            cancelable: true,
          }));
          await wait(reduced ? 50 : 220);
          const reconnectSelectsOneStep = reconnectedTabs.findIndex((tab) =>
            tab.getAttribute("aria-selected") === "true") === 1;

          (component as HTMLElement & { select(index: number): void }).select(0);
          rail.scrollLeft = 0;
          await wait(reduced ? 20 : 200);
          const cancelIndex = partialTab();
          tabs()[cancelIndex].click();
          rail.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
          rail.scrollLeft = 0;
          await wait(reduced ? 50 : 220);
          const userScrollWins = rail.scrollLeft === 0;

          return {
            initialStationary, fadeIn, shown, fadeOut, hidden, reveal,
            reconnectSelectsOneStep, userScrollWins,
            scrollbarContract: enhancedScrollbar === "none" && fallbackScrollbar === "thin",
          };
        }, [direction, reducedMotion] as const);
        const fades = reducedMotion === "reduce"
          ? state.shown.duration < 1 && state.hidden.duration < 1
          : state.fadeIn.opacity > 0 && state.fadeIn.opacity < 1 &&
            state.fadeIn.gutter > 0 && state.fadeIn.gutter < 16 &&
            state.fadeOut.opacity > 0 && state.fadeOut.opacity < 1 &&
            state.fadeOut.gutter > 0 && state.fadeOut.gutter < 16;
        const passed = state.initialStationary && fades &&
          Math.abs(state.shown.opacity - 1) < 0.001 &&
          Math.abs(state.shown.gutter - 16) < 0.01 &&
          state.hidden.opacity < 0.001 && state.hidden.gutter < 0.01 &&
          state.reveal.selected && state.reveal.fullyVisible &&
          state.reconnectSelectsOneStep && state.userScrollWins && state.scrollbarContract;
        if (!passed)
          throw new Error(`${engine} ${direction} ${reducedMotion} tabs runtime failed: ${JSON.stringify(state)}`);
      } finally {
        await ctx.close();
      }
    }
  }
}

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

      const avatarUpgrade = await page.evaluate(() => {
        const make = () => {
          const avatar = document.createElement("m-avatar");
          avatar.textContent = "TS";
          avatar.setAttribute("blobatar", "snapshot-seed");
          document.body.append(avatar);
          return avatar;
        };
        const first = make();
        const second = make();
        const properties = ["--m-avatar-body-color", "--m-avatar-eye-color"];
        const generated = properties.every((property) =>
          first.style.getPropertyValue(property) !== "");
        const deterministic = properties.every((property) =>
          first.style.getPropertyValue(property) === second.style.getPropertyValue(property));
        first.removeAttribute("blobatar");
        const restored = properties.every((property) =>
          first.style.getPropertyValue(property) === "") &&
          getComputedStyle(first).color !== "rgba(0, 0, 0, 0)";
        first.remove();
        second.remove();
        return { generated, deterministic, restored };
      });
      if (!avatarUpgrade.generated || !avatarUpgrade.deterministic || !avatarUpgrade.restored)
        throw new Error(`avatar.js upgrade failed: ${JSON.stringify(avatarUpgrade)}`);

      // ---- state probes (real interactions) ----
      const states: Record<string, unknown> = {};
      const probe = (sel: string, props: string[], pseudo?: string) =>
        page.evaluate(([s, ps, pe]: [string, string[], string?]) => {
          const el = document.querySelector(s);
          if (!el) return "MISSING";
          const cs = getComputedStyle(el, pe || undefined);
          return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
        }, [sel, props, pseudo] as any);

      states["avatar.blobatar.body"] = await probe(
        "m-avatar[blobatar]:not([contained])", ["background-color", "inset-block-start"],
        "::before");
      states["avatar.blobatar.eyes"] = await probe(
        "m-avatar[blobatar]:not([contained])", ["background-image"], "::after");
      states["avatar.contained.body"] = await probe(
        "m-avatar[blobatar][contained]", ["background-color", "inset-block-start"],
        "::before");

      for (const [name, sel, props] of HOVER_PROBES) {
        await page.hover(sel);
        await page.waitForTimeout(50); // let the 0.01ms reduced-motion transition finish
        states[name] = await probe(sel, props);
      }
      await page.mouse.move(0, 0);

      const tabsOverflow = await page.evaluate(() => {
        const rail = document.querySelector('m-tabs[variant="underline"] > nav') as HTMLElement;
        const tabs = [...rail.querySelectorAll("button")];
        const maxScroll = rail.scrollWidth - rail.clientWidth;
        const markerGutter = (pseudo: "::before" | "::after") => {
          const style = getComputedStyle(rail, pseudo);
          const margin = pseudo === "::before" ? style.marginInlineEnd : style.marginInlineStart;
          return Math.max(0,
            (Number.parseFloat(style.inlineSize) || 0) +
            (Number.parseFloat(margin) || 0));
        };
        const edgeState = () => ({
          moreBefore: rail.scrollLeft > 1,
          moreAfter: rail.scrollLeft < maxScroll - 1,
        });
        rail.scrollLeft = 0;
        const start = edgeState();
        rail.scrollLeft = maxScroll / 2;
        const middle = edgeState();
        rail.scrollLeft = maxScroll;
        const end = edgeState();
        rail.scrollLeft = 0;
        return {
          overflows: maxScroll > 0,
          labelsStayOnOneLine: tabs.every((tab) => getComputedStyle(tab).whiteSpace === "nowrap"),
          startMarkerGutter: markerGutter("::before"),
          endMarkerGutter: markerGutter("::after"),
          edgeStates: { start, middle, end },
        };
      });
      states["tabs.underline.overflow"] = tabsOverflow;
      if (!tabsOverflow.overflows || !tabsOverflow.labelsStayOnOneLine ||
          tabsOverflow.startMarkerGutter !== 0 || tabsOverflow.endMarkerGutter !== 16 ||
          tabsOverflow.edgeStates.start.moreBefore || !tabsOverflow.edgeStates.start.moreAfter ||
          !tabsOverflow.edgeStates.middle.moreBefore || !tabsOverflow.edgeStates.middle.moreAfter ||
          !tabsOverflow.edgeStates.end.moreBefore || tabsOverflow.edgeStates.end.moreAfter)
        throw new Error(`underline tabs overflow failed: ${JSON.stringify(tabsOverflow)}`);

      const markerProperties = [
        "opacity", "inline-size", "margin-inline-start", "margin-inline-end",
        "background-image", "background-color", "transition-property", "transition-duration",
      ];
      states["tabs.underline.marker.start.before"] = await probe(
        'm-tabs[variant="underline"] > nav', markerProperties, "::before");
      states["tabs.underline.marker.start.after"] = await probe(
        'm-tabs[variant="underline"] > nav', markerProperties, "::after");
      await page.evaluate(() => {
        const rail = document.querySelector('m-tabs[variant="underline"] > nav') as HTMLElement;
        rail.scrollLeft = (rail.scrollWidth - rail.clientWidth) / 2;
      });
      await page.waitForTimeout(50);
      states["tabs.underline.marker.middle.before"] = await probe(
        'm-tabs[variant="underline"] > nav', markerProperties, "::before");
      states["tabs.underline.marker.middle.after"] = await probe(
        'm-tabs[variant="underline"] > nav', markerProperties, "::after");
      await page.evaluate(() => {
        const rail = document.querySelector('m-tabs[variant="underline"] > nav') as HTMLElement;
        rail.scrollLeft = rail.scrollWidth;
      });
      await page.waitForTimeout(50);
      states["tabs.underline.marker.end.before"] = await probe(
        'm-tabs[variant="underline"] > nav', markerProperties, "::before");
      states["tabs.underline.marker.end.after"] = await probe(
        'm-tabs[variant="underline"] > nav', markerProperties, "::after");
      await page.evaluate(() => {
        (document.querySelector('m-tabs[variant="underline"] > nav') as HTMLElement).scrollLeft = 0;
      });
      await page.waitForTimeout(50);

      const tabsReveal = await page.evaluate(async () => {
        const component = document.querySelector('m-tabs[variant="underline"]')!;
        const rail = component.querySelector(":scope > nav") as HTMLElement;
        const tabs = [...rail.querySelectorAll("button")] as HTMLElement[];
        const panels = [...component.querySelectorAll(":scope > section")] as HTMLElement[];
        rail.scrollIntoView({ block: "center", inline: "nearest" });
        rail.scrollLeft = 0;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const railRect = rail.getBoundingClientRect();
        const endGutter = Number.parseFloat(getComputedStyle(rail, "::after").inlineSize) || 0;
        const usableEnd = railRect.right - endGutter;
        const targetIndex = tabs.findIndex((tab) => {
          const rect = tab.getBoundingClientRect();
          return rect.left < usableEnd && rect.right > usableEnd;
        });
        if (targetIndex === -1) throw new Error("no partially visible underline tab found");
        const target = tabs[targetIndex];
        const beforeRect = target.getBoundingClientRect();
        const pageScroll = window.scrollY;
        target.click();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const afterRect = target.getBoundingClientRect();
        const settledRailRect = rail.getBoundingClientRect();
        const beforeStyle = getComputedStyle(rail, "::before");
        const afterStyle = getComputedStyle(rail, "::after");
        const startGutter = Math.max(0,
          (Number.parseFloat(beforeStyle.inlineSize) || 0) +
          (Number.parseFloat(beforeStyle.marginInlineEnd) || 0));
        const settledEndGutter = Math.max(0,
          (Number.parseFloat(afterStyle.inlineSize) || 0) +
          (Number.parseFloat(afterStyle.marginInlineStart) || 0));
        const result = {
          target: target.textContent?.trim(),
          partiallyVisibleBefore: beforeRect.left < usableEnd && beforeRect.right > usableEnd,
          selected: target.getAttribute("aria-selected") === "true",
          matchingPanelVisible: !panels[targetIndex]?.hidden,
          scrollMoved: rail.scrollLeft > 1,
          fullyVisibleAfter: afterRect.left >= settledRailRect.left + startGutter - 1 &&
            afterRect.right <= settledRailRect.right - settledEndGutter + 1,
          pageScrollStable: Math.abs(window.scrollY - pageScroll) < 1,
        };
        (component as HTMLElement & { select(index: number): void }).select(0);
        rail.scrollLeft = 0;
        return result;
      });
      states["tabs.underline.reveal-partial"] = tabsReveal;
      if (!tabsReveal.partiallyVisibleBefore || !tabsReveal.selected ||
          !tabsReveal.matchingPanelVisible || !tabsReveal.scrollMoved ||
          !tabsReveal.fullyVisibleAfter || !tabsReveal.pageScrollStable)
        throw new Error(`underline tabs selected reveal failed: ${JSON.stringify(tabsReveal)}`);
      await page.waitForTimeout(50);

      await page.evaluate(() =>
        (document.querySelector('m-tabs[variant="underline"] > nav > button[aria-selected="true"]') as HTMLElement)?.focus());
      await page.waitForTimeout(50);
      states["tabs.underline.focus-ring"] = await probe(
        'm-tabs[variant="underline"] > nav > button[aria-selected="true"]',
        ["outline-color", "outline-width", "outline-offset", "outline-style", "box-shadow"]);

      await page.keyboard.press("End");
      await page.waitForTimeout(50);
      const tabsKeyboard = await page.evaluate(() => {
        const component = document.querySelector('m-tabs[variant="underline"]')!;
        const rail = component.querySelector(":scope > nav") as HTMLElement;
        const tabs = [...component.querySelectorAll(":scope > nav > button")];
        const panels = [...component.querySelectorAll(":scope > section")];
        const last = tabs.length - 1;
        const railRect = rail.getBoundingClientRect();
        const tabRect = tabs[last]?.getBoundingClientRect();
        const beforeStyle = getComputedStyle(rail, "::before");
        const afterStyle = getComputedStyle(rail, "::after");
        const startGutter = Math.max(0,
          (Number.parseFloat(beforeStyle.inlineSize) || 0) +
          (Number.parseFloat(beforeStyle.marginInlineEnd) || 0));
        const endGutter = Math.max(0,
          (Number.parseFloat(afterStyle.inlineSize) || 0) +
          (Number.parseFloat(afterStyle.marginInlineStart) || 0));
        return {
          endKeySelectsLast: document.activeElement === tabs[last] &&
            tabs[last]?.getAttribute("aria-selected") === "true",
          matchingPanelVisible: !(panels[last] as HTMLElement)?.hidden,
          selectedTabFullyVisible: !!tabRect &&
            tabRect.left >= railRect.left + startGutter - 1 &&
            tabRect.right <= railRect.right - endGutter + 1,
        };
      });
      states["tabs.underline.keyboard"] = tabsKeyboard;
      if (!tabsKeyboard.endKeySelectsLast || !tabsKeyboard.matchingPanelVisible ||
          !tabsKeyboard.selectedTabFullyVisible)
        throw new Error(`underline tabs keyboard behavior failed: ${JSON.stringify(tabsKeyboard)}`);
      await page.keyboard.press("Home");

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
      await page.evaluate(() =>
        (document.querySelector('m-stepper > [data-step="previous"]') as HTMLElement)?.focus());
      await page.waitForTimeout(50);
      states["stepper.focus-ring"] = await probe(
        'm-stepper > [data-step="previous"]:focus-visible',
        ["outline-color", "outline-width", "outline-offset", "outline-style", "z-index"]);
      await page.evaluate(() =>
        (document.querySelector('[data-visually-hidden="focusable"]') as HTMLElement)?.focus());
      await page.waitForTimeout(50);
      // Focused: the hiding rule stops matching, so the element returns to
      // its own styling rather than being un-hidden by an undo rule.
      states["visually-hidden.focused"] = await probe('[data-visually-hidden="focusable"]',
        ["position", "inline-size", "clip-path", "white-space"]);
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

      await page.evaluate(() => document.querySelector("dialog")?.showModal());
      await page.waitForTimeout(50);
      states["dialog.open"] = await probe("dialog[open]",
        ["background-color", "border-top-color", "box-shadow"]);
      states["dialog.backdrop"] = await probe("dialog[open]",
        ["background-color"], "::backdrop");
      await page.evaluate(() => document.querySelector("dialog[open]")?.close());
      await page.waitForTimeout(50);

      // Mobile drawer: drawer.js replaces the CSS-only giant shadow with
      // an ordinary fixed overlay whose opacity follows drag progress.
      await page.setViewportSize({ width: 390, height: 800 });
      await page.evaluate(() =>
        (document.getElementById("demo-drawer") as HTMLDialogElement)?.showModal());
      await page.waitForTimeout(50);
      states["drawer.open"] = await probe("#demo-drawer[open]", ["box-shadow"]);
      states["drawer.overlay.open"] = await probe("[data-mica-drawer-overlay]",
        ["display", "background-color", "opacity"]);

      const drag = await page.evaluate(() => {
        const dialog = document.getElementById("demo-drawer")!;
        const header = dialog.querySelector("header")!;
        const dr = dialog.getBoundingClientRect();
        const hr = header.getBoundingClientRect();
        return {
          x: hr.left + hr.width / 2,
          y: hr.top + Math.min(12, hr.height / 2),
          dy: dr.height / 4,
        };
      });
      await page.mouse.move(drag.x, drag.y);
      await page.mouse.down();
      await page.mouse.move(drag.x, drag.y + drag.dy);
      await page.waitForTimeout(50);
      states["drawer.overlay.drag"] = await probe("[data-mica-drawer-overlay]",
        ["opacity"]);
      // End with negligible upward velocity so the sub-threshold drag
      // reliably cancels instead of satisfying the flick threshold.
      await page.waitForTimeout(50);
      await page.mouse.move(drag.x, drag.y + drag.dy - 1);
      await page.mouse.up();
      await page.waitForTimeout(50);
      states["drawer.overlay.cancelled"] = await probe("[data-mica-drawer-overlay]",
        ["opacity"]);

      // Shipped iOS drops the closed top-layer dialog before transitionend,
      // which used to strand the drag-dismiss inline translate off-screen.
      // Suppress that event, dismiss, and reopen before the timeout fallback
      // to assert that the open mutation clears the stale transform itself.
      const noDrawerTransition = await page.addStyleTag({
        content: "dialog[data-drawer] { transition: none !important; }",
      });
      await page.mouse.move(drag.x, drag.y);
      await page.mouse.down();
      await page.mouse.move(drag.x, drag.y + drag.dy * 2);
      await page.waitForTimeout(50);
      await page.mouse.move(drag.x, drag.y + drag.dy * 2 + 1);
      await page.mouse.up();
      await page.waitForTimeout(30);
      await page.evaluate(() =>
        (document.getElementById("demo-drawer") as HTMLDialogElement)?.showModal());
      await page.waitForTimeout(50);
      states["drawer.reopened-after-dismiss"] = await probe("#demo-drawer[open]",
        ["translate"]);
      const reopenedVisible = await page.evaluate(() =>
        document.getElementById("demo-drawer")!.getBoundingClientRect().top < innerHeight);
      if (!reopenedVisible)
        throw new Error("drawer stayed translated off-screen after drag-dismiss reopen");
      await noDrawerTransition.evaluate((style) => style.remove());
      await page.evaluate(() =>
        (document.getElementById("demo-drawer") as HTMLDialogElement)?.close());
      await page.waitForTimeout(50);
      states["drawer.overlay.closed"] = await probe("[data-mica-drawer-overlay]",
        ["opacity"]);
      await page.setViewportSize({ width: 1280, height: 800 });

      await page.evaluate(() =>
        (document.querySelector("[popover]") as any)?.showPopover());
      await page.waitForTimeout(50);
      states["popover.open"] = await probe("[popover]:popover-open",
        ["background-color", "border-top-color"]);
      await page.evaluate(() =>
        (document.querySelector("[popover]:popover-open") as any)?.hidePopover());

      // toast position token — default corner + one style-query branch.
      // Probes used inset/margin values on an OPEN toast (closed popovers
      // are display:none and report unresolved calc strings).
      const toastPos = ["top", "right", "bottom", "left", "margin-left", "margin-right"];
      await page.evaluate(() =>
        (document.getElementById("demo-toast") as any)?.showPopover());
      await page.waitForTimeout(50);
      states["toast.position.default"] = await probe("m-toast:popover-open", toastPos);
      await page.evaluate(() =>
        document.documentElement.style.setProperty("--toast-position", "top-center"));
      await page.waitForTimeout(50);
      states["toast.position.top-center"] = await probe("m-toast:popover-open", toastPos);
      await page.evaluate(() => {
        document.documentElement.style.removeProperty("--toast-position");
        (document.querySelector("m-toast:popover-open") as any)?.hidePopover();
      });

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

  await assertTabsOverflowRuntime(browser, "chromium");

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
  await assertTabsOverflowRuntime(browser, "webkit");
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
