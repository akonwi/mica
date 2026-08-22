# Progressive by design

Mica is a **progressive component library** — progressive as in progressive
enhancement. Every component starts from markup that works, and each layer
added — CSS, the browser's native behavior, an optional JS module — enhances
it. Remove a layer and things get plainer, never broken.

Every component states what it needs. The level is determined by one
question: **where does the behavior come from?** Not how complex the
component is — where the behavior lives.

A component coming to need *less* as the platform improves is a release
highlight. The levels are a map of the platform's progress.

## CSS-only — the behavior is CSS itself

**Test:** could this work as an unregistered custom tag with a stylesheet
and nothing else, with no behavioral claims being faked?

Components whose entire job is visual/spatial: layout, spacing, decoration.
There is no interaction contract, so there is nothing to fake. With JS
disabled, nothing degrades because there was nothing to degrade.

Lives here:

- The stacks: `m-vstack`, `m-hstack`, `m-zstack`
- `m-center`, `m-box`, `m-grid`, `m-sidecar`, `m-switcher`, `m-reel`,
  `m-frame`, `m-cover`, badges, avatars — anything that is "a styled box"
- Boundary note: `m-reel` scrolls and snaps, which *feels* behavioral —
  but scrolling is the browser's and snap is CSS. CSS-only.
- Avatar initials and native images are complete CSS-only content. The
  optional `avatar.js` module changes initials paint to a locally generated,
  seed-deterministic face; it adds no behavior or semantics, so it does not
  move the component into the JS-enhanced level.

## Native behavior — the behavior is a native element's

**Test:** does the browser ship the interactive behavior, such that mica
contributes only CSS plus a documented markup pattern?

The component here is often not a custom element at all — it is a recipe:
"write this native markup, mica's CSS makes it good." A custom tag may
appear as a styling wrapper, but it is inert. Delete mica's stylesheet and
the thing still functions, just plainer.

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
- Sneaky wins people assume need JS: validation styling (`:user-invalid`,
  `:has()`), segmented controls (restyled radio group)

The discipline: if the native element's keyboard/focus/ARIA behavior isn't
actually there, we do not paper over it with CSS that looks right. That is
the line into JS-enhanced.

## JS-enhanced — the behavior requires script, honestly

**Test:** does the *accessible* version of this pattern require JS —
roving tabindex, ARIA state wiring, live announcements, filtering logic?

Then it ships as a real registered custom element that **enhances working
light-DOM markup, never renders it**. Server HTML is complete and
meaningful before the definition loads; the JS upgrades it. Each
enhancement module is its own opt-in import. There is no shared runtime.

The list must stay embarrassingly short:

- **Tabs** (`tabs.js`) — roving tabindex, arrow keys, `aria-selected`
  wiring. The CSS-only radio hack looks like tabs and is a11y-broken;
  that is exactly the fake we refuse.
- **Combobox** (`combobox.js`) — filtering, active-descendant,
  announcements
- **Field validation** (`field.js`) — declarative error placement
- **Toast queueing** (`toast.js`) — display is native behavior (popover);
  queue management, timeouts, and announcements are script
- **Select alignment** (`select.js`), **drawer gestures + managed scrim**
  (`drawer.js`)

## Why the boundaries earn their keep

- **CSS-only / native-behavior boundary** = "is there an interaction
  contract?" Keeps the CSS-only set honest: no CSS that simulates
  interactivity.
- **Native / JS-enhanced boundary** = "does accessibility require script?"
  The anti-fake line — and the platform's frontier. Invoker commands
  already moved menus from JS-enhanced to native; a native tabs element
  would nearly empty the JS-enhanced list.

Styled native elements are the product. CSS-only is the proof of concept,
JS-enhanced the honest appendix — and "delete the stylesheet and it still
works" is the claim that makes the whole thing progressive rather than
merely small.
