#!/usr/bin/env python3
"""Computed-style snapshot tests for mica.

The automated version of feedback-loop Channel 1: loads demo.html in
headless Chromium, resolves every token and a curated set of computed
styles in BOTH color schemes, and writes tools/snapshots/demo.json.

  python3 tools/snapshot.py           # (re)write the baseline ("bless")
  python3 tools/snapshot.py --check   # diff against baseline; exit 1 on drift

The baseline is committed; `git diff` is the regression report. Pixels are
never compared — values are text (oklch strings, px), so a diff says
exactly what changed. Notes:
  - reduced-motion is emulated: mica's preset kills transitions, so color
    probes never see mid-transition values.
  - the parse-error canary is a hard assert, not a snapshot entry.
  - baseline values can be font/platform-sensitive in places; the baseline
    is generated on macOS — regenerate rather than hand-edit.
"""

import http.server
import json
import re
import socket
import subprocess
import sys
import threading
from difflib import unified_diff
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = Path(__file__).resolve().parent / "snapshots" / "demo.json"

# ---------------------------------------------------------------- tokens
CSS = (ROOT / "mica.css").read_text()
TOKEN_NAMES = sorted(set(re.findall(r"(--[a-z][a-z0-9-]*)\s*:", CSS)))
# internal per-component properties (set by attributes/JS) are not tokens
TOKEN_NAMES = [t for t in TOKEN_NAMES if not t.startswith("--m-")]


def token_kind(name: str) -> str:
    if name.endswith(("-hue", "-chroma")) or name in ("--hue", "--chroma"):
        return "raw"
    if name.startswith(("--color-", "--neutral-", "--accent-", "--danger-",
                        "--success-", "--warn-")):
        return "color"
    if name.startswith(("--space-", "--size-", "--radius-", "--control-",
                        "--focus-ring-width", "--focus-ring-offset")) \
            or name in ("--measure",):
        return "length"
    return "raw"


TOKENS = {name: token_kind(name) for name in TOKEN_NAMES}

# ------------------------------------------------------------- elements
# (name, selector, [computed properties]) — stable, meaningful, curated.
# A missing selector snapshots as "MISSING": demo restructuring shows up
# as a diff instead of silently shrinking coverage.
PROBES = [
    ("body", "body", ["background-color", "color", "font-family", "line-height"]),
    ("vstack", "m-vstack", ["display", "flex-direction", "row-gap", "align-items"]),
    ("hstack", "m-hstack", ["display", "align-items", "column-gap", "flex-wrap"]),
    ("hstack.wrap", "m-hstack[wrap]", ["flex-wrap"]),
    ("zstack", "m-zstack", ["display", "align-items", "justify-items"]),
    ("box", "m-box", ["padding-top"]),
    ("grid", "m-grid", ["display", "row-gap"]),
    ("sidecar", "m-sidecar", ["display", "flex-wrap", "column-gap"]),
    ("switcher", "m-switcher", ["display", "column-gap"]),
    ("reel", "m-reel", ["display", "overflow-x", "scroll-snap-type"]),
    ("frame.square", 'm-frame[ratio="square"]', ["aspect-ratio", "overflow"]),
    ("frame.img", "m-frame > img", ["object-fit"]),
    ("cover", "m-cover", ["display", "flex-direction", "padding-top", "row-gap"]),
    ("button", "button:not([class]):not([disabled])",
     ["background-color", "color", "border-top-color", "border-radius", "font-weight"]),
    ("button.primary", "button.primary",
     ["background-color", "color", "border-top-color"]),
    ("button.ghost", "button.ghost", ["background-color", "border-top-color"]),
    ("button.danger", "button.danger", ["background-color", "color"]),
    ("button.small", "button.small", ["font-size", "padding-left"]),
    ("input.text", 'input[type="text"]',
     ["background-color", "border-top-color", "font-size", "border-radius"]),
    ("textarea", "textarea", ["field-sizing", "background-color"]),
    ("checkbox", 'input[type="checkbox"]:not(.switch)',
     ["appearance", "inline-size", "block-size", "border-top-color", "border-radius"]),
    ("radio", 'input[type="radio"]', ["border-radius", "inline-size"]),
    ("switch", "input.switch", ["inline-size", "block-size", "border-radius"]),
    ("select", "select", ["appearance", "background-color", "border-top-color"]),
    ("progress", "progress", ["block-size", "inline-size"]),
    ("dialog", "dialog", ["background-color", "border-top-color", "border-radius"]),
    ("popover", "[popover]", ["background-color", "border-top-color"]),
    ("details", "details", ["border-top-color"]),
    ("link", "a[href]", ["color", "text-decoration-line"]),
    ("code", "code", ["font-family", "background-color"]),
    ("h1", "h1", ["margin-block-start", "margin-block-end", "line-height"]),
    ("table", "table", ["border-collapse"]),
]

JS_COLLECT = """
(args) => {
  const [tokens, probes] = args;
  const out = { tokens: {}, elements: {} };
  // One FRESH element per token: under the preset's reduced-motion rule
  // every element carries an `all 0.01ms` transition, so restyling a
  // reused element and reading synchronously returns the OLD value
  // (mid-transition, in oklab form). A fresh element has no prior value.
  for (const [name, kind] of Object.entries(tokens)) {
    if (kind === 'raw') {
      out.tokens[name] =
        getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      continue;
    }
    const probeEl = document.createElement('div');
    document.body.append(probeEl);
    if (kind === 'color') {
      probeEl.style.color = `var(${name})`;
      out.tokens[name] = getComputedStyle(probeEl).color;
    } else {
      probeEl.style.width = `var(${name})`;
      out.tokens[name] = getComputedStyle(probeEl).width;
    }
    probeEl.remove();
  }
  for (const [name, selector, props] of probes) {
    const el = document.querySelector(selector);
    if (!el) { out.elements[name] = 'MISSING'; continue; }
    const cs = getComputedStyle(el);
    out.elements[name] = Object.fromEntries(
      props.map(p => [p, cs.getPropertyValue(p)]));
  }
  // parse-error canary: hard assert, not a snapshot entry
  const c = document.createElement('m-error');
  document.body.append(c);
  out.canary = getComputedStyle(c).display;
  c.remove();
  return out;
}
"""


def serve() -> tuple[http.server.ThreadingHTTPServer, int]:
    class Handler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def log_message(self, *a):
            pass

    Handler.directory = str(ROOT)
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), lambda *a, **k: Handler(*a, directory=str(ROOT), **k))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def collect() -> dict:
    from playwright.sync_api import sync_playwright

    srv, port = serve()
    url = f"http://127.0.0.1:{port}/demo.html"
    result = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for scheme in ("light", "dark"):
            ctx = browser.new_context(
                viewport={"width": 1280, "height": 800},
                color_scheme=scheme,
                reduced_motion="reduce",
            )
            page = ctx.new_page()
            page.goto(url, wait_until="load")
            data = page.evaluate(JS_COLLECT, [TOKENS, [list(p) for p in PROBES]])
            assert data.pop("canary") == "none", \
                "PARSE CANARY FAILED: mica.css did not parse to the end"
            result[scheme] = data
            ctx.close()
        browser.close()
    srv.shutdown()
    return result


def main() -> int:
    check = "--check" in sys.argv
    data = collect()
    text = json.dumps(data, indent=1, sort_keys=True) + "\n"
    if check:
        if not BASELINE.exists():
            print("no baseline; run without --check first", file=sys.stderr)
            return 2
        old = BASELINE.read_text()
        if old == text:
            n = sum(len(v["tokens"]) + len(v["elements"]) for v in data.values())
            print(f"ok: {n} probes match baseline (both schemes)")
            return 0
        sys.stdout.writelines(unified_diff(
            old.splitlines(keepends=True), text.splitlines(keepends=True),
            "baseline", "current"))
        print("\nSNAPSHOT DRIFT — intentional? re-bless: python3 tools/snapshot.py",
              file=sys.stderr)
        return 1
    BASELINE.parent.mkdir(exist_ok=True)
    BASELINE.write_text(text)
    n = sum(len(v["tokens"]) + len(v["elements"]) for v in data.values())
    print(f"blessed: {n} probes -> {BASELINE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
