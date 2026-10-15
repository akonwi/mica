# Measuring code against the canvas

Read this before computing a color for the canvas or checking an
implementation against its spec.

## Scripts (run from the repo root)

```bash
# Colors: tokens, mixes or literals, resolved against the real mica.css
# in Chromium and WebKit, light and dark, with hex and WCAG contrast.
bun .agents/skills/mica-design/scripts/colors.ts --on 'var(--color-on-danger)' \
  'var(--color-danger)' 'color-mix(in oklab, var(--color-danger) 88%, var(--color-text))'

# Boxes and computed styles for every match, per engine and scheme.
bun run docs:serve   # separate terminal; port 8471, no-store
bun .agents/skills/mica-design/scripts/measure.ts http://localhost:8471/docs/button.html \
  '.specimen button[data-size]' --props padding-left,background-color --width 1200
```

`colors.ts` also reports whether `mica.css` parsed to the end (the parse
canary).

If neither script fits, write a throwaway Playwright script as a dotfile
in `tools/` (`tools/.x.tmp.ts`) and delete it when you're done.

## Gotchas

- **Mix colors with neutrals in oklab, not oklch.** The neutrals carry hue
  263 at zero chroma, and an oklch mix interpolates hue too. A status
  color mixed toward them drifts toward blue: danger went pink (hover)
  and mauve (disabled) until this was fixed. Same lightness, wrong hue.
- `getComputedStyle` returns color-mix results in the mixing space
  (`oklab(...)`). Use the canvas readback in `colors.ts` for hex and
  contrast.
- Under reduced motion, a restyled element reports mid-transition values.
  Probe fresh elements.
- `getComputedStyle` lies about vendor pseudos (progress and meter fills,
  the select picker, drawn check, radio and switch glyphs). Check those
  visually.
- `demo.html` styles its own `footer` (64px padding) and `h2`. Don't
  measure footers or panel headings there.
- When measuring docs markup in isolation, strip the docs `<style>`
  blocks; they style the specimens.
- Module scripts can't load cross-origin from `about:blank`; measure on
  the served origin.
- Engine differences seen so far: WebKit draws `button.close` about 2px
  narrower, makes text boxes about 1px shorter at the same positions, and
  Playwright WebKit draws no start marker on RTL tab rails.
- Both local engines run ahead of shipped Safari. For shipped-iOS
  questions, use the `mica-feedback-loop` skill's iOS Simulator channel.

## Comparing

Compare against the spec's numbers, not against your memory of the
canvas. Re-read the artboard (`get_computed_styles` / `get_jsx`). A
difference of 1px or less from text-box rounding is noise; anything that
changes size, spacing, color or wrapping is a finding.
