# The canvas: structure and artboard formats

Read this before creating or editing any artboard.

## File structure

- One page per tier: Foundations, Atoms, Compounds, Navigation, Overlays.
  Layout primitives get their own page when they're designed.
- Foundations holds Scales (Light, Dark), Roles (Surface, Text, Border,
  Fill, Action, Accent, plus an "In use" example), Space, size & shape
  (including the type scale), and Theming. A new role token gets a row
  under its group in Roles, in both schemes.
- Component artboards are 1440 wide, `height: fit-content`, `padding:
  64px`, `gap: 48px`, `display: flex; flex-direction: column`, background
  `--color-surface`. They sit in a row on their page, 80px apart (x = 0,
  1520, 3040, …). New artboards go at the end of the row.
- `create_artboard` ignores left/top. Set them afterwards with
  `update_styles` (`updates: [{ nodeIds, styles: { left, top } }]`).
- Find artboards by name with `get_basic_info`. Node IDs change when
  things are rebuilt; don't store them anywhere durable.

## Component artboard (the spec)

Children, in order:

1. **Header:** the component name, plus one line on what it is and its
   source files (`mica.css`, the docs page, the module if any).
2. **Light panel:** surface `--color-surface`. Sections, each a mono
   uppercase label + 1px `--color-border` rule + content:
   - **Variants:** the docs examples as they render.
   - **States:** a matrix of variant × state (rest, :hover, :active,
     :focus-visible, disabled, checked/selected/open, invalid…), with
     column headers in mono.
   - **Sizes:** only the sizes the code has.
   - **Layouts:** narrow, wrapped, RTL, scrolled, as relevant. Note the
     viewport/container width in the caption.
3. **Dark panel:** the same sections built with `--dark-*` tokens. Generate
   it from the same script as Light (see below); never restyle a copy by
   hand.
4. **Anatomy:** a 1px top rule, then three columns with 48px between them:
   - **Elements:** the markup contract, mono, `white-space: pre-wrap`.
     Then a muted paragraph on what the app owns versus what mica owns.
   - **Attributes:** attributes and values, custom properties with
     defaults, and what the enhancement module adds. Then a muted
     paragraph headed "Untokenized literals:" listing px values with
     their rem source, and how each `--derived-*` token maps to its
     code formula.
   - **Rules:** one short paragraph per part ("Frame: …", "Header: …",
     "Below 44rem: …", "module.js: …").

   Add a numbered part diagram only for components with many named
   parts (dashed `--color-accent` outlines, numbered `--color-accent`
   pills with `--color-on-accent` text, a numbered legend).

Captions under each specimen are mono 12px muted: the selector or state,
then a "·" and the key measurement or note.

Component artboards state current truth only: no "was", "now", "fixed
in", commit hashes, or before/after.

## Proposal artboard

Name it `Proposal · <topic>` and put it at the end of the relevant page's
row. Use one panel per scheme, Light then Dark. Each panel is a table:

| row label (bold) + approach (mono, muted) | rest | :hover | :active … | "what happens" (muted prose) |

- The first row is **today** (what ships), unless the component is new.
- Under each specimen, the measured value and contrast, for example
  `#a42a2b · 6.9:1`.
- Label options A, B, C… and mark the one the user picked earlier, if
  any.
- Proposals may use literal colors (they're temporary). Get them from
  `scripts/colors.ts`, never by eye.
- Delete the proposal once the decision is folded into the spec.

## Tokens

- Paper's token list mirrors `@layer mica.tokens`: the light name, plus a
  `--dark-` twin for every scheme-dependent value.
- `color-mix()` has no Paper equivalent. Make a Paper-only
  `--derived-<name>` (+ `--dark-derived-<name>`) token. Its value is the
  oklch measured with `scripts/colors.ts`; its description is the code
  formula. Re-derive it when a source token changes.
- When mica gains a real token for a stand-in, rename it:
  `set_tokens` with `newName`. Node bindings follow; Anatomy text
  doesn't, so search it with `find_nodes` (`textValue: "*derived-x*"`).
- Untokenized literals in code stay literal px on the canvas. Never invent
  a token to avoid one.

## Building artboards

- Write a small generator script (TypeScript, run with bun) per component
  that takes `light|dark` and a part name and prints Paper HTML bound to
  `var(--token)` or `var(--dark-token)`. Keep generators outside the
  repo; they're tooling, not product.
- Insert one section per `write_html` call (`mode: insert-children`) so the
  user sees progress and failures stay small.
- Compounds reuse atoms by cloning (`duplicate_nodes`) from the atom
  artboards; Paper has no components or instances.
- Pseudo-elements become named child layers ("::before glyph",
  "m-table-scroll::after · edge"), positioned absolutely inside a
  `position: relative` parent.
- Output generated by JavaScript (e.g. Blobatar colors) is mirrored as
  literals and labeled as module output, not tokens.
