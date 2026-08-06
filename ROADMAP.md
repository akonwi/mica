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

- [x] Button (`data-variant="primary|ghost|danger"` and
      `data-size="small|large"`; former class names remain compatibility aliases)
- [x] Inputs, textarea (`field-sizing`), basic select — one control
      family with buttons; `:user-invalid` wired to danger roles
- [x] Checkbox, radio, switch — drawn (`appearance: none`), one family
      with buttons/fields; switch is `role="switch"` on a checkbox
- [x] Select — `appearance: base-select` picker/options/checkmark/caret
      styled with mica vocabulary (Chromium); native picker elsewhere;
      UA positioning kept (fighting it clips)
- [x] Fieldset, label, legend conventions — plain (shadcn-school): a
      titled group, not a bordered box; fieldset:disabled dims labels;
      disabled+checked controls desaturate
- [x] Progress, meter — thin square bars (shadcn-school): primary/20
      track + primary fill; meter grades through the status roles
- [x] Tables, lists, code (+ kbd, blockquote, hr) — shadcn-school
      table (horizontal borders, muted header, hover rows), muted
      markers, chip/pre/keycap code family

Exit criterion: a plain HTML form page looks designed, zero classes.
**Phase 3 complete.**

## Phase 3.5 — design language adoption ✓

- [x] Mica's default theme is the author's design language (square,
      pure grays, near-black primary, one blue accent, orange warning) —
      ported from the maestro/ranger projects onto knobs → scales → roles
- [x] Primary role indirection (`--color-primary` + derived hover/active
      via color-mix); accent reserved for focus/selection/checkmarks
- [x] Square radio ("square target", mockup-selected); switch square incl.
      thumb; escape hatches documented in css comments at point of change

## Phase 4 — Tier 1 patterns

- [x] `<dialog>` — modal + drawer (`data-drawer`; `.drawer` alias), zero JS via
      invoker commands + `form method=dialog`; enter/exit animations
      (`@starting-style` + allow-discrete) incl. backdrop fade; new
      `--color-surface-overlay` role for top-layer elevation in dark
- [x] Accordion — `<details name>` exclusive groups, shadcn look
      (border-per-item, rotating chevron, hover underline); height
      animation via `::details-content` + `interpolate-size`, instant
      where unsupported
- [x] Popover menus + tooltips — `popover` + `popovertarget`, anchored
      to the invoker via position-area behind @supports (UA-centered
      fallback); `.menu` popovers with accent-highlight items that close
      declaratively (`popovertargetaction=hide`); CSS-only `[data-tip]`
      tooltips (inverted chip, delayed show, instant hide)
- [x] Toast display — corner-pinned `popover="manual"` + role=status;
      status-edge variants; slide-up enter, declarative dismiss via the
      shared corner X (queueing/auto-dismiss remain Tier 2)

Each ships as markup recipe + CSS. "Delete the stylesheet and it still
works" is the demo.
**Phase 4 complete.**

## Phase 5 — Tier 2, the honest appendix

- [x] Declarative field errors (`field.js`) — first Tier-2 module;
      Base-UI-style `<m-error match>`, no browser bubbles, CSS fallback
- [x] Select picker alignment (`select.js`) — selected option overlays
      the trigger; JS ships one number, CSS anchors do the rest
- [x] Tabs (`tabs.js`) — m-tabs enhances nav+sections markup; full
      tablist semantics, roving tabindex, automatic activation;
      no-JS state is all panels visible in order
- [x] Combobox (`combobox.js`) — datalist upgraded to the ARIA pattern;
      no-JS state is native autocomplete
- [x] Toast queue (`toast.js`) — stacking via one offset number per
      toast (CSS owns reflow motion), auto-dismiss w/ hover-pause,
      `toast()` spawn helper with post-dismiss cleanup
- [x] Packaging: per-component JS imports, no shared runtime (exports map in package.json, v0.1.0)

## Ongoing — infrastructure

- [x] v0.1.0 tagged; CDN live via jsDelivr (`gh/akonwi/mica@v0.1.0`);
      first production consumer: akonwi.io (quiet theme retrofit)
- [x] npm: `@akonwi/mica@0.1.0` published; jsDelivr + unpkg npm URLs live
- [x] Docs shell built with mica itself — paginated reference-rail docs
      (`index.html` + `docs/*.html`, stamped by `tools/build-docs.py`);
      kitchen-sink testbed lives on as `demo.html`
- [x] Docs published at https://akonwi.io/mica/ (GitHub Pages; the repo
      root is the site — no build artifact, the checkout deploys as-is)
- [x] Markup-contract semver policy u2014 internal, in AGENTS.md (API surface & semver)
- [x] Tier-0 stragglers: `m-frame`, `m-cover`
- [x] Badge (`m-badge`, Tier 0) + segmented radio group (`m-segmented`, Tier 1)
- [x] Browser support: stance stated in README; degradation documented per component (decided against a central matrix — second copy would drift)

## Backlog — Tier 3 (heavier JS, feel-polish)

A proposed tier *beyond* the current taxonomy. Tier 2 spends JS only
where accessibility requires it and keeps modules tiny; Tier 3 would
spend JS for premium *feel* — the vaul/framer-tier polish — as an
explicit, opt-in trade against the near-zero-JS ethos. Each still
enhances working Tier-0/1/2 markup; without it you get the CSS-only
experience already shipped.

Surfaced while polishing the mobile drawer (the CSS-only version is
shipped and accepted; these are the "more" it can't cheaply reach):

- [ ] **Managed overlay scrim.** Replace the box-shadow/`::backdrop`
      scrim with a JS-controlled overlay element, so the dim can be
      coupled to a drag in real time (lightens as you pull) and fade
      cleanly on every engine — including the iOS modal, whose native
      `::backdrop` can't fade on exit (iOS drops the top layer before
      the `overlay` transition runs).
- [ ] **Drag-anywhere dismissal** on the sheet (not just the handle),
      with the scroll-vs-drag heuristics that requires (vaul's hardest
      code, deliberately skipped in `drawer.js` v1).
- [ ] **Spring / inertia** on release instead of a fixed-duration
      transition; velocity-aware settle.
- [ ] **Snap points** (peek / half / full) for the bottom sheet.

Discipline to keep if this tier happens: still degrade to the shipped
CSS experience with no module; still per-component, no shared runtime;
name the trade honestly (this is where mica stops being "nearly no JS").
