---
name: Chromium flex min-height scroll bug
description: Why overflow-y:auto on a deeply-nested flex child sometimes doesn't scroll even when overflow:hidden is set on parents.
---

## Rule
When a flex child needs `overflow-y:auto` to scroll, always set **explicit** `min-height: 0` on it AND on every flex/grid ancestor in the chain. Do not rely solely on `overflow: hidden` overriding `min-height: auto` — Chromium has edge cases in multi-level nesting where this doesn't propagate.

**Why:** Per CSS spec, `overflow != visible` on a flex item should override `min-height: auto`. But in practice, Chromium (and therefore Electron) fails to resolve `min-height:auto` correctly in 2+ deep flex chains (grid item → flex column → flex child with `flex:1`), so the child's height is never bounded and `overflow-y:auto` never triggers. The content grows to full intrinsic height; the clip comes from the ancestor `overflow:hidden`, not the scrolling element.

**How to apply:**
- Add `min-height: 0` to every flex/grid container in the scroll chain.
- Use `flex: 1 1 0%` (not just `flex: 1`) on intermediate panels — `flex-basis: 0%` prevents the item from claiming its intrinsic height.
- The actual scrolling element still needs `min-height: 0; overflow-y: auto; flex: 1`.
