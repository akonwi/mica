# Mica's design language

Read this when building a proposal or a spec, or before briefing the
`designer` subagent (pass it along).

## Look

- Square corners: radius tokens are 0. Rounded is a theme snippet
  (`--radius-sm: .25rem; --radius-md: .375rem; --radius-lg: .75rem`).
- Pure neutral grays: `oklch(L 0 var(--hue))`, hue 263 at chroma 0.
- `--color-primary` is near-black and inverts to near-white in Dark.
  It's the action color. Colorful primary is a theme snippet.
- One blue accent, reserved for focus and selection: focus ring,
  highlights, the selected-tab rule, the select picker's checkmark.
  Checkbox, radio and switch checked fills ride primary, not the accent.
- Warning is orange; danger is red (hue 25); success is green. Status
  roles come in surface / border / solid / on / text.
- Type is UI-centered: `--text-md` (14px) is the interface default.
  Field text never drops below 16px on touch pointers (iOS zoom).

## Behavior and states

- Dark mode is `light-dark()` + `color-scheme`, with no classes. Every
  design needs a Dark panel built from `--dark-*` tokens.
- Hover and pressed states are derived tokens
  (`--color-primary-hover/-active`, `--color-danger-hover/-active`,
  `--color-fill-hover/-active`). A theme that changes the base color
  gets matching states.
- Disabled is the same fill at opacity 0.55. Danger disabled mixes toward
  the border color.
- Checked-state grammar: checkbox = fill + glyph, radio = fill + pip,
  switch = fill + block.
- Overlay rows (menus, popover menus, header/nav panels, command,
  combobox, breadcrumbs menu) hover with the overlay row mix
  (`--color-text` 8% over `--color-surface-overlay`). Never use
  `--color-surface-raised` there; it equals the overlay surface in Dark.
- Popovers and menus open 4px below their trigger, aligned to its start
  edge. Combobox lists open 8px below.
- A ghost button has no rest affordance on purpose: toolbars and icon
  rows, never the only action on a page.

## Structure and API

- Custom element tags plus styled native elements; nearly no JS. Light DOM
  means markup is API (AGENTS.md "API surface & semver"). Prefer
  additive changes (a new value or attribute) over renaming.
- Attributes only set custom properties; rules only read them.
  `gap="lg"` and `style="--gap: 2rem"` are the same mechanism.
- Never fake interactive behavior in CSS. Behavior that accessibility
  needs is an opt-in enhancement module that enhances working markup
  and never renders it (PROGRESSIVE.md).
- Drawn controls put no pseudo-elements on inputs.
- When a default displaces an alternative, the alternative ships as a
  theme snippet in a CSS comment at the point of change.
