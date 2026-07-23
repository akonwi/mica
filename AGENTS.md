# mica — agent guide

CSS-first component library: custom element tags + styled native elements,
nearly no JS. Read [VISION.md](VISION.md) (philosophy), [TIERS.md](TIERS.md)
(where behavior is allowed to come from), [ROADMAP.md](ROADMAP.md) (state).

## File map

- `mica.css` — the entire library. One file, four layers:
  `@layer mica.tokens, mica.preset, mica.elements, mica.layout`.
- `field.js`, `select.js` — Tier-2 modules. Plain ES modules, one file per
  component, self-defining, no shared runtime.
- `demo.html` — kitchen-sink testbed (every component on one page). This is
  what the feedback loop probes.
- `index.html`, `docs/*.html` — paginated docs. **Generated** by
  `tools/build-docs.py`; edit the generator and rerun it, never the output.
- `serve.py` — dev server on :8471 with caching disabled. Always use it;
  plain `python3 -m http.server` serves stale files to browsers and probes.
- `mockups/` — committed design explorations (see the `mockups` skill).

## Non-negotiable working rules

1. **Verify rendered output, not source.** After any change to `mica.css`
   or markup, run the `mica-feedback-loop` skill: computed-style probes in
   **both** color schemes, the **parse-error canary** (probe the file's
   last rule block — a syntax error silently kills everything after it),
   and a delegated visual review when visuals changed. Evidence goes in
   the commit message.
2. **Consumers get no build step.** Artifacts are plain HTML + CSS + ES
   modules; view-source is part of the product. Repo-side generators are
   fine; runtimes, bundles, and preprocessors are not.
3. **Tier discipline** (TIERS.md): never fake interactive behavior in CSS.
   If accessibility requires JS, it's an opt-in Tier-2 module that
   *enhances working markup, never renders it*.
4. **Design explorations go through the `mockups` skill**: real pages in
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
- glimpse URL windows wrap pages in an iframe; the bridge lives in the
  wrapper (see the global `glimpse-visuals` skill).
