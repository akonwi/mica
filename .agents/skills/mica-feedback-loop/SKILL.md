---
name: mica-feedback-loop
description: Verify mica's rendered output in a real browser — computed-style probes, accessibility tree checks, and delegated visual review. Use after any change to mica.css or index.html, when tuning color ramps, checking dark mode, validating a11y transparency, or before committing UI-affecting work.
---

# Mica feedback loop

Mica is a zero-JS CSS library; correctness lives in *rendered output*, not
in unit tests. This skill encodes the three verification channels, in
escalation order. All three go through the `aside` CLI (see the
aside-browser skill for full API details).

## Setup: serve the demo over HTTP

Aside cannot open `file://` URLs. Serve the project first:

```bash
cd <mica-root> && (python3 -m http.server 8471 >/dev/null 2>&1 &) \
  && curl -s -o /dev/null -w "%{http_code}" http://localhost:8471/index.html
```

Expect `200`. Reuse the server across checks; it costs nothing.

## Channel 1 — deterministic probes (always, cheap)

Use `aside repl` + `page.evaluate` with `getComputedStyle` to assert exact
rendered values: token resolution, OKLCH outputs, flex/grid/gap values,
layer-order winners. This is the regression channel — run it after every
mica.css change.

```bash
aside repl "
const p = await openTab('http://localhost:8471/index.html');
const probe = await p.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('button.primary'));
  return { bg: cs.backgroundColor, color: cs.color };
});
console.log(JSON.stringify(probe, null, 1));
"
```

Probe patterns that matter for mica:

- **Token resolution:** computed colors come back as `oklch(...)` — compare
  against the ramp numbers in mica.css literally.
- **Layer wins:** to verify user CSS beats mica, inject a style tag in
  `evaluate` and confirm the computed value flips.
- **Attribute API:** set `el.setAttribute('gap','lg')` in evaluate, re-read
  computed `gap` — confirms the attribute→custom-property chain.

### Forcing light/dark mode

`page.emulateMedia` is NOT available in the aside repl. Because mica themes
entirely via `light-dark()`, force modes from CSS instead:

```js
await p.evaluate(() => { document.documentElement.style.colorScheme = 'light'; });
// probe... then 'dark', probe again. Always test BOTH modes.
```

## Channel 2 — accessibility tree (structure claims)

`snapshot(page)` returns the a11y tree. Mica's core claim — custom elements
are transparent to assistive tech, pages read as plain headings/regions/
text with no library residue — is testable here. Run when adding elements
or changing markup contracts. Red flags: generic wrappers swallowing
content, missing heading levels, interactive elements not exposed as such.

Print the full tree; do not slice it (the repl warns if you do).

## Channel 3 — delegated visual review (judgment calls)

Screenshots cannot be viewed directly (artifacts live in aside's ephemeral
session dir and the agent's tools are text-only). For visual judgment,
delegate to the multimodal Aside agent with a **specific, terse rubric**:

```bash
aside exec "Open http://localhost:8471/index.html — a CSS library demo.
Report tersely: 1) adjacent color-scale steps that are visually
indistinguishable; 2) contrast problems in the spot-check chips;
3) layout glitches, overlap, or wrapping artifacts anywhere. Be specific."
```

Rules of thumb:

- Ask numbered, concrete questions; open-ended "does it look good?" wastes
  the run.
- The agent sees the page in the OS color scheme. Ask it to check the other
  mode via devtools/OS toggle, or accept per-mode runs.
- Run this before committing anything that changes visuals: ramps, new
  elements, preset changes.
- Timebox: pass a generous timeout (exec runs can take 1–3 min).

## Known limitations

- No `file://` navigation — always serve over HTTP.
- Artifacts (`./artifacts/*.png`) are saved inside aside's session dir and
  deleted when the CLI process exits — screenshots are for the Aside
  agent's eyes within a run, not durable evidence. Durable evidence =
  computed-style probe output pasted into commit messages or chat.
- Each `aside repl`/`aside exec` invocation is a fresh ephemeral session;
  no state carries over. Pack related probes into one invocation.

## Standard pre-commit sweep

For any change touching mica.css:

1. Probe the changed values in **both** color schemes (channel 1).
2. If markup contracts changed: snapshot the a11y tree (channel 2).
3. If visuals changed: one `aside exec` review with a rubric (channel 3).
4. Fix, re-run the failing channel, then commit.
