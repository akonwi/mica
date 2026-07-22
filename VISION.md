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
`<m-stack>` needs zero JS to exist — it is a semantic styling hook. Behavior
comes from the browser, not from a runtime.

## Positioning

**The substrate you'd build a shadcn on.** Open markup you can see and
restyle. No wrapper abstraction. A neutral core that a themed component kit
can be layered over — copy the markup, restyle it, own it.

## The three tiers

Every component states its tier. Moving a component *down* a tier as the
platform improves is a release highlight.

- **Tier 0 — pure CSS, custom tags.** Layout primitives (`<m-stack>`,
  `<m-cluster>`, `<m-grid>`…). No registration, no JS, SSR-trivial, works
  with JS disabled.
- **Tier 1 — styled native elements.** Dialog, details/accordion, popover
  menus, tooltips, select. The behavior is the browser's; mica is CSS plus
  documented markup patterns.
- **Tier 2 — tiny opt-in enhancement.** The honest short list where the
  platform still has gaps (combobox filtering, tabs keyboard semantics).
  Light-DOM custom elements that *enhance* working markup, never render it.

Never fake behavior in CSS. If a pattern requires JS to be accessible
(roving tabindex, ARIA wiring), it is Tier 2 or it doesn't ship.

## Principles

1. **Light DOM, always.** Shadow DOM never guards anything a user might want
   to style. Internal markup structure is public API, handled with documented
   markup contracts and semver — not encapsulation. (Narrow exception
   permitted in Tier 2 for genuinely private machinery, e.g. a live-region
   announcer.)
2. **User CSS always wins — by physics, not promise.** All mica styles ship
   inside `@layer mica.*`. Unlayered user CSS beats layered CSS by spec.
   No specificity wars, ever.
3. **Neutral core.** No colors, no fonts, no look. Mica's only opinion is a
   token vocabulary (spacing, sizes). Users — or kits built on mica — bring
   the aesthetic.
4. **Framework-agnostic by absence.** No props, no events, no registration
   in Tier 0–1 means there is no interop surface at all. React, Svelte, a Go
   template, a Markdown SSG: identical usage.
5. **Attributes are the vocabulary, custom properties are the escape hatch.**
   `<m-stack gap="lg">` for the enumerated token vocabulary;
   `style="--gap: 2.5rem"` for arbitrary values. Both converge on the same
   mechanism: attributes only set custom properties.

## Browser baseline

Baseline widely-available. `popover`, `<dialog>`, `:has()`, `@layer`,
container queries: assumed. Anchor positioning, customizable select: used
behind graceful fallbacks until they land everywhere.

## Naming

- Library: **mica** — a mineral that is thin, transparent, layered, and an
  insulator. Raw mica comes in "books" that cleave into "sheets."
- Tag prefix: **`m-`** (`<m-stack>`, `<m-cluster>`). Terse tags; the markup
  barely looks like a library is present.
- Infrastructure stays legible: `@layer mica.tokens, mica.layout;` and
  descriptive token names (`--space-lg`).

## Non-goals

- Not a utility-class framework.
- Not a themed design system (kits on top of mica can be).
- Not a JS component runtime. JS is a last resort, opt-in, and per-component.

## Roadmap

1. **v1 — Tier 0.** ~8 layout primitives, one small CSS file, zero JS.
   Prove the model: same markup in every framework, view-source shows
   nothing but HTML and a stylesheet.
2. **Tier 1.** Styled native controls and patterns: dialog, accordion,
   popover menus, tooltips, forms.
3. **Tier 2.** The short honest list of enhanced components.

Tagline candidate: *"a soupçon of JavaScript."*
