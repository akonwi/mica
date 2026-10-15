# Paper tool reference

Read this before your first `write_html` in a session, and whenever a write
renders wrong or a node goes missing.

## write_html

- One visual item per call, `mode: insert-children` into the target
  frame.
- Escape `<` and `>` in text (`&lt;` `&gt;`). Never put double quotes
  inside a `layer-name` attribute.
- Collapse `>\n<` between tags. Keep newlines inside
  `white-space: pre-wrap` text; they render as line breaks.
- Parallel writes into the same parent can land out of order. Check with
  `get_children`; fix with `move_nodes`.
- A screenshot taken right after a write can miss the node. Take it
  again.

## CSS Paper does not support

| Not supported | Use instead |
|---|---|
| `margin` | padding on the parent, or `gap` |
| `transform`, negative values | fixed offsets; absolute positioning |
| `calc()`, `color-mix()` | precomputed numbers; `--derived-*` tokens |
| `outline` | `box-shadow` (focus ring below) |
| `border` shorthand + `border-*-width` in one style | longhands only (the pair drops the border) |
| `border-width: var(--focus-ring-width)` | `2px` (the var drops the node) |
| inline styling inside one text node | separate text nodes; links as per-word runs in a flex-wrap row (column-gap 4px), the link words underlined |

- Focus ring: `box-shadow: 0 0 0 2px <surface underneath>, 0 0 0 4px
  var(--focus-ring-color)`.
- Flex-wrap frames need `align-content: flex-start` or the lines
  stretch.
- Absolute children need `position: relative` on the parent.
- Paper's list bullet glyph is too small; draw markers as 6px circles.
- SVG `stroke` and `fill` attributes are not styles. Duplicating and
  restyling can't re-theme an icon; write the Dark version from the
  generator.

## Reading and editing

- `get_basic_info`: the file's pages, the current page's artboards with
  positions, and the token list.
- `get_children` errors on some IDs. `get_node_info` (parentId,
  childIds) still works.
- `get_computed_styles` takes `nodeIds: []`.
- `get_jsx` formats are `inline-styles` or `tailwind`.
- `set_text_content` takes `updates: [{ nodeId, textContent }]` and
  replaces the whole text.
- `duplicate_nodes` takes `nodes: [{ id }]`.
- `find_nodes`: `filters: [{ styleValue: "--token" }]` finds every
  binding of a token; `textValue: "*foo*"` finds text mentions. Run both
  before renaming a token or changing a rule.
- `set_tokens`: rename (`newName`), revalue (`value`) or delete.
  Bindings follow a rename.
- Screenshots: review at `scale: 1`; downscaled shots mislead about thin
  rules and small text.
- `finish_working_on_nodes` on the artboard when a pass is complete.

## Comments

Paper has no reply tool. Answer the comment in chat, update the canvas,
then resolve the thread.
