# Changelog

## v0.6.0 — 2026-08-07

### Changed

- **Toast is now `<m-toast>`** rather than a styled `<div>`. Migrate
  `<div class="toast" popover="manual" data-variant="…" data-duration="…">`
  to `<m-toast popover="manual" variant="…" duration="…">`. The native
  popover and `role="status"` contracts are unchanged; `toast()` now creates
  and returns the custom element.

## v0.5.0 — 2026-08-06

### Removed

- **Legacy presentation classes** retained by v0.4.0 are no longer styling
  aliases. Migrate button and menu variants to `data-variant`, button sizes to
  `data-size`, toast statuses to `data-variant`, drawers to `data-drawer`,
  checkbox switches to `role="switch"`, and cover principals to
  `data-principal`.
- **Generated toast status classes** are no longer emitted by `toast()`.
  Read or target `data-variant` instead; pass `variant: "warning"` rather than
  the former `"warn"` class vocabulary. The structural `.toast` class remains.

## v0.4.0 — 2026-08-06

### Added

- **Button data-attribute API**: native buttons use
  `data-variant="primary|ghost|danger"` and `data-size="small|large"`.
  The same attributes can compose with `.btn` links. The former variant
  and size class names remain compatibility aliases.
- **Toast data-attribute API**: declared and generated toasts use
  `data-variant="success|warning|danger"` for their status edge, aligning
  warning vocabulary with badges. The former `.success`, `.warn`, and
  `.danger` classes remain compatibility aliases; `toast()` also preserves
  generated status classes during the migration. Auto-dismiss configuration
  uses `data-duration`; the former `duration` attribute remains supported.
- **Drawer data attribute**: `data-drawer` turns a native `<dialog>` into
  mica's responsive drawer/bottom sheet. The former `.drawer` class remains
  a compatibility alias. Native-element extension attributes use the
  standards-defined `data-*` form; autonomous `m-*` elements keep their
  direct attribute vocabularies.
- **Semantic switch API**: `role="switch"` on a native checkbox now selects
  mica's switch presentation and exposes matching on/off semantics. Native
  checked state, labels, keyboard behavior, and form participation remain the
  source of truth; no `aria-checked` duplication or JavaScript is needed. The
  former `.switch` class remains a styling alias.
- **Cover principal marker**: `data-principal` marks the child that
  `<m-cover>` centers between its pinned edges, overriding the default `h1`.
  The former `.principal` class remains a compatibility alias.

## v0.3.0 — 2026-08-02

### Added

- **`[data-visually-hidden]`** — content that assistive tech reaches and
  sighted users do not: a caption the layout already implies, a heading
  that structures the document without repeating a visible title.
  `display: none` and `inline-size: 0` both drop content from the
  accessibility tree; this clips a 1px box instead. The `focusable`
  variant (`data-visually-hidden="focusable"`) hides only while
  unfocused — the skip-link primitive. On focus the rule simply stops
  matching, so the element keeps whatever styling you gave it and there
  is no undo rule to fight.

  An attribute rather than a class: `class` stays the app's, `data-*` is
  valid HTML and needs no `HTMLAttributes` augmentation in React or
  TypeScript, and `.visually-hidden`/`.sr-only` are the most
  copy-pasted names in accessibility — a project arriving with its own
  copy is the likely case, not the edge case.

  `m-segmented` now shares this rule instead of carrying its own copy of
  the same declarations; its computed styles are unchanged.

### Docs

- New **Accessibility** page (Start group): the tier boundary as an
  accessibility question, why mica never fakes behavior in CSS, the two
  hiding primitives, and what a stylesheet cannot do for you.
- The docs shell now has a skip link of its own, using the new
  primitive — ~35 rail links precede the article on every page.

## v0.2.2 — 2026-08-01

### Added

- **React JSX typings** (`types/react.d.ts`, exported as
  `@akonwi/mica/types/react`): teaches TypeScript every `m-*` element
  and its styling attributes. React 19 renders custom elements natively;
  this is types only. Vendoring consumers can copy the file alongside
  `mica.css`.

## v0.2.1 — 2026-08-01

### Fixes

- **Tabs**: the rail now collapses gracefully when narrower than its tabs.
  Labels never wrap (`white-space: nowrap`, `flex-shrink: 0`); the nav caps at
  its container's inline size and scrolls horizontally on overflow, with
  overscroll contained and a thin scrollbar where the platform shows one.

### Docs

- Tabs page gains an Overflow section with a constrained-rail example; the demo
  exercises the same case.

## v0.2.0 — 2026-08-01

### Added

- **Badge**: new Tier-0 `<m-badge>` element for quiet metadata. Attribute API:
  `variant="primary|success|warning|danger"` and boolean `count` for compact,
  tabular-numeric badges.
- **Segmented control**: new Tier-1 `<m-segmented>` recipe built from native labeled
  radios. The browser retains keyboard navigation, form values, focus, disabled
  behavior, and assistive-technology semantics; mica only fuses the presentation.

### Docs

- Added dedicated badge and segmented-control reference pages, kitchen-sink examples,
  native `<fieldset>`/`<legend>` group-labeling guidance, and distinct radio-value
  examples.

### Infrastructure

- Snapshot coverage now includes every badge variant plus segmented checked,
  disabled, and focus-visible states: 264 computed-style probes and 32 Chromium /
  WebKit visual snapshots across light and dark schemes.

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
