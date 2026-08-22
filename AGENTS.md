# mica — agent guide

CSS-first component library: custom element tags + styled native elements,
nearly no JS — a *progressive component library* (progressive enhancement:
each layer enhances working markup). Read [VISION.md](VISION.md)
(philosophy), [PROGRESSIVE.md](PROGRESSIVE.md) (where behavior is allowed
to come from: CSS-only / native behavior / JS-enhanced),
[ROADMAP.md](ROADMAP.md) (state).

## File map

- `mica.css` — the entire library. One file, four layers:
  `@layer mica.tokens, mica.preset, mica.elements, mica.layout`.
- Root `*.js` files — opt-in enhancement modules. Plain ES modules, one file
  per component, self-defining, no shared runtime. `avatar.js` is the generated
  exception: edit `tools/avatar.js`, then run `bun run build:avatar` to bundle
  Blobatar for direct browser use.
- `demo.html` — kitchen-sink testbed (every component on one page). This is
  what the feedback loop probes.
- `index.html`, `docs/*.html` — paginated docs. **Generated** by
  `tools/build-docs.py`; edit the generator and rerun it, never the output.
- `serve.py` — dev server on :8471 with caching disabled. Always use it;
  plain `python3 -m http.server` serves stale files to browsers and probes.
- `tools/snapshot.ts` — snapshot tests (bun + Playwright, repo-side dev
  deps only; never shipped): computed styles + interactive states + axe
  pass + element-crop visual diffs (pixels ONLY where computed styles
  lie: vendor pseudos, drawn glyphs — cropped in BOTH Chromium and
  WebKit; engines disagree about exactly that territory). Baselines in
  `tools/snapshots/`
  (JSON + PNGs, macOS-blessed). `bun run snapshot:check` diffs;
  `bun run snapshot` re-blesses.
- `mockups/` — *live* design explorations only; emptied once a decision
  is folded in (git history is the record). See the `mockups` skill.

## Non-negotiable working rules

1. **Verify rendered output, not source.** After any change to `mica.css`
   or markup, run the `mica-feedback-loop` skill: computed-style probes in
   **both** color schemes, the **parse-error canary** (probe the file's
   last rule block — a syntax error silently kills everything after it),
   and a delegated visual review when visuals changed. Evidence goes in
   the commit message.
2. **Snapshot check before every commit touching `mica.css` or
   `demo.html`:** `bun run snapshot:check` (every design token + curated
   element styles, both schemes, canary asserted; first run:
   `bun run snapshot:setup`). Unexpected diff = regression:
   fix it. Intentional diff = re-bless (`bun run snapshot`) and
   commit the baseline change WITH the CSS change — the baseline diff is
   the reviewable impact analysis. New components get probe manifest
   entries in the same commit.
3. **Consumers get no build step.** Artifacts are plain HTML + CSS + ES
   modules; view-source is part of the product. Repo-side generators are
   fine; runtimes, bundles, and preprocessors are not.
4. **Enhancement discipline** (PROGRESSIVE.md): never fake interactive
   behavior in CSS. If accessibility requires JS, it's an opt-in
   enhancement module that *enhances working markup, never renders it*.
5. **Design explorations go through the `mockups` skill**: real pages in
   `mockups/` against the real `mica.css`, presented via glimpse, decision
   before implementation.

## CSS conventions

- **Tokens for every design decision.** Components reference semantic roles
  (`--color-primary`, `--color-border`…), never raw scale steps or literal
  values. Theming must stay "swap token values".
- **Attributes only set custom properties; rules only read them.**
  `<m-vstack gap="lg">` and `style="--gap: 2rem"` are the same mechanism.
- **Specificity discipline:** base structure is zero-specificity
  (`:where()`), source order resolves; state selectors (`:checked`,
  `:hover`) carry natural specificity, and overrides of state must match
  it. Both failure modes have bitten — see comments in `mica.css`.
- **Vendor pseudo-elements get their own rules** — one unknown selector in
  a list invalidates the whole rule.
- **Escape hatches are documented at the point of change**: when a default
  displaces an alternative (round radio, colorful primary, un-square), the
  alternative lives as a theme snippet in a CSS comment right there.

## API surface & semver (internal policy)

Light DOM means markup is API. This is the line between "users may depend
on it" and "we may change it." The `mica-release` skill applies this at
release time; this is the reference.

**API surface — changing any of these is a breaking change** (pre-1.0:
allowed in a *minor* bump, but must be called out in release notes with a
migration line; post-1.0: major):

- Element names and their attribute vocabularies, including each
  enumerated value (`gap="sm|md|…"`) and boolean attributes (`wrap`)
- Positional child contracts (`m-sidecar` first/last-child roles)
- Variant and size class names on native elements (`.primary`, `.small`)
- Token *names* and *semantics*: role meanings, scale-step meanings
  (step 6 = default border), knob names (`--hue`, `--status-chroma`)
- Layer names and order (`mica.tokens, mica.preset, mica.elements,
  mica.layout`) — consumers order their own layers against these
- Documented markup anatomy in `docs/` recipes (dialog structure,
  `m-field`/`m-error match`, tabs markup) — if a docs page shows it,
  it's frozen
- Enhancement-module contracts: attributes read, events fired, enhancement
  behavior when JS is absent
- Browser-support floor (dropping a fallback is breaking)

**Not API — changeable in any release:**

- Exact color values behind a step/role — step *semantics* are frozen,
  the OKLCH numbers are tunable (visible repaints still deserve a
  release-note line)
- Selector implementation, specificity strategy, internal custom
  properties not shown in docs (`--m-sel-index` and friends)
- Preset opinions' exact values (rhythm sizes, focus-ring width) — same
  repaint courtesy applies
- docs/demo/tools, file layout beyond the published `exports` entries

**Gray zone rule:** if unsure whether something is depended-upon, it's
API. When a change is desirable but breaking, prefer additive (new value,
new attribute) + deprecation note over mutation.

## Design language (the default theme)

Square (radius tokens = 0), pure neutral grays, near-black `--color-primary`
(inverts in dark), one blue accent reserved for focus/selection/checkmarks,
orange warning. Dark mode is `light-dark()` + `color-scheme` — no classes.
Checked-state grammar: checkbox = fill + glyph, radio = fill + pip,
switch = fill + block. Field text never drops below 16px (iOS zoom).

## Gotchas that already cost time

- CSS parse errors kill only *trailing* rules — hence the canary.
- Aside browser tabs cache HTML **and** CSS; `serve.py` sends no-store,
  but cache-bust probe URLs anyway.
- `getComputedStyle` lies about vendor pseudos (returns element styles) —
  verify progress/meter/picker visually.
- `light-dark()` accepts **colors only**. Feeding it `url()`s is invalid:
  Chromium computes it to `none` yet paints a *degraded* glyph, iOS Safari
  drops it entirely. Image-valued tokens swap schemes via the
  `prefers-color-scheme` media query in the tokens layer instead — which
  also means the `colorScheme`-style forcing trick does NOT flip them;
  use `emulateMedia`/OS scheme when probing them.
- glimpse URL windows wrap pages in an iframe; the bridge lives in the
  wrapper (see the global `glimpse-visuals` skill).
- **Both test engines (Playwright Chromium AND WebKit) run ahead of
  shipped Safari.** Invoker commands worked in every local test while
  iOS 26.0 had no support (landed 26.2) — the rig cannot catch
  not-yet-shipped platform features. Before using anything Baseline
  *newly*-available in a recipe, check `web-features` data and either
  provide a fallback/shim (see `invoker.js`) or don't use it. For
  rendering divergence on shipped iOS, use the feedback-loop skill's
  channel 4 (iOS Simulator + self-measuring scratch page).
- Shipped iOS sizes a dialog's fit-content height from children's
  flex-basis: `flex: 1` (basis 0%) collapses the body to a scroll
  strip. Use `flex: 1 1 auto` in top-layer composition (see the
  comment at the dialog body rule).
- **iOS lacks the `overlay` property and its top-layer transitions are
  broken.** Two consequences, both bit: (1) a popover/dialog with an
  `@starting-style` entrance *freezes at the start styles* on iOS
  (`opacity:0` = invisible) with no reflow to kick it — this is why
  toasts "didn't work". Gate top-layer entrance animations behind
  `@supports (overlay: auto)` so iOS renders at the resting state
  instead of vanishing. (2) `overlay` won't transition on *exit*, so
  `::backdrop` is dropped from the top layer instantly on close — can't
  be faded; the mobile drawer paints its scrim from the sheet element
  (100vmax box-shadow) instead. `@supports (overlay: auto)` is the
  reliable iOS-vs-not discriminator for these.
