# Live prototype pages

Read this when a concept can't be judged on a static canvas: motion,
focus flow, scrolling, typing, picker or popover behavior, or anything
that depends on real browser rendering.

The Paper proposal stays the place for the decision. The live page sits
alongside it and is linked from it.

## Build

- `mockups/<topic>.html`, linking the real stylesheet:
  `<link rel="stylesheet" href="../mica.css">`. Never inline
  approximations; dark mode, tokens and theming have to be judged
  truthfully.
- Concept CSS goes in an **unlayered** `<style>` block. It beats mica's
  `@layer`s by design, which also exercises the customization story.
  No library edits are needed to prototype.
- Include a reference row of current mica controls next to the concepts.
- Show each concept's full state set, plus live interactive groups (real
  inputs, real `name` groups, real popovers).
- Add a scheme toggle on the page (it sets
  `document.documentElement.style.colorScheme`) so both schemes can be
  checked without changing the OS setting.

## Present

- Serve with `bun run docs:serve` (port 8471, no-store; generic static
  servers serve stale files).
- Share `http://localhost:8471/mockups/<topic>.html` with the user.
- Collect the decision with a structured question in chat, not from the
  page.

## Clean up

`mockups/` holds only live explorations. Delete the page once the decision
is folded into the spec; git history is the record.
