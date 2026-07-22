# The tier system

Every mica component states its tier. The tier is determined by one
question: **where does the behavior come from?** Not how complex the
component is — where the behavior lives.

Moving a component *down* a tier as the platform improves is a release
highlight. The tiers are a map of the platform's progress.

## Tier 0 — the behavior is CSS itself

**Test:** could this work as an unregistered custom tag with a stylesheet
and nothing else, with no behavioral claims being faked?

Components whose entire job is visual/spatial: layout, spacing, decoration.
There is no interaction contract, so there is nothing to fake. With JS
disabled, nothing degrades because there was nothing to degrade.

Lives here:

- The stacks: `m-vstack`, `m-hstack`, `m-zstack`
- `m-center`, `m-box`, `m-grid`, `m-sidecar`, `m-switcher`, `m-reel`
- Future: `m-frame` (aspect-ratio media), `m-cover` (full-height hero),
  badges, dividers, skeletons, avatars — anything that is "a styled box"
- Boundary note: `m-reel` scrolls and snaps, which *feels* behavioral —
  but scrolling is the browser's and snap is CSS. Tier 0.

## Tier 1 — the behavior is a native element's

**Test:** does the browser ship the interactive behavior, such that mica
contributes only CSS plus a documented markup pattern?

The component here is often not a custom element at all — it is a recipe:
"write this native markup, mica's CSS makes it good." A custom tag may
appear as a styling wrapper, but it is inert. Delete mica's stylesheet and
the thing still functions, just ugly.

Lives here:

- **Dialog/modal** — `<dialog>`: focus trap, Esc, `::backdrop`, top layer
- **Accordion/disclosure** — `<details>`/`<summary>`, exclusive via `name`
- **Menus, tooltips, toast display** — `popover` + invoker commands,
  anchor positioning behind fallbacks
- **All form controls** — button, input, textarea (`field-sizing`),
  checkbox, radio, switch (restyled checkbox), range, progress, meter
- **Select** — `appearance: base-select` where available, graceful native
  select elsewhere
- **Nav patterns, tables, lists, typography**
- Sneaky Tier-1 wins: validation styling (`:user-invalid`, `:has()`),
  segmented controls (restyled radio group)

The discipline: if the native element's keyboard/focus/ARIA behavior isn't
actually there, we do not paper over it with CSS that looks right. That is
the line into Tier 2.

## Tier 2 — the behavior requires script, honestly

**Test:** does the *accessible* version of this pattern require JS —
roving tabindex, ARIA state wiring, live announcements, filtering logic?

Then it ships as a real registered custom element that **enhances working
light-DOM markup, never renders it**. Server HTML is complete and
meaningful before the definition loads; the JS upgrades it. Each Tier-2
component is its own opt-in module. There is no shared runtime.

The list must stay embarrassingly short:

- **Tabs** — roving tabindex, arrow keys, `aria-selected` wiring. The
  CSS-only radio hack looks like tabs and is a11y-broken; that is exactly
  the fake we refuse.
- **Combobox/autocomplete** — filtering, active-descendant, announcements
- **Toast queueing** — display is Tier 1 (popover); queue management,
  timeouts, and announcements are script
- Maybe: carousel *controls* (the reel is Tier 0; prev/next buttons and
  indicators are script), listbox/multiselect until the platform catches up

## Why the boundaries earn their keep

- **Tier 0/1 boundary** = "is there an interaction contract?" Keeps Tier 0
  honest: no CSS that simulates interactivity.
- **Tier 1/2 boundary** = "does accessibility require script?" The
  anti-fake line — and the platform's frontier. CSS carousel features may
  pull carousels 2→1; invoker commands already pulled menus 2→1; a native
  tabs element would nearly empty Tier 2.

Tier 1 is the product. Tier 0 is the proof of concept, Tier 2 the honest
appendix — but styled native elements are where mica competes, and where
"delete our stylesheet and it still works" is most startling.
