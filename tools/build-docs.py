#!/usr/bin/env python3
"""Stamp the docs shell (rail nav, crumbs, pager) onto per-page content.

Output is plain static HTML — view-source stays the product. This script
only exists so the duplicated rail stays in sync across pages.
Run from repo root:  python3 tools/build-docs.py
"""

import os
import html as html_mod

# ---------------------------------------------------------------- shell css
SHELL_CSS = """
    body > m-sidecar { min-block-size: 100svh; --gap: 0; }
    .rail { border-inline-end: 1px solid var(--color-border); padding: var(--space-lg); }
    .brand { font-weight: 600; text-decoration: none; color: inherit; }
    .rail h2 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-block: var(--space-lg) 0; }
    .rail a { display: block; padding: var(--space-2xs) var(--space-xs); color: var(--color-text-muted); text-decoration: none; font-size: 0.875rem; border-inline-start: 1px solid transparent; }
    .rail a:hover { color: var(--color-text); }
    .rail a[aria-current="page"] { color: var(--color-text); font-weight: 500; border-inline-start: 2px solid var(--color-primary); background: var(--color-surface-raised); }
    article { padding: var(--space-xl) var(--space-lg) var(--space-2xl); min-inline-size: 0; }
    .crumb { color: var(--color-text-muted); font-size: 0.875rem; }
    .lead { color: var(--color-text-muted); }
    .badge { font-size: 0.7rem; border: 1px solid var(--color-border); padding: 0.1em var(--space-xs); color: var(--color-text-muted); align-self: center; white-space: nowrap; }
    .specimen { border: 1px solid var(--color-border); padding: var(--space-xl); }
    .pager { border-block-start: 1px solid var(--color-border); padding-block-start: var(--space-md); }
    .pager a { text-decoration: none; color: var(--color-text-muted); }
    .pager a:hover { color: var(--color-text); }
    article h2:not(dialog *) { font-size: 1rem; }
    .swatch { background: var(--neutral-3); padding: var(--space-sm) var(--space-md); }
    .card { background: var(--color-surface-raised); border: 1px solid var(--color-border); }
    .tall { min-block-size: 5rem; display: grid; place-items: center; }
"""

TOKENS_CSS = """
    .scale { display: grid; grid-template-columns: repeat(12, 1fr); border: 1px solid var(--color-border); overflow: hidden; }
    .scale div { min-block-size: 3rem; display: grid; place-items: center; font-size: 0.8rem; color: var(--neutral-12); }
    .scale .inv { color: var(--neutral-1); }
"""


def esc(s: str) -> str:
    return html_mod.escape(s, quote=False)


# ---------------------------------------------------------------- helpers
def code(snippet: str) -> str:
    return f"<pre><code>{html_mod.escape(snippet)}</code></pre>"


def specimen(inner: str) -> str:
    return f'<div class="specimen">{inner}</div>'


# ---------------------------------------------------------------- pages
# (slug, title, tier, lead, body, extra_css, scripts)
# tier: "0" | "1" | "2" | None

def scale_strip(prefix: str) -> str:
    cells = []
    for i in range(1, 13):
        inv = ' class="inv"' if i >= 9 else ""
        cells.append(f'<div style="background: var(--{prefix}-{i})"{inv}>{i}</div>')
    return f'<div class="scale">{"".join(cells)}</div>'


PAGES: list[dict] = [
    # ---- Start ----
    dict(
        group="Start", slug="index", title="Introduction", tier=None,
        lead="Custom elements. Native behavior. Nearly no JavaScript.",
        body=f"""
<p>Mica is a front-end library built from custom element tags, native HTML
elements, and CSS. Behavior comes from the browser, not from a runtime:
<code>&lt;dialog&gt;</code> traps focus, <code>popover</code> handles menus,
<code>&lt;m-vstack&gt;</code> is a styling hook that needs no registration.
View source on any page here — there is nothing but HTML and one stylesheet.</p>
<h2>Install</h2>
{code('<link rel="stylesheet" href="mica.css" />')}
<h2>Use</h2>
{code('<m-vstack gap="lg">' + chr(10) + '  <h1>Hello</h1>' + chr(10) + '  <button class="primary">Submit</button>' + chr(10) + '</m-vstack>')}
<h2>The three tiers</h2>
<p>Every component states where its behavior comes from.
<b>Tier 0</b>: pure CSS custom tags (layout). <b>Tier 1</b>: styled native
elements (forms, dialog, tables). <b>Tier 2</b>: tiny opt-in modules where
accessibility genuinely requires script — each one enhances working markup,
never renders it.</p>
""",
    ),
    dict(
        group="Start", slug="tokens", title="Tokens & theming", tier=None,
        lead="Knobs → scales → roles. Theming is swapping token values, never overriding component CSS.",
        extra_css=TOKENS_CSS,
        body=f"""
<h2>Knobs</h2>
<p><code>--hue</code>, <code>--chroma</code>, <code>--neutral-chroma</code>,
status hues, and the radius tokens. Everything below derives from them.</p>
<h2>Scales</h2>
<p>Theme-relative (Radix convention): step 1 is always the app background,
6–8 borders, 9 the solid, 12 high-contrast text — in both modes.</p>
{scale_strip('neutral')}
{scale_strip('accent')}
<h2>Roles</h2>
<p>Components only touch roles: <code>--color-surface</code>,
<code>--color-text</code>, <code>--color-border</code>,
<code>--color-primary</code> (near-black; the action color),
<code>--color-accent</code> (the one blue: focus, selection), and the
status roles (<code>--color-danger…</code>).</p>
<h2>Theming recipes</h2>
{code(':root { --radius-sm: .25rem; --radius-md: .375rem; --radius-lg: .75rem } /* un-square */' + chr(10) + ':root { --hue: 150 }                                    /* different brand */' + chr(10) + ':root { --color-primary: var(--accent-9);' + chr(10) + '        --color-on-primary: var(--color-on-accent) }   /* colorful primary */')}
""",
    ),
    dict(
        group="Start", slug="preset", title="Preset", tier=None,
        lead="Constructive defaults: raw HTML should look finished, not like nothing.",
        body="""
<p>This paragraph and everything around it is unstyled flow content. Rhythm,
heading margins, media behavior, focus rings, and reduced-motion guards come
from <code>@layer mica.preset</code> — zero-specificity, trivially overridable.</p>
<h3>A following heading gets breathing room</h3>
<p>Because it isn't a first child. Inside a stack, rhythm yields to
<code>gap</code> — the stack owns spacing. Tab to this
<a href="#main">link</a> or any control to see the tokenized focus ring.</p>
""",
    ),
    # ---- Layout ----
    dict(
        group="Layout", slug="vstack", title="vstack", tier="0",
        lead="Vertical flow with consistent gaps. The workhorse.",
        body=f"""
{specimen('<m-vstack gap="sm"><div class="swatch">one</div><div class="swatch">two</div><div class="swatch">three</div></m-vstack>')}
{code('<m-vstack gap="sm">' + chr(10) + '  <div>one</div>' + chr(10) + '  <div>two</div>' + chr(10) + '</m-vstack>')}
<h2>Attributes</h2>
<p><code>gap</code>: none · 2xs · xs · sm · md (default) · lg · xl · 2xl.
<code>align</code>: start · center · end · stretch (default).
Arbitrary values via the escape hatch: <code>style="--gap: 2.75rem"</code> —
attributes and custom properties are the same mechanism.</p>
""",
    ),
    dict(
        group="Layout", slug="hstack", title="hstack", tier="0",
        lead="One horizontal row. Wrapping is opt-in, per the name's promise.",
        body=f"""
{specimen('<m-hstack gap="sm" wrap><div class="swatch">alpha</div><div class="swatch">beta</div><div class="swatch">gamma</div><div class="swatch">delta</div></m-hstack>')}
{code('<m-hstack gap="sm">…</m-hstack>        <!-- one row, like SwiftUI -->' + chr(10) + '<m-hstack gap="sm" wrap>…</m-hstack>   <!-- allowed to wrap -->')}
<h2>Attributes</h2>
<p><code>gap</code>, <code>align</code> (default center),
<code>justify</code>: start · center · end · between, boolean <code>wrap</code>.</p>
""",
    ),
    dict(
        group="Layout", slug="zstack", title="zstack", tier="0",
        lead="Layering: children share one grid cell. Paint order is DOM order.",
        body=f"""
{specimen('<m-zstack style="min-block-size: 8rem"><div style="background: linear-gradient(135deg, var(--neutral-7), var(--neutral-9))"></div><p style="place-self: center; margin: 0">centered layer</p><p class="swatch" style="place-self: start end; margin: var(--space-sm)">badge</p></m-zstack>')}
{code('<m-zstack>' + chr(10) + '  <img src="cover.jpg" alt="" />' + chr(10) + '  <p style="place-self: center">Title</p>' + chr(10) + '</m-zstack>')}
<h2>Notes</h2>
<p>Defaults to stretch (fill layers are the web's common case; SwiftUI centers).
Per-layer placement is plain <code>place-self</code> on the child — light DOM
means the platform is the escape hatch.</p>
""",
    ),
    dict(
        group="Layout", slug="center", title="center", tier="0",
        lead="Intrinsic horizontal centering with a readable measure.",
        body=f"""
{specimen('<m-center max="sm" style="border: 1px dashed var(--color-border-strong)"><p style="margin:0">centered, capped at --size-sm</p></m-center>')}
{code('<m-center max="lg" gutter="md">…</m-center>')}
<h2>Attributes</h2>
<p><code>max</code>: xs–xl (defaults to <code>--measure</code>, 60ch).
<code>gutter</code>: sm · md · lg for edge padding.</p>
""",
    ),
    dict(
        group="Layout", slug="box", title="box", tier="0",
        lead="Padding; an inside for content.",
        body=f"""
{specimen('<div class="card"><m-box><p style="margin:0">a padded box inside a card</p></m-box></div>')}
{code('<m-box pad="lg">…</m-box>')}
<h2>Attributes</h2>
<p><code>pad</code>: none · xs · sm · md (default) · lg · xl.</p>
""",
    ),
    dict(
        group="Layout", slug="grid", title="grid", tier="0",
        lead="Responsive grid with zero media queries.",
        body=f"""
{specimen('<m-grid gap="md" min="xs"><div class="card tall">1</div><div class="card tall">2</div><div class="card tall">3</div><div class="card tall">4</div></m-grid>')}
{code('<m-grid gap="md" min="sm">…</m-grid>')}
<h2>Attributes</h2>
<p><code>gap</code>; <code>min</code>: xs–lg — the minimum column width;
columns pack to fit.</p>
""",
    ),
    dict(
        group="Layout", slug="sidecar", title="sidecar", tier="0",
        lead="A fixed + flexible pair that stacks when narrow. This page's shell uses it.",
        body=f"""
{specimen('<m-sidecar gap="md"><div class="card tall">sidecar</div><div class="card tall">content</div></m-sidecar>')}
{code('<m-sidecar>' + chr(10) + '  <nav>…</nav>' + chr(10) + '  <main>…</main>' + chr(10) + '</m-sidecar>')}
<h2>Attributes</h2>
<p><code>gap</code>; <code>side="end"</code> makes the <em>last</em> child the
sidecar (no visual reordering); <code>side-width</code>: xs · sm · md.
The markup contract: exactly two children, first (or last) is the fixed one.</p>
""",
    ),
    dict(
        group="Layout", slug="switcher", title="switcher", tier="0",
        lead="A row that switches to a column below a width threshold.",
        body=f"""
{specimen('<m-switcher gap="md" threshold="lg"><div class="card tall">a</div><div class="card tall">b</div><div class="card tall">c</div></m-switcher>')}
{code('<m-switcher threshold="md">…</m-switcher>')}
<h2>Attributes</h2>
<p><code>gap</code>; <code>threshold</code>: sm–xl. Resize this window to see
it switch.</p>
""",
    ),
    dict(
        group="Layout", slug="reel", title="reel", tier="0",
        lead="Horizontal scroll with snap. Scrolling is the browser's; snap is CSS.",
        body=f"""
{specimen('<m-reel gap="md">' + ''.join(f'<div class="card tall" style="inline-size: 10rem">slide {i}</div>' for i in range(1, 7)) + '</m-reel>')}
{code('<m-reel gap="md" snap="mandatory">…</m-reel>')}
<h2>Attributes</h2>
<p><code>gap</code>; <code>snap</code>: none · mandatory (default proximity).</p>
""",
    ),
    # ---- Elements ----
    dict(
        group="Elements", slug="button", title="button", tier="1",
        lead="The native element, styled directly. Variants are classes; @layer means collisions resolve in your favor.",
        body=f"""
{specimen('<m-vstack gap="md"><m-hstack gap="sm" wrap><button>Default</button><button class="primary">Primary</button><button class="ghost">Ghost</button><button class="danger">Danger</button></m-hstack><m-hstack gap="sm" wrap><button class="small">Small</button><button class="large">Large</button><button disabled>Disabled</button><button class="primary" disabled>Disabled primary</button><a class="btn" href="#">Link as button</a></m-hstack></m-vstack>')}
{code('<button class="primary">Submit</button>' + chr(10) + '<a class="btn" href="/docs">A link dressed as a button</a>')}
<h2>Notes</h2>
<p>Ghost has deliberately zero rest affordance — toolbars and icon rows, not
the lone action on a page. Disabled is the same fill at reduced opacity.</p>
""",
    ),
    dict(
        group="Elements", slug="content", title="content", tier="1",
        lead="Tables, lists, code, quotes — prose-adjacent elements that just work.",
        body=f"""
{specimen('<table><thead><tr><th>Element</th><th>Tier</th><th>JS</th></tr></thead><tbody><tr><td>m-vstack</td><td>0</td><td>none</td></tr><tr><td>dialog</td><td>1</td><td>none</td></tr><tr><td>m-field</td><td>2</td><td>one module</td></tr></tbody><caption>Horizontal borders only; hover a row; numerals are tabular.</caption></table>')}
{specimen('<p style="margin:0">Inline <code>code</code> gets a chip; press <kbd>⌘</kbd><kbd>K</kbd>. Below, a thematic break.</p><hr /><blockquote style="margin:0">Delete the stylesheet and it still works.</blockquote>')}
<h2>Notes</h2>
<p>Markdown output (tables, <code>---</code> → <code>hr</code>, lists, code
fences) renders finished with zero classes.</p>
""",
    ),
    dict(
        group="Elements", slug="progress", title="progress & meter", tier="1",
        lead="Thin square bars. Meter grades through the status roles — the browser decides which.",
        body=f"""
{specimen('<m-vstack gap="md"><progress max="100" value="33"></progress><progress max="100" value="80"></progress><meter min="0" max="100" low="60" high="85" optimum="30" value="42"></meter><meter min="0" max="100" low="60" high="85" optimum="30" value="74"></meter><meter min="0" max="100" low="60" high="85" optimum="30" value="93"></meter></m-vstack>')}
{code('<progress max="100" value="33"></progress>' + chr(10) + '<meter min="0" max="100" low="60" high="85" optimum="30" value="74"></meter>')}
""",
    ),
    # ---- Forms ----
    dict(
        group="Forms", slug="input", title="input & textarea", tier="1",
        lead="One control family with buttons: same radius, border, and height.",
        body=f"""
{specimen('<m-vstack gap="md" style="max-inline-size: var(--size-md)"><m-vstack gap="2xs"><label for="di-name">Name</label><input id="di-name" type="text" placeholder="Ada Lovelace" /></m-vstack><m-vstack gap="2xs"><label for="di-bio">Bio (grows as you type — field-sizing, zero JS)</label><textarea id="di-bio" placeholder="A few lines…"></textarea></m-vstack><m-vstack gap="2xs"><label for="di-off">Disabled</label><input id="di-off" type="text" disabled value="Read only-ish" /></m-vstack></m-vstack>')}
{code('<label for="bio">Bio</label>' + chr(10) + '<textarea id="bio"></textarea>  <!-- field-sizing: content -->')}
<h2>Notes</h2>
<p>Field text stays 16px — smaller triggers iOS auto-zoom. Fields fill their
container; constrain with layout primitives.</p>
""",
    ),
    dict(
        group="Forms", slug="select", title="select", tier="1",
        lead="Custom picker where the platform allows (base-select); native picker elsewhere. Zero JS either way.",
        scripts=["../select.js"],
        body=f"""
{specimen('<m-vstack gap="2xs" style="max-inline-size: var(--size-md)"><label for="ds-role">Role</label><select id="ds-role"><option>Engineer</option><option>Designer</option><option>Mathematician</option></select></m-vstack>')}
{code('<select>' + chr(10) + '  <option>Engineer</option>' + chr(10) + '  <option>Designer</option>' + chr(10) + '</select>')}
<h2>Module: picker alignment</h2>
<p>With the optional <code>select.js</code> module (loaded on this page), the
open picker overlays the trigger with the selected option kept in place —
macOS-native behavior. JS ships one number; CSS anchors do the rest.
Without it: the styled anchored-below picker.</p>
""",
    ),
    dict(
        group="Forms", slug="checkbox", title="checkbox", tier="1",
        lead="Drawn with appearance: none; semantics, keyboard, and forms stay native.",
        body=f"""
{specimen('<m-hstack gap="lg" wrap><label><input type="checkbox" checked /> Checked</label><label><input type="checkbox" /> Unchecked</label><label><input type="checkbox" id="dc-ind" /> Indeterminate</label><label><input type="checkbox" disabled checked /> Disabled</label></m-hstack>')}
{code('<label><input type="checkbox" checked /> Remember me</label>')}
<h2>Notes</h2>
<p>Checked is primary fill + glyph; indeterminate is a drawn dash. A label
wrapping the control becomes the click target and dims when disabled.</p>
<script>document.getElementById('dc-ind').indeterminate = true;</script>
""",
    ),
    dict(
        group="Forms", slug="radio", title="radio", tier="1",
        lead="The square target: a solid pip in every state.",
        body=f"""
{specimen('<m-hstack gap="lg" wrap><label><input type="radio" name="dr" checked /> One</label><label><input type="radio" name="dr" /> Two</label><label><input type="radio" name="dr" disabled /> Off-limits</label></m-hstack>')}
{code('<label><input type="radio" name="r" checked /> One</label>' + chr(10) + '<label><input type="radio" name="r" /> Two</label>')}
<h2>Notes</h2>
<p>Muted pip unchecked, bright pip on primary fill checked. The checked-state
grammar across the family: checkbox = fill + glyph, radio = fill + pip,
switch = fill + block. The round radio is a two-line theme (see mica.css).</p>
""",
    ),
    dict(
        group="Forms", slug="switch", title="switch", tier="1",
        lead="A checkbox wearing a track. Square, like everything else.",
        body=f"""
{specimen('<m-hstack gap="lg" wrap><label><input type="checkbox" class="switch" checked /> Notifications</label><label><input type="checkbox" class="switch" /> Marketing</label><label><input type="checkbox" class="switch" disabled /> Locked</label></m-hstack>')}
{code('<label><input type="checkbox" class="switch" checked /> Notifications</label>')}
<h2>Notes</h2>
<p>Just <code>class="switch"</code> on a checkbox — form participation and
keyboard behavior are untouched. Safari is prototyping a native
<code>switch</code> attribute; if it standardizes, this moves down a tier.</p>
""",
    ),
    dict(
        group="Forms", slug="fieldset", title="fieldset", tier="1",
        lead="A titled group, not a bordered box. Disabling one silences everything inside.",
        body=f"""
{specimen('<fieldset><legend>Profile</legend><m-vstack gap="md"><m-vstack gap="2xs"><label for="df-n">Name</label><input id="df-n" type="text" /></m-vstack></m-vstack></fieldset><fieldset disabled style="margin-block-start: var(--space-lg)"><legend>Billing (disabled)</legend><m-vstack gap="md"><m-vstack gap="2xs"><label for="df-c">Card number</label><input id="df-c" type="text" value="4242 4242 4242 4242" /></m-vstack><label><input type="checkbox" checked /> Save card</label></m-vstack></fieldset>')}
{code('<fieldset disabled>' + chr(10) + '  <legend>Billing</legend>' + chr(10) + '  …' + chr(10) + '</fieldset>')}
""",
    ),
    dict(
        group="Forms", slug="field", title="field validation", tier="2",
        lead="Declarative per-cause errors below the field. No browser bubbles.",
        scripts=["../field.js"],
        body=f"""
{specimen('<form onsubmit="event.preventDefault()"><m-vstack gap="md" style="max-inline-size: var(--size-md)"><m-field><label for="dv-email">Email (submit empty, then type)</label><input id="dv-email" type="email" required placeholder="ada@example.com" /><m-error match="value-missing">Email is required.</m-error><m-error match="type-mismatch">That doesn&#39;t look like an email address.</m-error></m-field><m-hstack gap="sm"><button class="primary" type="submit">Submit</button></m-hstack></m-vstack></form>')}
{code('<m-field>' + chr(10) + '  <label for="email">Email</label>' + chr(10) + '  <input id="email" type="email" required />' + chr(10) + '  <m-error match="value-missing">Email is required.</m-error>' + chr(10) + '  <m-error match="type-mismatch">Not a valid email.</m-error>' + chr(10) + '  <m-error></m-error>  <!-- catch-all: browser&#39;s own message -->' + chr(10) + '</m-field>' + chr(10) + chr(10) + '<script type="module" src="mica/field.js"><' + '/script>')}
<h2>Without the module</h2>
<p>Matchless <code>&lt;m-error&gt;</code>s still show via
<code>:user-invalid</code> (pure CSS); submits fall back to native bubbles.
Working markup, enhanced — never rendered.</p>
""",
    ),
    # ---- Patterns ----
    dict(
        group="Patterns", slug="dialog", title="dialog", tier="1",
        lead="Modal and drawer. Focus trap, Esc, top layer, backdrop — the browser's. Open/close — invoker commands. Zero JS.",
        body=f"""
{specimen('<m-hstack gap="sm" wrap><button commandfor="dd-modal" command="show-modal">Open modal</button><button commandfor="dd-drawer" command="show-modal">Open drawer</button></m-hstack><dialog id="dd-modal"><button class="close" commandfor="dd-modal" command="close" aria-label="Close">&#x2715;</button><header><h2>Confirm</h2><p>Focus is trapped, Esc closes, the backdrop dims — all the browser&#39;s.</p></header><p>Body content sits between header and footer.</p><footer><form method="dialog"><button>Cancel</button><button class="primary" value="ok">Confirm</button></form></footer></dialog><dialog id="dd-drawer" class="drawer"><button class="close" commandfor="dd-drawer" command="close" aria-label="Close">&#x2715;</button><header><h2>Drawer</h2><p>The same native dialog dressed as a drawer.</p></header><p>Body content; the footer pins to the bottom with stacked actions.</p><footer><button class="primary" commandfor="dd-drawer" command="close">Save changes</button><button commandfor="dd-drawer" command="close">Cancel</button></footer></dialog>')}
<h2>Composition</h2>
<p>The shadcn structure, in native vocabulary — header (title +
description), body, footer are real elements, not components:</p>
{code('<button commandfor="confirm" command="show-modal">Open</button>  <!-- trigger -->' + chr(10) + chr(10) + '<dialog id="confirm">          <!-- content -->' + chr(10) + '  <button class="close" commandfor="confirm" command="close" aria-label="Close">&#x2715;</button>' + chr(10) + '  <header>                     <!-- header -->' + chr(10) + '    <h2>Are you sure?</h2>     <!-- title -->' + chr(10) + '    <p>This cannot be undone.</p>  <!-- description -->' + chr(10) + '  </header>' + chr(10) + chr(10) + '  <p>Any body content.</p>' + chr(10) + chr(10) + '  <footer>                     <!-- footer: right-aligned row -->' + chr(10) + '    <form method="dialog">' + chr(10) + '      <button>Cancel</button>' + chr(10) + '      <button class="primary" value="ok">Confirm</button>' + chr(10) + '    </form>' + chr(10) + '  </footer>' + chr(10) + '</dialog>')}
<h2>Notes</h2>
<p>Enter/exit animations use <code>@starting-style</code> +
<code>transition-behavior: allow-discrete</code> — the backdrop fades too.
Invoker commands (<code>commandfor</code>/<code>command</code>) are
Baseline-new; where unsupported, <code>el.showModal()</code> is the
one-line fallback. <code>dialog.returnValue</code> carries the value of
the submitting button.</p>
""",
    ),
    dict(
        group="Patterns", slug="accordion", title="accordion", tier="1",
        lead="details + summary. Exclusivity, keyboard, and semantics are the browser's — the shared name attribute does the grouping.",
        body=f"""
{specimen('<div style="inline-size: 100%"><details name="dacc" open><summary>Is it accessible?</summary><p>Yes. It is a native disclosure element; AT support comes with it.</p></details><details name="dacc"><summary>Is it styled?</summary><p>Border-per-item, rotating chevron, hover underline — the shadcn look.</p></details><details name="dacc"><summary>Is it animated?</summary><p>Height eases via interpolate-size where supported; instant elsewhere.</p></details></div>')}
{code('<details name="faq">' + chr(10) + '  <summary>Is it accessible?</summary>' + chr(10) + '  <p>Yes.</p>' + chr(10) + '</details>' + chr(10) + '<details name="faq">' + chr(10) + '  <summary>Is it styled?</summary>' + chr(10) + '  <p>Also yes.</p>' + chr(10) + '</details>')}
<h2>Notes</h2>
<p>Omit <code>name</code> for independent disclosures. The open/close
animation uses <code>::details-content</code> +
<code>interpolate-size: allow-keywords</code> (set in the preset) —
browsers without it open instantly. Zero JS either way.</p>
""",
    ),
    dict(
        group="Patterns", slug="popover", title="popover & tooltip", tier="1",
        lead="popover attribute + popovertarget invokers. Toggle, light dismiss, Esc, top layer — the browser's. Zero JS.",
        body=f"""
{specimen('<m-hstack gap="sm" wrap><button popovertarget="dp-menu">Menu</button><button popovertarget="dp-pop">Popover</button><button data-tip="Saved to your library" aria-label="Tooltip demo">Hover me</button></m-hstack><div id="dp-menu" popover class="menu"><button popovertarget="dp-menu" popovertargetaction="hide">Edit</button><button popovertarget="dp-menu" popovertargetaction="hide">Duplicate</button><hr /><button class="danger" popovertarget="dp-menu" popovertargetaction="hide">Delete</button></div><div id="dp-pop" popover><m-vstack gap="2xs"><b>Anchored panel</b><span>Light dismiss, Esc, toggling: all the browser. Anchored to the invoker where anchor positioning exists.</span></m-vstack></div>')}
{code('<button popovertarget="menu">Menu</button>' + chr(10) + chr(10) + '<div id="menu" popover class="menu">' + chr(10) + '  <button popovertarget="menu" popovertargetaction="hide">Edit</button>' + chr(10) + '  <button popovertarget="menu" popovertargetaction="hide">Duplicate</button>' + chr(10) + '  <hr />' + chr(10) + '  <button class="danger" popovertarget="menu" popovertargetaction="hide">Delete</button>' + chr(10) + '</div>' + chr(10) + chr(10) + '<button data-tip="Saved" aria-label="Saved">Hover me</button>')}
<h2>Notes</h2>
<p>Menu items close the menu declaratively (<code>popovertargetaction="hide"</code>)
— an item is a button doing its job plus one attribute. Tab/Esc/light-dismiss
are native; arrow-key roving is a future Tier-2 module. Tooltips are CSS-only
(<code>data-tip</code>) and visual — pair with <code>aria-label</code> or
visible text. Where anchor positioning is missing, popovers fall back to the
UA's centered position.</p>
""",
    ),
]

GROUPS = ["Start", "Layout", "Elements", "Forms", "Patterns"]


def href_for(slug: str, from_root: bool) -> str:
    if slug == "index":
        return "index.html" if from_root else "../index.html"
    return f"docs/{slug}.html" if from_root else f"{slug}.html"


def nav_html(current: str, from_root: bool) -> str:
    parts = [f'<a class="brand" href="{href_for("index", from_root)}">mica</a>']
    for g in GROUPS:
        parts.append(f"<h2>{g}</h2>")
        for p in PAGES:
            if p["group"] != g:
                continue
            cur = ' aria-current="page"' if p["slug"] == current else ""
            parts.append(f'<a href="{href_for(p["slug"], from_root)}"{cur}>{esc(p["title"])}</a>')
    return "\n      ".join(parts)


def page_html(p: dict) -> str:
    from_root = p["slug"] == "index"
    css_href = "mica.css" if from_root else "../mica.css"
    idx = PAGES.index(p)
    prev_p = PAGES[idx - 1] if idx > 0 else None
    next_p = PAGES[idx + 1] if idx < len(PAGES) - 1 else None
    pager = ""
    if p["slug"] != "index":
        prev_a = f'<a href="{href_for(prev_p["slug"], from_root)}">&larr; {esc(prev_p["title"])}</a>' if prev_p else "<span></span>"
        next_a = f'<a href="{href_for(next_p["slug"], from_root)}">{esc(next_p["title"])} &rarr;</a>' if next_p else "<span></span>"
        pager = f'\n          <m-hstack justify="between" class="pager">{prev_a}{next_a}</m-hstack>'
    badge = f' <span class="badge">Tier {p["tier"]}</span>' if p.get("tier") is not None else ""
    crumb = f'<span class="crumb">{p["group"]} / {esc(p["title"])}</span>' if p["slug"] != "index" else ""
    scripts = "\n".join(
        f'  <script type="module" src="{s if not from_root else s.removeprefix("../")}"></script>'
        for s in p.get("scripts", [])
    )
    extra_css = p.get("extra_css", "")
    title = "mica" if from_root else f'{p["title"]} — mica'
    return f"""<!doctype html>
<!-- generated by tools/build-docs.py — edit there, not here -->
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{esc(title)}</title>
  <link rel="stylesheet" href="{css_href}" />
{scripts}
  <style>{SHELL_CSS}{extra_css}  </style>
</head>
<body>
  <m-sidecar side-width="xs">
    <nav class="rail">
      {nav_html(p["slug"], from_root)}
    </nav>
    <article id="main">
      <m-center style="--max: 48rem">
        <m-vstack gap="xl">
          {crumb}
          <m-vstack gap="2xs">
            <m-hstack gap="sm"><h1>{esc(p["title"])}</h1>{badge}</m-hstack>
            <p class="lead">{p["lead"]}</p>
          </m-vstack>
{p["body"]}{pager}
        </m-vstack>
      </m-center>
    </article>
  </m-sidecar>
</body>
</html>
"""


def main() -> None:
    os.makedirs("docs", exist_ok=True)
    for p in PAGES:
        path = "index.html" if p["slug"] == "index" else f"docs/{p['slug']}.html"
        with open(path, "w") as f:
            f.write(page_html(p))
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
