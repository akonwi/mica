---
name: mica-release
description: Release a new version of mica — verification, versioning/semver judgment, tagging, npm publish, channel verification, and downstream consumer bumps. Use when asked to "cut a release", "publish mica", "bump the version", or "release vX.Y.Z".
---

# Releasing mica

The package has no build: the repo files *are* the artifacts. A release is
verification + version + tag + npm + channel checks. Docs republish
themselves (Pages deploys the repo root on every push to main).

## 1. Decide the version (semver, mica's definition)

Light DOM means more things are API than usual. **Breaking (major, or
minor while 0.x):**

- Removing/renaming elements, attributes, attribute values, or classes
- Changing documented markup contracts (child order/roles, e.g. sidecar's
  first/last-child meaning, dialog/tabs anatomy)
- Retuning color ramp values or token names — components and *user CSS*
  depend on scale steps (`--neutral-6`), roles, and space/size tokens
- Changing a Tier-2 module's enhanced-markup contract

**Additive (minor):** new elements, new attribute values, new tokens, new
docs pages, a component moving *down* a tier (highlight it in notes).
**Patch:** visual bugfixes that don't move published token values users
plausibly depend on. When in doubt about a ramp tweak: it's breaking.

## 2. Pre-flight

- Working tree clean, on `main`, pushed.
- Run the `mica-feedback-loop` sweep on demo.html — both color schemes,
  parse-error canary (probe the last rule block of mica.css).
- If components were added/changed: docs regenerated via
  `tools/build-docs.py` (never hand-edit output), demo.html updated.
- **New JS modules must appear in BOTH `package.json` `exports` and
  `files`** — the files allowlist silently drops anything unlisted from
  the npm tarball.
- ROADMAP.md reflects reality.
- **CHANGELOG.md drafted and committed.** Move the `[Unreleased]` section
  under the new version heading with today's date; categorize broadly
  (Fixes / Added / Docs / Infrastructure). The changelog is for humans
  migrating between versions — prioritize what they need to know (API
  changes, deprecations, behavioral fixes) over internal refactors.

## 3. Draft release notes

Before tagging, draft GitHub Release text from the CHANGELOG entry.
Emphasize: API changes and migration notes, new components, fixes that
change rendered output (color retuning, dialog layout). For visual
changes, link to the relevant PR or demo section.

## 4. Cut it

```bash
# bump "version" in package.json first, commit it
git tag vX.Y.Z
git push && git push origin vX.Y.Z
npm publish --access public     # needs npm auth — may have to ask the user
```

## 5. Verify every channel (all should be 200 within ~a minute)

```bash
curl -so /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/akonwi/mica/vX.Y.Z/mica.css
curl -so /dev/null -w '%{http_code}\n' https://cdn.jsdelivr.net/gh/akonwi/mica@vX.Y.Z/mica.css
npm view @akonwi/mica version
curl -so /dev/null -w '%{http_code}\n' https://unpkg.com/@akonwi/mica@X.Y.Z/mica.css
curl -so /dev/null -w '%{http_code}\n' "https://cdn.jsdelivr.net/npm/@akonwi/mica@X.Y.Z/mica.css"
```

jsDelivr's npm mirror can lag a few minutes after publish — retry before
concluding failure. Also confirm docs redeployed: `gh run list --limit 1`
should show the Pages workflow green for the version-bump push.

## 6. Downstream consumers (offer, don't assume)

Both production sites vendor mica pinned to a tag via an `update-mica`
npm script containing the tag in its URL:

- `../akonwi.github.io` — bump tag in `package.json`, `bun run
  update-mica`, rebuild (`bun run build`), eyeball, commit, push
  (push deploys via its own CI)
- `../letsngoh` — bump tag in `package.json`, `npm run update-mica`,
  commit, push (Vercel auto-deploys)

Upgrading consumers is a *choice per release* — pinning exists so they
update deliberately. Ask the user which (if any) to bump, and diff the
vendored file after fetching so the upgrade's blast radius is visible.

## 7. GitHub release

GitHub release on the tag (`gh release create vX.Y.Z`) with: breaking
changes first (with migration snippets), then tier-movement highlights,
then additions/fixes. Mica's marketing voice: platform-progress framing
("X moved from Tier 2 to Tier 1") over feature-list framing.
