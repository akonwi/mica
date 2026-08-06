# mica

**Custom elements. Native behavior. Nearly no JavaScript.**

Mica is a front-end library built from custom element tags, native HTML
elements, and CSS. It provides primitives that just work — without a runtime,
without a build step, without a framework.

## Thesis

The platform got good. `<dialog>` traps focus. `popover` and invoker commands
handle menus and tooltips. `<details name>` gives exclusive accordions.
`:has()`, anchor positioning, and customizable `<select>` erase whole
categories of "state JavaScript." Most component libraries still ship JS to
reimplement things HTML and CSS now do natively.

Mica's bet: an unregistered custom element is a valid, stylable element.
`<m-vstack>` needs zero JS to exist — it is a semantic styling hook. Behavior
comes from the browser, not from a runtime.

## Positioning

**The substrate you'd build a shadcn on.** Open markup you can see and
restyle. No wrapper abstraction. The default theme is the author's own
design language (see principle 3), but every opinion is a token override
away — copy the markup, restyle it, own it.

## The three tiers

Every component states its tier. Moving a component *down* a tier as the
platform improves is a release highlight.

- **Tier 0 — pure CSS, custom tags.** Layout primitives (`<m-vstack>`,
  `<m-hstack>`, `<m-grid>`…). No registration, no JS, SSR-trivial, works
  with JS disabled.
- **Tier 1 — styled native elements.** Dialog, details/accordion, popover
  menus, tooltips, select. The behavior is the browser's; mica is CSS plus
  documented markup patterns.
- **Tier 2 — tiny opt-in enhancement.** The honest short list where the
  platform still has gaps (combobox filtering, tabs keyboard semantics).
  Light-DOM custom elements that *enhance* working markup, never render it.

Never fake behavior in CSS. If a pattern requires JS to be accessible
(roving tabindex, ARIA wiring), it is Tier 2 or it doesn't ship.

See [TIERS.md](TIERS.md) for the classification tests and component map.

## Principles

1. **Light DOM, always.** Shadow DOM never guards anything a user might want
   to style. Internal markup structure is public API, handled with documented
   markup contracts and semver — not encapsulation. (Narrow exception
   permitted in Tier 2 for genuinely private machinery, e.g. a live-region
   announcer.)
2. **User CSS always wins — by physics, not promise.** All mica styles ship
   inside `@layer mica.*`. Unlayered user CSS beats layered CSS by spec.
   No specificity wars, ever.
3. **Token-driven defaults.** Mica styles native elements directly —
   `button`, inputs, headings get quietly good defaults so a plain HTML
   page looks finished (Pico-style drop-in). But every design decision
   routes through tokens: theming is swapping token values, never
   overriding component CSS, and one theme reaches native elements and
   mica elements alike. Because everything ships in `@layer`, the defaults
   are opinions you can overrule, not decisions you inherit.

   The default aesthetic is the author's design language: square
   (radius 0), pure neutral grays, near-black primary, one blue accent
   reserved for focus/selection, orange warning. Each of those is a
   documented 1–2 line token override to change.
4. **Framework-agnostic by absence.** No props, no events, no registration
   in Tier 0–1 means there is no interop surface at all. React, Svelte, a Go
   template, a Markdown SSG: identical usage.
5. **Attributes are the vocabulary, custom properties are the escape hatch.**
   `<m-vstack gap="lg">` for the enumerated token vocabulary;
   `style="--gap: 2.5rem"` for arbitrary values. Both converge on the same
   mechanism: attributes only set custom properties. Autonomous `m-*`
   elements own direct attributes; extensions on native HTML elements use
   the standards-defined `data-*` form (`<button data-variant="primary">`).

## Browser baseline

Baseline widely-available. `popover`, `<dialog>`, `:has()`, `@layer`,
container queries: assumed. Anchor positioning, customizable select: used
behind graceful fallbacks until they land everywhere.

## Naming

- Library: **mica** — a mineral that is thin, transparent, layered, and an
  insulator. Raw mica comes in "books" that cleave into "sheets."
- Tag prefix: **`m-`** (`<m-vstack>`, `<m-hstack>`). Terse tags; the markup
  barely looks like a library is present.
- Stacks are axis-named after SwiftUI: `m-vstack`, `m-hstack` (nowrap by
  default, `wrap` opt-in) and `m-zstack` for layering. Other
  vocabulary aligns with kindred libraries where it fits (e.g. `m-sidecar`,
  after Kelp).
- Infrastructure stays legible:
  `@layer mica.tokens, mica.preset, mica.elements, mica.layout;` and
  descriptive token names (`--space-lg`).

## Non-goals

- Not a utility-class framework.
- Not a multi-theme design-system product — mica ships one opinionated
  default; kits and themes on top of it can be anything.
- Not a JS component runtime. JS is a last resort, opt-in, and per-component.

## Roadmap

Lives in [ROADMAP.md](ROADMAP.md), with checkboxes.

Tagline: *"a soupçon of JavaScript."*
