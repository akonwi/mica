# Snapshot baselines

`bun run snapshot:check` compares computed styles and 40 element crops in
Chromium and WebKit, across light and dark schemes. It also checks interactive
behavior, accessibility, and the CSS parse canary.

Visual captures wait for fonts and specimen images, temporarily align the
specimen's bounding box to whole CSS pixels, and require two consecutive
identical captures. Alignment uses relative layout offsets, not transforms:
native controls can rasterize at a fractional position before a transform is
composited. Sizes and existing transforms are preserved; inline styles are
restored after every crop. Visual probe elements must be in normal flow.

`bun test tools/snapshot-capture.test.ts` verifies that fractional layout shifts
do not change captures, styles are restored, and real paint changes still show
up in both browsers and both themes.

## Capture environment

`environment.json` records the platform, architecture, OS release, Playwright
and browser versions, viewport, scale, and capture method used by the last
baseline refresh. Check runs warn when the environment differs, but still run
the comparisons and fail on drift. Environment differences never excuse a
pixel mismatch automatically.

Use the recorded environment for authoritative visual comparisons. Pixel
alignment reduces layout noise; it does not guarantee identical native-control
or font rendering across operating systems. Keep Playwright pinned through
`bun.lock`. When changing platform or browser version, review the resulting
images before adopting new baselines. Do not increase the global comparison
tolerance to hide platform differences.

## Refreshing

Run `bun run snapshot:check` first. Inspect the reported JSON differences and
the `*.current.png` / `*.diff.png` artifacts. For intended changes, run
`bun run snapshot`, review the baseline diff, then run `bun run snapshot:check`
again to verify repeatability. Commit the PNGs, JSON, and environment metadata
with the change that required them. Do not hand-edit baseline values.

The pixel-alignment migration replaces mixed historical macOS/Linux image
baselines with a single recorded macOS capture environment. Some crops lose
one or two extra edge pixels in each dimension; for example, a 48px avatar at
2× scale is now 96×96 rather than 96×98. Library CSS and demo markup are
unchanged by that migration.
