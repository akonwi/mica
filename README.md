# mica

**Custom elements. Native behavior. Nearly no JavaScript.**

Mica is a front-end library built from custom element tags, native HTML
elements, and CSS. No runtime, no build step, no framework. View source —
there's nothing there but HTML and a stylesheet.

```html
<link rel="stylesheet" href="mica.css">

<m-vstack gap="lg">
  <h1>That's it</h1>
  <m-hstack gap="sm">
    <button class="primary">Save</button>
    <button class="ghost">Cancel</button>
  </m-hstack>
</m-vstack>
```

`<m-vstack>` is never registered — an unknown custom element is a valid,
stylable element. The behavior everywhere else (dialogs, accordions, menus,
form validation) comes from the browser, not from a runtime.

## Getting it

**Copy the file** — mica is one dependency-free CSS file. Vendoring is a
first-class distribution channel, not a workaround:

```sh
curl -O https://raw.githubusercontent.com/akonwi/mica/v0.1.0/mica.css
```

**npm** — for toolchains:

```sh
npm install @akonwi/mica
```

```js
import "@akonwi/mica/mica.css";
```

**CDN** — for trying it out:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@akonwi/mica@0.1/mica.css">
```

## The three tiers

Every component states where its behavior comes from
(see [TIERS.md](TIERS.md)):

- **Tier 0 — CSS is the behavior.** Layout primitives: `m-vstack`,
  `m-hstack`, `m-zstack`, `m-center`, `m-box`, `m-grid`, `m-sidecar`,
  `m-switcher`, `m-reel`. Zero JS, work with JS disabled.
- **Tier 1 — the browser is the behavior.** Styled native elements:
  buttons, forms, `<dialog>`, `<details>` accordions, popover menus,
  tooltips, toasts. Delete the stylesheet and everything still works.
- **Tier 2 — script, honestly.** Where accessibility genuinely requires
  JS: `tabs.js`, `combobox.js`, `field.js` (declarative validation),
  `select.js`, `toast.js`. Each is a tiny standalone module that enhances
  working markup — never renders it. There is no shared runtime.

## Your CSS always wins

All of mica ships inside `@layer mica.*`. Unlayered user CSS beats layered
CSS by spec — overriding mica never requires specificity games. Theming is
swapping token values (`--hue`, semantic color roles, spacing scale); dark
mode is `light-dark()` — automatic, no classes.

## Docs

**[akonwi.io/mica](https://akonwi.io/mica/)** — every component, built with
mica itself (view source). The [demo](https://akonwi.io/mica/demo.html) is
the whole library on one page.

Read [VISION.md](VISION.md) for the philosophy and [TIERS.md](TIERS.md)
for the tier system.

## License

[MIT](LICENSE)
