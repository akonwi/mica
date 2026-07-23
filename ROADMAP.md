# Roadmap

Sequencing logic: color tokens block elements (a button can't look good
without color opinions); elements block patterns (buttons appear inside
dialogs). Infrastructure interleaves — don't batch it.

## Phase 1 — foundation ✓

- [x] Tier 0 layout primitives: `m-vstack`, `m-hstack`, `m-zstack`,
      `m-center`, `m-box`, `m-grid`, `m-sidecar`, `m-switcher`, `m-reel`
- [x] Space/size tokens
- [x] Preset (constructive defaults: rhythm, focus ring, media, motion)
- [x] `@layer` architecture, user CSS always wins
- [x] Tier system documented (TIERS.md)

## Phase 2 — color tokens & theming architecture

- [x] Neutral scale + one accent (OKLCH, derived from hue/chroma knobs)
- [x] Semantic roles — components only ever touch roles
      (`--color-surface`, `--color-text`, `--color-border`,
      `--color-accent`, `--color-on-accent`, …)
- [x] Dark mode via `color-scheme` + `light-dark()` — no class toggling,
      native controls themed free
- [x] Decide: status colors ship as **hue knobs + semantic roles**
      (`--danger-hue` etc., own `--status-chroma`, no full scales)

## Phase 3 — `mica.elements`: buttons & forms

- [x] Button (variant syntax decided: **classes** — `class="primary"`;
      TS/JSX-safe, validator-safe, `@layer` defuses collisions)
- [x] Inputs, textarea (`field-sizing`), basic select — one control
      family with buttons; `:user-invalid` wired to danger roles
- [x] Checkbox, radio, switch — drawn (`appearance: none`), one family
      with buttons/fields; switch is `class="switch"` on a checkbox
- [ ] Select (`base-select` where available, graceful fallback)
- [x] Fieldset, label, legend conventions — bordered group w/ legend in
      the gap; fieldset:disabled dims labels; disabled+checked controls
      desaturate (same color-mix recipe as disabled .primary)
- [ ] Progress, meter
- [ ] Tables, lists, code

Exit criterion: a plain HTML form page looks designed, zero classes.

## Phase 4 — Tier 1 patterns

- [ ] `<dialog>` — modal + drawer, `@starting-style` exit animations
- [ ] Accordion — `<details name>` exclusive groups
- [ ] Popover menus + tooltips — invoker commands, anchor positioning
      behind fallbacks (first real test of the baseline stance)
- [ ] Toast display (queueing is Tier 2)

Each ships as markup recipe + CSS. "Delete the stylesheet and it still
works" is the demo.

## Phase 5 — Tier 2, the honest appendix

- [x] Declarative field errors (`field.js`) — first Tier-2 module;
      Base-UI-style `<m-error match>`, no browser bubbles, CSS fallback
- [ ] Tabs (`mica/tabs.js`)
- [ ] Combobox
- [ ] Toast queue
- [ ] Packaging: per-component JS imports, no shared runtime

## Ongoing — infrastructure

- [ ] npm publish + CDN (early — surface `@layer` surprises with 5 users,
      not 500)
- [ ] Docs site built with mica itself (view-source is the marketing)
- [ ] Markup-contract semver policy, written before first external user
- [ ] Tier-0 stragglers: `m-frame`, `m-cover`
- [ ] Browser-support checklist per feature
