---
name: Chromium flex min-height scroll bug
description: Template-stamped inspector panels (resize, watermark) must use display:contents, not display:flex, to scroll correctly.
---

## Rule
When a template is stamped into an intermediate container div inside `.app-inspector`, set that container's `display` to **`contents`** (not `flex`) when showing it.

**Why:** `.app-inspector` is a bounded flex column (height from CSS grid). The crop inspector uses `display:contents` so its children (header, scroll-body, footer) are **direct** flex children of `.app-inspector` — they get bounded heights and `overflow-y:auto` works. If an intermediate container uses `display:flex`, Chromium fails to propagate the grid-provided height through the multi-level flex chain, so the inner body's `overflow-y:auto` never triggers; content is clipped by a parent `overflow:hidden` with no scrollbar.

**How to apply:**
- In `app.js → switchToTool()`, always show template-panel containers with `display: 'contents'`, never `display: 'flex'`.
- The template content still needs the correct structure: `.ri-header` (flex-shrink:0) + scrollable body (flex:1; min-height:0; overflow-y:auto) + `.inspector-footer` (flex-shrink:0).
- No special CSS needed on `#resize-inspector-view` or `#watermark-inspector-view`.
