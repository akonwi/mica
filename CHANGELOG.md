# Changelog

## v0.1.1 — 2026-07-23

### Fixes

- **dialog**: body collapsed to a scroll strip on shipped iOS (`flex: 1` basis 0% in
  top-layer contexts). Fixed: `flex: 1 1 auto`. (`#79c7998`)
- **dialog**: `invoker.js` shim adds `commandfor`/`command` dialog-opening support for
  Safari versions before 26.2. (`#bfeebcd`)
- **popover/toast**: `@starting-style` entrance froze at start style on iOS 26 (<26.2),
  making toasts invisible. Gated behind `@supports (overlay: auto)`. (`#22bb022`)
- **drawer (mobile)**: bottom sheet implementation with swipe gestures, avoiding
  `::backdrop` fade reliance on iOS. (`#d84e6ae`, `#3717da5`)
- **checkbox**: checkmark glyph invisible on iOS Safari — `light-dark()` accepts colors
  only; image-valued tokens now use `prefers-color-scheme` media query. (`#ba6dd3b`)
- **preset**: `prefers-reduced-motion` transition kill-switch now reaches `::backdrop`
  (was `*` selector which doesn't match pseudo-elements). (`#6e6cca4`)
- **m-reel**: keyboard-inaccessible unless a `tabindex="0"` + `role="region"` +
  `aria-label` convention is followed. Now a documented markup contract in docs and
  demo. (`#6e6cca4`)
- **demo.html**: added missing `<main>` landmark. (`#6e6cca4`)

### Added

- **Snapshot testing rig** (`tools/snapshot.ts`): 242 computed-style probes (all tokens
  + elements, both schemes), interactive state probes, axe-core pass, and 16 visual
  element-crop PNG diffs for vendor-pseudo/drawn-glyph territory. Run `bun run
  snapshot:check` pre-commit. (`14 branches merged via PR #1`)
- **iOS Simulator verification channel**: AGENTS.md gotcha section for shipped-iOS
  behavioral divergence (dialog flex, `overlay` gating, `light-dark()` image limits).
  (`#d84e6ae`)

### Docs

- **Docs site live at [akonwi.io/mica](https://akonwi.io/mica)** — GitHub Pages deploy
  workflow, paginated docs with desktop rail + mobile collapse nav. (`#eee9adb`,
  `#e35f64`)
- **Mobile docs shell**: rail collapses to sticky `<details>` menu bar at ≤52rem.
  Source-order discipline in `SHELL_CSS`. (`#eee9adb`)
- **Desktop rail**: independent scroll via `position: sticky; overflow-y: auto`.
  (`#b144eef`)

### Infrastructure

- **AGENTS.md**: API surface & semver policy documented (internal).
- **CHANGELOG.md**: created.
- **ROADMAP.md**: all items complete or closed with rationale.
- **Browser support stance**: documented in README — Baseline widely-available, newer
  features degrade gracefully per component docs.

## v0.1.0 — 2026-07-21

Initial release. See [VISION.md](VISION.md), [TIERS.md](TIERS.md).

### Tier 0 — Layout primitives (CSS only)

`m-vstack`, `m-hstack`, `m-zstack`, `m-center`, `m-box`, `m-grid`, `m-sidecar`,
`m-switcher`, `m-reel`

- Attribute → custom-property vocabulary (`gap`, `align`, `justify`, `pad`, `min`…)
- `m-hstack` is nowrap by default; `wrap` opt-in
- `m-zstack`: single-cell grid layering, `place-self` for per-child placement
- `m-sidecar`: fixed + flexible pair, `side="end"` makes last child the sidecar
  (no visual reordering)
- `m-switcher`: row→column at a threshold (calc-hack implementation)
- `m-reel`: horizontal scroll with CSS snap

### Tier 0 stragglers (added before 0.1.1)

`m-frame`, `m-cover`. Detailed in `#a53b229`.

### Preset

- Constructive defaults (Kelp-school): rhythm margins, `box-sizing: border-box`,
  tokenized `:focus-visible` ring, `prefers-reduced-motion` guard, media block
  display, `font: inherit` on form controls
- All `:where()`-wrapped inside `@layer mica.preset`

### Elements — Tier 1 (styled native elements)

- **Buttons**: default, `.primary`, `.ghost`, `.danger` class variants; `.small`/`.large`
  sizes; disabled state. Focus ring from preset. (`#61c2ed7`)
- **Inputs / textarea / select**: single control family; `field-sizing: content` on
  textarea; `:user-invalid` via danger roles
- **Checkbox / radio / switch**: `appearance: none`, drawn via pseudo-elements,
  native semantics preserved
- **Fieldset / legend**: minimal, shadcn-style

- **Progress / meter**: thin bars, status-colored
- **Tables / lists / code**: zero-class styling

### Colors — token architecture

- Two-knob system: `--hue`, `--chroma`
- 12-step Radix-convention scales (neutral + accent), theme-relative via `light-dark()`
- Semantic roles derive from scale steps
- Status colors: `--danger-hue` (25), `--success-hue` (150), `--warn-hue` (75);
  `--status-chroma` (0.14). Roles not scales: 5 roles per status.
- Dark mode via `color-scheme: light dark` — no classes, no JS

### Tier-1 patterns (zero JS)

- **Dialog**: modal + drawer variants, `@starting-style` exit animations
- **Accordion**: `<details name>` exclusive groups, `::details-content` animation
- **Popover menus + tooltips**: invoker commands (`commandfor`/`command`), anchor
  positioning behind fallbacks
- **Toast display** (queueing is Tier 2)

### Tier 2 — opt-in JS modules (each standalone, no shared runtime)

- `field.js` — `<m-field>`/`<m-error match>` declarative validation; no-JS fallback
  via `:user-invalid`
- `select.js` — macOS-style `alignItemWithTrigger` overlay
- `tabs.js` — roving tabindex, arrow keys, `aria-selected` wiring
- `combobox.js` — first-match pre-highlight, hover moves highlight (cmdk UX)
- `toast.js` — queue management with timeouts and announcements

### Distribution

- npm: `@akonwi/mica@0.1.0` — `exports` map for CSS + JS modules, zero dependencies
- CDN: jsDelivr (gh + npm) and unpkg
- Vendoring: first-class (README `curl` line)
- First two production consumers: akonwi.io (custom Ard SSG) and www.letsngoh.com
  (static HTML)

### Docs

- Vision, tiers, roadmap documented
- `demo.html` — kitchen-sink testbed
- Paginated docs generated by `tools/build-docs.py`
- Skills: `mica-feedback-loop`, `mica-release`, `mockups`

### Infrastructure

- CSS `@layer` architecture: `mica.tokens, mica.preset, mica.elements, mica.layout`
- User CSS wins by spec (unlayered beats layered)
- Light DOM only — no shadow DOM, no JS runtime
- AGENTS.md with working rules, CSS conventions, gotchas
- Release skill with semver judgment, channel verification, downstream bumps
