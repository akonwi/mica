# mica

**Custom elements. Native behavior. Nearly no JavaScript.**

Mica is a **progressive component library** of custom elements —
progressive as in progressive enhancement: every component starts from
markup that works, and each layer (CSS, the browser's native behavior, an
optional JS module) enhances it. No runtime, no build step, no framework.
View source — there's nothing there but HTML and a stylesheet.

```html
<link rel="stylesheet" href="mica.css">

<m-vstack gap="lg">
  <h1>That's it</h1>
  <m-hstack gap="sm">
    <button data-variant="primary">Save</button>
    <button data-variant="ghost">Cancel</button>
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
curl -O https://raw.githubusercontent.com/akonwi/mica/v0.2.1/mica.css
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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@akonwi/mica@0.2/mica.css">
```

## Progressive by design

Every component states where its behavior comes from
(see [PROGRESSIVE.md](PROGRESSIVE.md)):

- **CSS-only — CSS is the behavior.** Layout primitives: `m-vstack`,
  `m-hstack`, `m-zstack`, `m-center`, `m-box`, `m-grid`, `m-sidecar`,
  `m-switcher`, `m-reel`. Zero JS, work with JS disabled.
- **Native behavior — the browser is the behavior.** Styled native elements:
  buttons, forms, `<dialog>`, `<details>` accordions, popover menus,
  tooltips, toasts. Delete the stylesheet and everything still works.
- **JS-enhanced — script, honestly.** Where accessibility genuinely requires
  JS: `tabs.js`, `combobox.js`, `field.js` (declarative validation),
  `select.js`, `toast.js`. Each is a tiny standalone module that enhances
  working markup — never renders it. There is no shared runtime.

`avatar.js` is a separate opt-in visual enhancement: authored initials work
without it; importing it locally derives deterministic color and features from
the `blobatar` seed without a network request.

## Your CSS always wins

All of mica ships inside `@layer mica.*`. Unlayered user CSS beats layered
CSS by spec — overriding mica never requires specificity games. Theming is
swapping token values (`--hue`, semantic color roles, spacing scale); dark
mode is `light-dark()` — automatic, no classes.

## Browser support

Mica targets [Baseline](https://web.dev/baseline) widely-available.
Newer features (anchor positioning, customizable select) are used behind
graceful fallbacks — each component's docs page notes what degrades and
how. Nothing breaks; some things get plainer.

## Docs

**[akonwi.io/mica](https://akonwi.io/mica/)** — every component, built with
mica itself (view source). The [demo](https://akonwi.io/mica/demo.html) is
the whole library on one page.

Read [VISION.md](VISION.md) for the philosophy and
[PROGRESSIVE.md](PROGRESSIVE.md) for how components are allowed to work.

## License

[MIT](LICENSE)
