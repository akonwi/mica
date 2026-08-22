---
name: mica-feedback-loop
description: Verify mica's rendered output in a real browser — computed-style probes, accessibility tree checks, and delegated visual review. Use after any change to mica.css or index.html, when tuning color ramps, checking dark mode, validating a11y transparency, or before committing UI-affecting work.
---

# Mica feedback loop

Mica is a zero-JS CSS library; correctness lives in *rendered output*, not
in unit tests. This skill encodes the three verification channels, in
escalation order. All three go through the `aside` CLI (see the
aside-browser skill for full API details).

## Setup: serve the demo over HTTP

Aside cannot open `file://` URLs. Serve the project first:

```bash
cd <mica-root> && bun run docs:serve
```

Run the server in a separate terminal, then expect `200` from
`curl -s -o /dev/null -w "%{http_code}" http://localhost:8471/demo.html`.
Pages: `demo.html` is the kitchen-sink testbed (every component, one
page) — probe against it. `index.html` + `docs/*.html` are the paginated
docs generated from `docs-src/` by `bun run docs:build` (edit the source,
not the ignored output). `bun run docs:serve` builds them before serving.

Reuse the server across checks; it costs nothing. `tools/serve.ts` sends
`no-store` headers; generic static servers can let browsers (and aside
tabs, and the user's own browser) cache stale HTML/CSS.

## Channel 0 — snapshot check (automated, run first)

The deterministic probes are automated: `bun run snapshot:check` resolves
every design token and a curated set of element computed styles in both
color schemes via headless Playwright (bun; first run `bun run
snapshot:setup`), asserts the parse canary, and diffs against the
committed baseline in `tools/snapshots/demo.json`. Run it FIRST after any
mica.css/demo.html change — it catches most regressions before manual
probing starts. Intentional changes: re-bless (`bun run snapshot`) and
commit the baseline diff with the change.

Gotcha encoded in the script: under the preset's reduced-motion rule every
element carries an `all 0.01ms` transition — restyle-then-read on a reused
element returns the OLD value (mid-transition, oklab form). Probe with a
fresh element per read.

Channel 0 also drives interactive-state probes (hover, focus ring, open
dialog + ::backdrop, open popover), runs an axe-core pass per scheme
(hard failure, not a snapshot — a11y violations are bugs; rule
exclusions require an in-script justification comment), and diffs
element-crop PNG baselines for vendor-pseudo territory (progress/meter
fills, select trigger, drawn check/radio/switch glyphs) — the one place
pixels beat computed styles, because getComputedStyle lies there. On
visual drift, `*.current.png` and `*.diff.png` land next to the
baselines for eyeballing; blessing cleans them up.

Manual channels below remain for: values not in either manifest, states
not yet driven (checked-via-interaction, drag), vendor-pseudo rendering
(pixels lie territory), and anything needing judgment.

Gotcha: `*` never matches pseudo-elements — the preset's reduced-motion
rule needs (and has) a separate `*::backdrop` block. Symptom that found
it: backdrop alpha jittering at the 4th decimal between snapshot runs
(sampled mid-fade).

## Channel 1 — deterministic probes (targeted, cheap)

Use `aside repl` + `page.evaluate` with `getComputedStyle` to assert exact
rendered values: token resolution, OKLCH outputs, flex/grid/gap values,
layer-order winners. This is the regression channel — run it after every
mica.css change.

```bash
aside repl "
const p = await openTab('http://localhost:8471/demo.html');
const probe = await p.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('button.primary'));
  return { bg: cs.backgroundColor, color: cs.color };
});
console.log(JSON.stringify(probe, null, 1));
"
```

**Parse-error canary (run after every mica.css edit):** a CSS syntax
error (unbalanced comment/brace) silently kills every rule AFTER it —
the section you just edited may probe fine while the rest of the file is
dead. Always also probe one declaration from the file's LAST rule block,
e.g.:

```js
// m-error { display: none } is near the end of mica.css
const el = document.createElement('m-error');
document.body.append(el);
console.log(getComputedStyle(el).display); // 'none' = file parsed to the end
el.remove();
```

(Cause célèbre: an edit once closed a comment early; the stray comment
text invalidated everything after line 698, discovered pages later.)

Probe patterns that matter for mica:

- **Token resolution:** computed colors come back as `oklch(...)` — compare
  against the ramp numbers in mica.css literally.
- **Layer wins:** to verify user CSS beats mica, inject a style tag in
  `evaluate` and confirm the computed value flips.
- **Attribute API:** set `el.setAttribute('gap','lg')` in evaluate, re-read
  computed `gap` — confirms the attribute→custom-property chain.

### Forcing light/dark mode

`page.emulateMedia` is NOT available in the aside repl. Because mica themes
entirely via `light-dark()`, force modes from CSS instead:

```js
await p.evaluate(() => { document.documentElement.style.colorScheme = 'light'; });
await sleep(250); // elements with CSS transitions report mid-flight values
// probe... then 'dark', probe again. Always test BOTH modes.
```

Gotcha: elements with `transition` (e.g. buttons) computed-style-probe as
intermediate `oklab(...)` values right after a mode flip. Settle ~250ms
before probing, or probe transition-free elements.

Gotcha: the `colorScheme` trick only flips `light-dark()` values. Tokens
that swap via the `prefers-color-scheme` media query instead (image-valued
tokens like `--check-glyph` — `light-dark()` is colors-only) will NOT
flip. Probing those needs real scheme emulation: the repo's Playwright
rig (`emulateMedia`) or an OS-level toggle.

Gotcha: aside tabs cache **both** the HTML and the stylesheet across
invocations — probes can silently run against stale files (symptom:
selectors find nothing, or new rules don't apply while old ones do).
`tools/serve.ts` sends no-store which prevents this for fresh loads; if a tab
still looks stale (or the server was started with plain http.server),
bust both by hand:

```js
const p = await openTab('http://localhost:8471/demo.html?f=' + Date.now());
await p.evaluate(() => {
  document.querySelector('link[rel=stylesheet]').href = 'mica.css?v=' + Date.now();
});
await sleep(400);
```

## Channel 2 — accessibility tree (structure claims)

`snapshot(page)` returns the a11y tree. Mica's core claim — custom elements
are transparent to assistive tech, pages read as plain headings/regions/
text with no library residue — is testable here. Run when adding elements
or changing markup contracts. Red flags: generic wrappers swallowing
content, missing heading levels, interactive elements not exposed as such.

Print the full tree; do not slice it (the repl warns if you do).

## Channel 3 — delegated visual review (judgment calls)

Screenshots cannot be viewed directly (artifacts live in aside's ephemeral
session dir and the agent's tools are text-only). For visual judgment,
delegate to the multimodal Aside agent with a **specific, terse rubric**:

```bash
aside exec "Open http://localhost:8471/demo.html — a CSS library demo.
Report tersely: 1) adjacent color-scale steps that are visually
indistinguishable; 2) contrast problems in the spot-check chips;
3) layout glitches, overlap, or wrapping artifacts anywhere. Be specific."
```

Rules of thumb:

- Ask numbered, concrete questions; open-ended "does it look good?" wastes
  the run.
- The agent sees the page in the OS color scheme. Ask it to check the other
  mode via devtools/OS toggle, or accept per-mode runs.
- Run this before committing anything that changes visuals: ramps, new
  elements, preset changes.
- Timebox: pass a generous timeout (exec runs can take 1–3 min).

## Channel 4 — shipped WebKit via the iOS Simulator (divergence hunts)

Every local engine — Playwright Chromium AND WebKit — runs ahead of
shipped iOS Safari. Three bugs invisible to channels 0–3 have shipped
this way: the `light-dark(url())` glyph drop, missing invoker commands
(iOS < 26.2), and dialog fit-content height collapsing when the body
had `flex-basis: 0%`. When a report says "broken on my iPhone" and
channels 0–3 disagree, come straight here.

The loop (no user interaction needed if a Simulator is booted):

1. Check for a booted simulator: `xcrun simctl list devices | grep Booted`
2. Write a **self-measuring scratch page** at repo root (served by
   `tools/serve.ts`): reproduce the markup, auto-trigger the state (e.g.
   `dialog.showModal()` on load — no tapping available), then after a
   settle delay measure `getBoundingClientRect`/`getComputedStyle` and
   **inject the numbers as text into the page** (monospace, ≥13px —
   they must survive screenshot + transcription).
3. `xcrun simctl openurl booted "http://localhost:8471/scratch-X.html?f=$(date +%s)"`
   (cache-bust; simulator Safari caches like any Safari)
4. `sleep 4 && xcrun simctl io booted screenshot scratch-shot.png`
   — write it into the repo dir so `tools/serve.ts` serves it
5. `aside exec "Open http://localhost:8471/scratch-shot.png … transcribe
   every monospace line exactly …"` — the multimodal agent reads the
   numbers off the image. Ask for exact transcription plus a clipping/
   layout judgment; give it the image dimensions and rough region.
6. Fix, re-run the same loop for after-numbers, then delete the scratch
   files (never commit them). Paste before/after numbers into the
   commit message.

Gotchas:

- Measurements taken before injecting the result text describe the
  *pre-injection* layout — fine (often desirable), just read them as
  such. Inject, or re-measure after injection, if you need post-state.
- `simctl` cannot tap; design scratch pages to reach the target state
  via script on load.
- aside sessions may show a stale-auth warning and still work via
  provider credentials — read past the banner.

## Known limitations

- No `file://` navigation — always serve over HTTP.
- Artifacts (`./artifacts/*.png`) are saved inside aside's session dir and
  deleted when the CLI process exits — screenshots are for the Aside
  agent's eyes within a run, not durable evidence. Durable evidence =
  computed-style probe output pasted into commit messages or chat.
- Each `aside repl`/`aside exec` invocation is a fresh ephemeral session;
  no state carries over. Pack related probes into one invocation.

## Standard pre-commit sweep

For any change touching mica.css or demo.html:

0. `bun run snapshot:check` (channel 0) — clean, or re-blessed with the
   baseline diff reviewed and committed alongside the change.
1. Probe the changed values in **both** color schemes (channel 1) — for
   anything the snapshot manifest doesn't cover (interactive states,
   new selectors not yet in the manifest).
2. If markup contracts changed: snapshot the a11y tree (channel 2).
3. If visuals changed: one `aside exec` review with a rubric (channel 3).
4. If the report involves a real device/iOS, or the change touches
   dialog/top-layer/vendor-pseudo territory: one channel-4 pass on the
   simulator — local engines do not represent shipped Safari.
5. Fix, re-run the failing channel, then commit.
