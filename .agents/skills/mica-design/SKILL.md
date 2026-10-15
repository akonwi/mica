---
name: mica-design
description: How mica gets designed. New components, variants, tokens and visual changes are explored, decided and specified in the Paper file "Mica" (the design source of truth) before code is written, then the code is checked against the canvas. Use when designing or changing anything visible in mica, presenting design options, adding tokens, answering Paper canvas comments, or when a code change has to be reflected on the canvas.
---

# Designing mica

Paper is the design source of truth. A design starts on the canvas, gets
decided there with the user, and becomes a spec. Then the code is written
to match and measured against it. The canvas always shows what ships
(component artboards) plus the questions still open (proposal
artboards).

## Workflow

Copy this checklist and track it:

```
- [ ] 1. Frame the question
- [ ] 2. Explore on a Proposal artboard
- [ ] 3. Decide with the user
- [ ] 4. Spec the component artboard; user signs off
- [ ] 5. Implement
- [ ] 6. Verify code against the canvas (loop until it matches)
- [ ] 7. Clean up
```

**1. Frame the question.** Read what exists: the related component
artboards (find them by name with `get_basic_info`), Foundations › Roles,
and for a change the `mica.css` rules, the docs page and the module.
Write the question in one sentence. Name what it touches: components,
tokens, and API (AGENTS.md "API surface & semver").

**2. Explore.** Build a `Proposal · <topic>` artboard: options A, B, C…
side by side with what ships today, Light and Dark, the full state set,
the numbers on the canvas (sizes, contrast, hue), and each option's API
impact.
- Read `references/canvas.md` before creating or editing any artboard.
- Read `references/paper-tools.md` before your first `write_html` in a
  session.
- Read `references/design-language.md` before drawing options or
  briefing the `designer` subagent.
- Get every color from `scripts/colors.ts` (see
  `references/measuring.md`), never by eye.
- If an option can only be judged by interacting with it, read
  `references/live-prototypes.md` and add a live page.

**3. Decide.** Ask with `select_from_user` or `guided_questions`. Give the
trade-offs in plain terms and recommend one if you have a reason. If the
user doesn't follow, make the proposal clearer on the canvas rather than
adding prose.

**4. Spec.** Fold the chosen option into the component's artboard (create
it for a new component): Light and Dark panels with every variant, size,
state and layout, then Anatomy (Elements / Attributes / Rules). New
tokens go into Paper's token list first, under their intended names. The
format is in `references/canvas.md`. Review screenshots at scale 1, run
`finish_working_on_nodes`, and get sign-off.

**5. Implement.** Follow AGENTS.md: `mica.css` uses the canvas's token
names, the docs page shows the Anatomy's markup (`bun run docs:build`),
states go into `demo.html` with probes in `tools/snapshot.ts`, and
behavior goes in an opt-in enhancement module. Run the
`mica-feedback-loop` sweep.

**6. Verify.** Measure with `scripts/measure.ts` (Chromium and WebKit,
both schemes) and compare with the spec's numbers
(`references/measuring.md`).
- Code differs from the spec → fix the code, measure again.
- Spec asks for something the platform can't do, or the measured result
  looks better → take it to the user, then update the spec.
- Move on only when they match. Then `bun run snapshot:check` and
  `bun run test`.

Commit with a plain-sentence subject (no `fix(scope):`), the body written
to a file and passed with `git commit -F`, evidence in the body. Don't
push.

**7. Clean up.** Delete the proposal artboard and any `mockups/` page.
Rename `--derived-*` stand-ins that became real tokens (`set_tokens`
`newName`). Resolve canvas comments you answered in chat.

## Changes that start in code

A bug fix or refactor still lands on the canvas in the same session:
update the affected artboards, and re-derive any `--derived-*` token whose
source moved. If the fix changes how something looks, go back to step 2
and decide it as a design question.

## Gotchas

- **Component artboards state current truth only.** No "was", "now",
  "fixed in", commit hashes, or before/after. Comparisons belong on
  proposals; history belongs in git.
- **Tokens only on component artboards.** Paper can't do `color-mix()`,
  so mixed values become `--derived-*` tokens (with `--dark-` twins).
  Untokenized code literals stay as px and are listed in Anatomy. Never
  invent a token to dodge a literal.
- **Mix colors with neutrals in oklab, not oklch.** The neutrals are hue 263
  at chroma 0; an oklch mix drags status colors toward blue (danger went
  pink and mauve).
- **Never hard-code Paper node IDs.** They change when things are rebuilt.
  Look artboards up by name.
- **A cancelled question means ask again**, never "first option". A
  reply with feedback is not a decision. "Looks good", "yes", "yep", or
  "proceed" after a review is sign-off.
- **Dark is generated, not adjusted.** Build Light and Dark from one
  generator script (`light|dark` → `var(--token)` / `var(--dark-token)`)
  so the panels can't drift apart.
- **Paper has no reply tool.** Answer comments in chat, then resolve the
  thread once the canvas shows the answer.
