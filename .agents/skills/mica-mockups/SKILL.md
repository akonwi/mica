---
name: mica-mockups
description: Design-exploration workflow for mica — build mockup pages against the real mica.css, present concepts in a glimpse window, and collect the user's pick as JSON. Use when exploring component designs, presenting visual concepts or variants, or when the user asks for mockups of a mica element.
---

# Mica mockup workflow

For visual explorations (new components, variant ideas, theme tweaks):
concepts get built as real pages against the real stylesheet, presented
in a native window, and the decision comes back structured. The
`glimpse-visuals` skill covers the CLI itself; this skill is the
mica-specific workflow around it.

## 1. Build the mockup page

- Location: `mockups/<topic>.html` (committed — they're the design
  record; see `mockups/radio.html` for the shape).
- Link the real stylesheet: `<link rel="stylesheet" href="../mica.css">`.
  Never inline approximations — dark mode, tokens, and theming must be
  judged truthfully.
- Concept CSS goes in an **unlayered** `<style>` block on the page — it
  beats mica's `@layer` by design, which is itself the customization
  story being exercised. No library edits needed to prototype.
- Include a **reference row** of current mica controls next to the
  concepts so distinctness/coherence can be judged in context.
- Show each concept's full state set: default, checked/active, disabled,
  and a live interactive group (real inputs with `name` groups).
- Optionally consult the `designer` subagent for concepts first; give it
  mica's constraints (square, monochrome, primary/accent roles, drawn
  controls = no pseudo-elements on inputs).

## 2. Present it

Serve first (project rule — `serve.py` is no-store; plain http.server
serves stale files):

```bash
(python3 serve.py >/dev/null 2>&1 &)   # port 8471, from repo root
```

Present either way:

- **Just looking:** `glimpse open --name mica-mockups --replace
  --width 960 --height 720 --url http://localhost:8471/mockups/<topic>.html`
- **Asking for a decision:** add a choice bar to the page — one button
  per concept calling `window.glimpse.send({ choice: '<id>' })`, placed
  *outside* the mocked area so chrome doesn't contaminate the design —
  and run under `glimpse prompt` to block for the pick:

```bash
glimpse prompt --title "mica: <topic>" --width 960 --height 720 \
  --url "http://localhost:8471/mockups/<topic>.html"
```

Handle cancel/close explicitly (no choice ≠ first choice). Remind the
user to toggle OS dark mode, or flip it for them in page JS.

## 3. After the pick

- Fold the winning concept into `mica.css` proper, translated onto
  tokens/roles (never hardcoded values), with the losing default
  documented as a theme snippet in a CSS comment if it was previously
  the default.
- Keep the mockup file — it's the exploration record.
- Run the standard `mica-feedback-loop` verification sweep on the
  folded-in result before committing.
