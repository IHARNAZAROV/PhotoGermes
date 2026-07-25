# Фотоцентр ГермесГарант

A professional photo-editing desktop application built with **Electron** — UI-only interface ready for business logic to be wired in.

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 43 |
| Renderer | HTML5 · CSS3 · Vanilla JS (no frameworks) |
| Image processing | `sharp`, `exif-parser`, `exif-reader` (not yet wired) |
| Storage | `electron-store` (not yet wired) |

## How to run

### Preview (browser, Replit)
The "Preview UI" workflow serves the renderer on **port 5000** via `npx serve renderer -p 5000 -s`.

### Desktop (Electron, local machine)
```bash
npm install
npm start        # runs: electron .
```

Requires Node.js ≥ 18 and a graphical display.

## Project structure

```
main.js            — Electron main process (creates BrowserWindow)
preload.js         — Context bridge (currently exposes empty api object)
renderer/
  index.html       — Root HTML
  css/
    variables.css  — CSS custom properties (colours, radii, typography, dimensions)
    layout.css     — App-level grid & flex layout (header / sidebar / gallery / editor / inspector / footer)
    components.css — All reusable components (buttons, cards, tool items, inspector controls, …)
    app.css        — Utilities, animations, font import
  js/
    app.js         — UI interactions (gallery render, tab switching, toggles, zoom slider, …)
```

## CSS class conventions

| Class | Panel |
|---|---|
| `.app-header` | Top bar (save / undo / user) |
| `.app-sidebar` | Left tools + gallery nav |
| `.app-gallery` | Photo list panel |
| `.app-editor` | Central editing canvas |
| `.app-inspector` | Right settings / history panel |
| `.app-footer` | Status bar + zoom |

## Design tokens (variables.css)

- `--color-primary: #16624c` — brand green
- `--color-bg: #f6f8f9` — app background
- `--color-panel: #ffffff` — panel surfaces
- `--color-border: #e7ebef` — subtle borders
- Font: **Inter** (Google Fonts CDN)

## User preferences

- Pure HTML/CSS/JS — no React, Vue, Angular, Bootstrap, Tailwind, or jQuery.
- CSS Grid + Flexbox only; no absolute positioning for structural layout.
- All panels must resize with the window.
- Keep file structure split by concern (`variables.css`, `layout.css`, `components.css`, `app.css`).
