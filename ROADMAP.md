# Roadmap

## Backlog — feel-polish modules (heavier JS)

A proposed level *beyond* the current taxonomy. JS-enhanced spends JS
only where accessibility requires it and keeps modules tiny; these
would spend JS for premium *feel* — vaul/framer-grade polish — as an
explicit, opt-in trade against the near-zero-JS ethos. Each still
enhances working markup; without it you get the CSS-only experience
already shipped.

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

Discipline to keep if this level happens: still degrade to the shipped
CSS experience with no module; still per-component, no shared runtime;
name the trade honestly (this is where mica stops being "nearly no JS").
