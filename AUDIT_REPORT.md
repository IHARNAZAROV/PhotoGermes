# Технический аудит — Фотоцентр ГермесГарант
> Проведён как опытный Software Architect · Senior Electron Developer · Performance Engineer  
> Дата: 2026-08-04  
> Версия проекта: 1.0.0

---

## 📋 СОДЕРЖАНИЕ

1. [Архитектура проекта](#1-архитектура)
2. [Dead Code (мёртвый код)](#2-dead-code)
3. [Дублирование кода](#3-дублирование)
4. [JavaScript](#4-javascript)
5. [CSS](#5-css)
6. [HTML](#6-html)
7. [Electron](#7-electron)
8. [Производительность](#8-производительность)
9. [Изображения и шрифты](#9-изображения-и-шрифты)
10. [Зависимости](#10-зависимости)
11. [Безопасность](#11-безопасность)
12. [Итоговый рейтинг](#12-итоговый-рейтинг)
13. [План оптимизации](#13-план-оптимизации)
14. [Финальный отчёт (сводная таблица)](#14-финальный-отчёт)
15. [Быстрые победы (Quick Wins)](#15-quick-wins)

---

## 1. Архитектура

### Общая оценка: ★★★★☆ — хорошая база, но требует рефакторинга

**Положительное:**
- Правильная структура Electron: `main.js` ↔ `preload.js` (contextBridge) ↔ `renderer/`
- Разделение CSS по назначению (variables / layout / components / app)
- JS разбит по модулям: app.js, crop.js, resize.js, watermark.js, zoom.js, colorpicker.js
- Неразрушительный pipeline операций (`photo.ops[]`) — архитектурно грамотное решение
- Undo/Redo per-photo с Blob URL вместо base64 — правильный подход к памяти

**Проблемы:**

| # | Проблема | Критичность |
|---|----------|-------------|
| A1 | `index.html` — 2090 строк в одном файле. Все 4 панели инспектора и 3 вида редактора загружены одновременно в DOM | Высокая |
| A2 | Глобальный namespace (`window.*`) как шина обмена данными между модулями: `window.cropGetNormalized`, `window.cropSetPhoto`, `window.resizeLoadPhoto`, `window.__resizeGetParams`, `window.__resizeGetPhoto`, `window.__resizeMode`, `window.__getResizeKernel`, `window.generateThumbnail`, `window.formatSize`, `window.zoom`, `window.wmActivate` — 11 глобальных экспортов | Средняя |
| A3 | Нет сборщика (Vite / webpack / esbuild). В Replit это ограничение среды, но для Electron-продакшна это важно | Низкая |
| A4 | Нет явных TypeScript-типов или JSDoc-типов для `Photo` object (только `@type {Array<Photo>}` без определения типа) | Низкая |
| A5 | `activeTool` — глобальная переменная в app.js, но используется в watermark.js через `typeof activeTool !== 'undefined'` — хрупкая связь | Средняя |

**Рекомендации:**
- Ввести `EventBus` (простой `EventTarget` или паттерн pub/sub) вместо `window.*` для межмодульного общения
- Разбить `index.html` на шаблоны (хотя бы логически через `<!-- templates -->`) и загружать секции через JS
- Определить явный тип `Photo` как JSDoc `@typedef`

---

## 2. Dead Code

### 2.1 Мёртвые функции инициализации в `app.js`

**Проблема:** В `DOMContentLoaded` вызываются функции, которые ищут несуществующие DOM-элементы. Это не вызывает ошибок (благодаря optional chaining), но функции работают вхолостую при каждой загрузке.

---

#### `initInspectorTabs()` — полностью мёртвая
- **Файл:** `renderer/js/app.js`, строки 935–946
- **Причина:** Ищет `.inspector-tab` и `.inspector-panel` — таких элементов нет в HTML. Инспектор переключается через `switchToTool()` с прямыми ID (`#crop-inspector-view`, `#resize-inspector-view`, `#watermark-inspector-view`)
- **Безопасность удаления:** ✅ Полная — без последствий
- **Влияние:** ~12 строк кода + 1 вызов в `DOMContentLoaded`

```js
// УДАЛИТЬ — app.js L935-946:
function initInspectorTabs() {
    const tabs   = document.querySelectorAll('.inspector-tab');   // 0 результатов
    const panels = document.querySelectorAll('.inspector-panel'); // 0 результатов
    tabs.forEach(tab => { ... });
}
```

---

#### `initSubTabs()` — полностью мёртвая
- **Файл:** `renderer/js/app.js`, строки 948–957
- **Причина:** Ищет `.sub-tabs` / `.sub-tab` — в HTML нет. Замена — `ri-pill-btn` система в watermark-inspector
- **Безопасность удаления:** ✅ Полная
- **Влияние:** ~10 строк

---

#### `initToggles()` — полностью мёртвая
- **Файл:** `renderer/js/app.js`, строки 959–961
- **Причина:** Ищет `.toggle` — в HTML нет старых тоггл-кнопок. Используется `export-toggle` (data-state="on/off") и `ri-switch-input`
- **Безопасность удаления:** ✅ Полная
- **Влияние:** ~3 строки

---

#### `initPositionGrid()` — полностью мёртвая
- **Файл:** `renderer/js/app.js`, строки 963–970
- **Причина:** Ищет `.pos-cell` — в HTML нет. Позиционная сетка ватермарка использует `.wm-pos-cell`, которая инициализируется в `watermark.js::initWmPositionGrids()`
- **Безопасность удаления:** ✅ Полная
- **Влияние:** ~8 строк

---

#### `initOpacity()` — полностью мёртвая
- **Файл:** `renderer/js/app.js`, строки 972–976
- **Причина:** Ищет `#opacity-slider` и `#opacity-value` — таких ID нет в HTML. Прозрачность ватермарка управляется через `#wm-text-opacity` и `#wm-img-opacity`
- **Безопасность удаления:** ✅ Полная
- **Влияние:** ~5 строк

---

### 2.2 Несуществующий DOM-элемент в `initCropButtons()`

- **Файл:** `renderer/js/app.js`, строка 1181
- **Код:** `const applyOne = document.getElementById('btn-apply-crop'); if (applyOne) applyOne.addEventListener('click', applyCropCurrent);`
- **Причина:** `#btn-apply-crop` не существует в HTML. Кнопка называется `#btn-apply-all`, и она уже обрабатывается в той же функции строкой 1185
- **Безопасность удаления:** ✅ Строки 1181–1182 можно удалить

---

### 2.3 Несуществующий `window.wmActivate`

- **Файл:** `renderer/js/app.js`, строка 893
- **Код:** `window.wmActivate?.();`
- **Причина:** `wmActivate` нигде не экспортируется в `watermark.js` — функция не существует. Optional chaining скрывает ошибку.
- **Безопасность удаления:** ✅ Строку можно удалить или реализовать функцию
- **Влияние:** При переключении на инструмент "Ватермарк" действие не выполняется

---

### 2.4 Мёртвый CSS — legacy/compat алиасы

- **Файл:** `renderer/css/components.css`, строки 1136–1157
- **Причина:** Блок помечен комментарием `/* ── Legacy/compat aliases ──────────────────────────── */` — 22 класса: `.icp-straighten`, `.icp-slider`, `.icp-reset-btn`, `.icp-angle-wrap`, `.icp-size-row`, `.icp-dim-group`, `.icp-dim-label`, `.icp-aspect-row`, `.icp-aspect-label`, `.icp-select-wrap`, `.icp-straighten-row`, `.frame-params-row`, `.frame-hint--block`
- Ни один из этих классов не присутствует в `index.html`
- **Безопасность удаления:** ✅ Полная
- **Влияние:** ~22 строки CSS

---

### 2.5 Мёртвый CSS — устаревшие компоненты

Классы, определённые в `components.css`, но отсутствующие в `index.html`:

| CSS-класс | Строки | Строк CSS | Примечание |
|-----------|--------|-----------|-----------|
| `.header-user`, `.avatar`, `.user-info`, `.user-name`, `.user-role` | 127–154 | ~28 | Блок пользователя — нет в шапке |
| `.inspector-tabs`, `.inspector-tab`, `.inspector-body`, `.inspector-section`, `.inspector-section-title` | 1162–1202 | ~42 | Старая табовая навигация инспектора |
| `.sub-tabs`, `.sub-tab` | 1289–1312 | ~25 | Старые саб-табы |
| `.color-row`, `.color-label`, `.color-swatch`, `.opacity-slider`, `.opacity-value` | 1314–1336 | ~23 | Старые контролы цвета |
| `.position-grid`, `.pos-cell`, `.position-row` | 1338–1362 | ~26 | Старая сетка позиции |
| `.check-row`, `.check-row input`, `.check-row label` | 1364–1381 | ~18 | Старые чекбоксы |
| `.toggle-row`, `.toggle-label`, `.toggle` | 1205–1239 | ~36 | Старый тоггл (не `.export-toggle` и не `.ri-switch`) |
| `.form-group`, `.form-label`, `.form-input`, `.form-row`, `.form-select` | 1242–1287 | ~46 | Общие формы — нигде не применяются |
| `.frame-params`, `.frame-param-group`, `.frame-param-label`, `.frame-input`, `.frame-hint` | 644–769 | ~80 | Старый тулбар кадра |

**Итого:** ~324 строки мёртвого CSS (~9% всего `components.css`)

---

### 2.6 Мёртвая экспозиция в `resize.js`

- **Файл:** `renderer/js/resize.js`, строка 42
- **Код:** `window.__getResizeKernel = getResizeKernel;`
- **Причина:** `getResizeKernel` вызывается только внутри `resize.js` (строка 388). Ни один другой файл не использует `window.__getResizeKernel`
- **Безопасность удаления:** ✅ Строку можно удалить

---

### 2.7 Мёртвая функция `getCanvasArea()` в `zoom.js`

- **Файл:** `renderer/js/zoom.js`, строка 22
- **Код:** `function getCanvasArea() { return _activeArea; }`
- **Причина:** Функция определена, но нигде не вызывается — ни внутри zoom.js, ни в экспорте `window.zoom`
- **Безопасность удаления:** ✅ Полная

---

## 3. Дублирование

### 3.1 Дублирование логики создания миниатюр

- **Файл 1:** `renderer/js/app.js`, строки 127–134 (функция `generateThumbnail`)
- **Файл 2:** `renderer/js/app.js`, строки 747–762 (функция `readFileThumbnail`)

`readFileThumbnail` создаёт временный `<img>`, canvas с теми же размерами 160×120, и экспортирует JPEG с тем же качеством 0.75 — это та же логика, что и `generateThumbnail`, но с дополнительным URL.createObjectURL.

**Как исправить:**
```js
// БЫЛО: readFileThumbnail — повторяет логику generateThumbnail
function readFileThumbnail(file) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio  = Math.min(160 / img.width, 120 / img.height);
            canvas.width  = Math.round(img.width  * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// СТАЛО: переиспользовать generateThumbnail
function readFileThumbnail(file) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const thumb = generateThumbnail(img, img.naturalWidth, img.naturalHeight);
            URL.revokeObjectURL(url);
            resolve(thumb);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}
```
**Экономия:** ~10 строк

---

### 3.2 Дублирование `formatSize` в `resize.js`

- **Файл 1:** `renderer/js/app.js`, строки 106–110 (функция `formatSize`, экспортирована как `window.formatSize`)
- **Файл 2:** `renderer/js/resize.js`, строки 354–358 (функция `formatResizeSize` — полная копия с комментарием "Fall back to a local copy in case of unexpected load order")

Поскольку порядок загрузки в HTML детерминирован (app.js загружается первым), fallback никогда не выполняется.

**Как исправить:**
```js
// УДАЛИТЬ функцию formatResizeSize из resize.js, заменить на:
function formatResizeSize(bytes) { return window.formatSize(bytes); }
// или просто использовать window.formatSize(bytes) везде в resize.js
```
**Экономия:** ~5 строк

---

### 3.3 Дублирование mesh-градиента фона

- **Файл:** `renderer/css/components.css`
- **Первый экземпляр:** строки 469–474 (`.editor-image-placeholder`)
- **Второй экземпляр:** строки 1833–1839 (`.resize-split-container`)

Одинаковый 5-строчный mesh gradient:
```css
background:
    radial-gradient(ellipse 85% 65% at 12% 22%, rgba(30,145,104,.80) 0%, transparent 58%),
    radial-gradient(ellipse 60% 70% at 88% 82%, rgba(8,44,33,.90) 0%, transparent 54%),
    radial-gradient(ellipse 52% 42% at 62%  8%, rgba(68,196,142,.30) 0%, transparent 62%),
    radial-gradient(ellipse 70% 55% at 45% 70%, rgba(22,98,76,.45) 0%, transparent 65%),
    linear-gradient(152deg, #060e0b 0%, #0d2e22 32%, #16624c 64%, #1d8060 100%);
```

**Как исправить:** Вынести в переменную CSS или общий класс:
```css
.app-editor-canvas-bg {
    background: /* gradient */;
}
```
Применить оба класса к соответствующим элементам.  
**Экономия:** ~5 строк CSS

---

### 3.4 Дублирование паттерна "открытие/закрытие модального окна"

Функции `initHistoryModal()` (строки 2220–2239) и `initAboutModal()` (строки 2241–2263) в `app.js` абсолютно идентичны по структуре:

```js
// Оба содержат:
function open()  { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
function close() { modal.classList.remove('open'); document.body.style.overflow = ''; }
```

**Как исправить:** Единая утилита:
```js
function initModal(modalId, openActionSelector, closeBtnIds = []) { ... }
initModal('history-modal', '[data-action="history"]', ['history-close', 'history-close-btn']);
initModal('about-modal',   '[data-action="about"]',   ['about-close',   'about-close-btn']);
```
**Экономия:** ~25 строк

---

### 3.5 Повторяющийся паттерн querySelector в критических путях

В `app.js` следующие запросы выполняются при каждом действии вместо кэширования:
```js
document.querySelector('.gallery-list')   // вызывается в 5 функциях
document.querySelector('.footer-info')    // вызывается в 7 функциях
document.querySelector('.footer-file')    // вызывается в 3 функциях
document.getElementById('btn-nav-prev')   // вызывается в 2 функциях
document.getElementById('btn-nav-next')   // вызывается в 2 функциях
```

---

### 3.6 Дублирование TOGGLE_KEYS массива

- **Файл:** `renderer/js/app.js`
- `const TOGGLE_KEYS = ['keepExif', 'colorProfile', 'progressive', 'webOptimize']`  
  — определён **дважды**: в `initExportPage()` (строка 2098) и `_applyExportSettingsToUI()` (строка 2205)

**Как исправить:** Вынести в константу модульного уровня.

---

## 4. JavaScript

### 4.1 🔴 Критическая ошибка: несоответствие ID ватермарка

**Файл:** `renderer/js/watermark.js`

**Проблема:** В `getWmSettings()` (строка 895) и `initWmTextControls()` (строка 162) используются ID:
```js
document.getElementById('wm-text-offset-x')  // не существует
document.getElementById('wm-text-offset-y')  // не существует
```

В HTML (`index.html`, строки 942, 949) реальные ID:
```html
<input id="wm-offset-x" ...>
<input id="wm-offset-y" ...>
```

**Последствие:** Отступы ватермарка **всегда равны 0** вместо значений из интерфейса. Функция `initWmTextControls` не подписывается на изменения этих полей. Это незаметная silent-ошибка.

**Как исправить:**
```js
// БЫЛО:
document.getElementById(isText ? 'wm-text-offset-x' : 'wm-img-offset-x')
// СТАЛО:
document.getElementById(isText ? 'wm-offset-x' : 'wm-img-offset-x')
```

---

### 4.2 🔴 Критическая ошибка: `initWmTextControls` обращается к несуществующему элементу

**Файл:** `renderer/js/watermark.js`, строка 85
```js
const fontFamily = document.getElementById('wm-font-family'); // возвращает null
fontFamily?.addEventListener('change', updateWmOverlay);      // не срабатывает никогда
```

Реальный элемент — это кастомный dropdown, обрабатываемый в `initWmFontDropdown()`. Переменная `fontFamily` здесь является мёртвым кодом.

---

### 4.3 🟡 Утечка Blob URL при ошибке Undo

**Файл:** `renderer/js/app.js`, строки 1114, 1290

При неудачном применении операции код делает `photoUndoStack(photo).pop()`, но **не вызывает `freeSnapshot()`** на удалённом снимке:

```js
// БЫЛО — утечка:
photoUndoStack(photo).pop();
updateUndoRedoBtns();

// ДОЛЖНО БЫТЬ:
const snap = photoUndoStack(photo).pop();
freeSnapshot(snap);
updateUndoRedoBtns();
```

**Последствие:** Blob URL снимка не освобождается → утечка памяти при частых неудачных операциях.

---

### 4.4 🟡 Повторные querySelector в горячих путях

**Файл:** `renderer/js/app.js`

`document.querySelector('.gallery-list')` вызывается в `rebuildGallery`, `syncItemCheckedClass`, `patchThumbnail`, `selectPhoto` — каждый раз при изменении галереи. При 100+ фото это может вызываться сотни раз.

```js
// Добавить в начало модуля / DOMContentLoaded:
let $galleryList  = null;
let $footerInfo   = null;
// ...
document.addEventListener('DOMContentLoaded', () => {
    $galleryList = document.querySelector('.gallery-list');
    $footerInfo  = document.querySelector('.footer-info');
    // ...
});
```

---

### 4.5 🟡 `triggerDownload` добавляет элемент в DOM без необходимости

**Файл:** `renderer/js/app.js`, строки 1328–1337

```js
// БЫЛО — не нужен appendChild в современных браузерах:
document.body.appendChild(a);
a.click();
document.body.removeChild(a);

// СТАЛО:
a.click(); // достаточно
```

---

### 4.6 🟡 `renderTileGrid` создаёт 12 DOM-узлов на каждый кадр RAF

**Файл:** `renderer/js/watermark.js`, строки 724–757

В tile-режиме при каждом вызове `updateWmOverlay()` (включая RAF через `scheduleWmOverlay`) выполняется:
1. `tileGrid.innerHTML = ''` — удаление 12 узлов
2. Цикл `for (let i = 0; i < 12; i++)` — создание 12 новых

**Как исправить:** Обновлять только изменившиеся свойства (text, style), не пересоздавая DOM.

---

### 4.7 🟡 Синхронный I/O в async IPC-обработчиках

**Файл:** `main.js`, строки 27, 75, 159

```js
// БЫЛО — блокирующий вызов в async-функции:
const stat = fs.statSync(filePath);  // L27
fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'));  // L75
let buf = fs.readFileSync(originalFilePath);  // L159

// ДОЛЖНО БЫТЬ:
const stat = await fs.promises.stat(filePath);
await fs.promises.writeFile(tmpPath, Buffer.from(base64, 'base64'));
let buf = await fs.promises.readFile(originalFilePath);
```

**Последствие:** Блокировка event loop главного процесса при обработке больших файлов → зависание UI

---

### 4.8 🟢 `body.style.overflow = 'hidden'` в модалях избыточно

**Файл:** `renderer/js/app.js`, строки 2227–2228, 2249–2250

Поскольку `html, body { overflow: hidden; }` уже установлено в `layout.css` (строка 14), изменение `document.body.style.overflow` в модалях не даёт эффекта.

---

## 5. CSS

### 5.1 🔴 Самопротиворечивое правило border в `components.css`

**Файл:** `renderer/css/components.css`, строки 1093–1101

```css
.icp-align-slider::-moz-range-thumb {
    border: 2.5px solid var(--color-primary);  /* L1094 */
    box-shadow: ...;
    cursor: pointer;
    border: none;  /* L1100 — перекрывает предыдущее! */
}
```

Второй `border: none` отменяет первый. Firefox отображает ползунок без рамки, хотя предполагается рамка `--color-primary`.

**Как исправить:** Удалить строку `border: none` (L1100).

---

### 5.2 🟡 `!important` в трёх местах

| Файл | Строки | Класс | Правило |
|------|--------|-------|---------|
| components.css | 890–892 | `.ri-dim-input--text` | `font-size`, `font-weight`, `text-align` |
| app.css | 537 | `.ep-format-grid` | `grid-template-columns` |
| components.css | 1989 | `.resize-zoom-btn` | `width` |

`!important` следует избегать. В каждом случае проблема решается уточнением специфичности селектора.

---

### 5.3 🟡 Жёсткое кодирование цвета `var(--color-primary)` через rgba

Значение `rgba(22, 98, 76, ...)` встречается **30+ раз** напрямую вместо переменной. При смене бренда потребуется ручная замена в 30+ местах.

**Как исправить:** Добавить в `variables.css`:
```css
--color-primary-rgb: 22, 98, 76;
/* использовать как: */
background: rgba(var(--color-primary-rgb), 0.12);
```

---

### 5.4 🟡 Дублирующееся определение `.resize-split-divider`

**Файл:** `renderer/css/components.css`, строки 1904 и 1923

`.resize-split-divider` определяется **дважды** — первый полный блок (строки 1904–1925), затем пустой-переопределяющий `left: 50%` (строки 1923–1925). Второй блок — остаток рефакторинга.

---

### 5.5 🟢 Пустое правило `.ri-pill-group {}`

**Файл:** `renderer/css/components.css`, строка 2079

```css
.ri-pill-group { }  /* пустое правило */
```

---

### 5.6 🟢 Дублирование `@font-face` — нет italic/oblique начертаний

В `app.css` загружаются Inter 400, 500, 600, 700. Italic-вариант не загружен. В watermark.js при `italic: true` браузер синтетически наклоняет шрифт (font synthesis). Для заголовков это приемлемо, но стоит задокументировать.

---

## 6. HTML

### 6.1 🟡 Семантика

| Проблема | Строка | Рекомендация |
|----------|--------|-------------|
| `<div class="app-root">` как корневой контейнер | L14 | Не критично, но `<div role="application">` выразительнее |
| Кнопки без `aria-label` при отсутствии видимого текста | L62–70 (nav prev/next) | Добавить `aria-label="Предыдущее фото"` |
| `<input type="text" id="frame-width">` — тип text вместо number | L655 | Используется намеренно (более гибкий ввод), но нет `inputmode="numeric"` |
| `style="display:contents"` на нескольких `<div>` | L361, L581, etc. | Лучше управлять через JS-класс, не inline-стиль |
| `<aside class="app-inspector">` — правильная семантика ✅ | — | — |
| Многочисленные `style="padding-top:0"` inline | L649, L676, etc. | Вынести в CSS-классы |

### 6.2 🟡 Accessibility

- Нет `aria-live` для toast-уведомлений → screen reader не объявляет "Обрезка применена"
- Нет `role="dialog"` + `aria-modal="true"` на модальных окнах About и History
- Нет `aria-pressed` на toggle-кнопках (Bold, Italic в watermark panel)
- Нет `aria-expanded` на кастомных dropdown-кнопках

### 6.3 🟢 SEO (неприменимо для desktop Electron)

Для Electron-приложения метатеги SEO не нужны. Viewport meta присутствует — хорошо.

### 6.4 🟢 Размер HTML

2090 строк / 112KB для одного файла — значительно. При компиляции (Vite/webpack) это было бы разбито автоматически.

---

## 7. Electron

### 7.1 ✅ Корректная конфигурация безопасности

```js
// main.js L278-281
webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,   // ✅
    nodeIntegration: false    // ✅
}
```

### 7.2 🟡 Отсутствует `sandbox: true`

**Файл:** `main.js`, строка 278

Начиная с Electron 20+ рекомендуется `sandbox: true`. Это изолирует renderer-процесс от Node.js API даже на уровне ОС.

```js
webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true  // добавить
}
```

**Важно:** После включения `sandbox: true` preload.js должен использовать только браузерные API и contextBridge — текущий preload.js уже соответствует этому требованию.

### 7.3 🟡 Нет `app.requestSingleInstanceLock()`

**Файл:** `main.js` (отсутствует)

Без блокировки можно запустить несколько экземпляров приложения одновременно. Они будут конкурировать за запись одних файлов.

```js
// Добавить перед app.whenReady():
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
    app.on('second-instance', () => { win?.focus(); });
}
```

### 7.4 🟡 Нет паттерна `ready-to-show`

**Файл:** `main.js`, строки 270–286

Окно показывается сразу при создании (`win.loadFile(...)` без `show: false`). При медленной загрузке пользователь видит белый экран.

```js
// СТАЛО:
const win = new BrowserWindow({ ..., show: false });
win.once('ready-to-show', () => win.show());
win.loadFile(...);
```

### 7.5 🟡 Нет валидации путей в IPC-обработчиках

**Файл:** `main.js`

Пути к файлам (`filePath`) передаются из renderer напрямую в `fs.readFileSync` / `sharp()` без проверки на path traversal. Хотя они поступают из нативных диалогов, явная валидация (например, проверка `path.isAbsolute(filePath)` и нет ли `../`) — хорошая практика.

### 7.6 🟢 IPC-безопасность

- contextBridge экспортирует только конкретные методы (не весь `ipcRenderer`) ✅
- Нет `remote` module ✅
- Нет `eval` ✅
- Нет `webSecurity: false` ✅

---

## 8. Производительность

### 8.1 Память

| Проблема | Оценка потребления | Решение |
|----------|-------------------|---------|
| Base64 data-URL для previews в памяти | +33% к размеру файла на фото | Blob URL (уже используется для undo, применить и для previews) |
| Все DOM-панели загружены одновременно | ~200KB DOM для неактивных панелей | Lazy-создание панелей при первом переключении |
| 12 DOM-узлов пересоздаются на каждый RAF в tile-режиме | — | Обновлять только свойства, не пересоздавать узлы |

### 8.2 Загрузка

| Ресурс | Размер | Оценка |
|--------|--------|--------|
| index.html | 112 KB | 🔴 Слишком большой |
| components.css | 92 KB | 🟡 Большой (из них ~30KB мёртвый) |
| app.js | 96 KB | 🟡 Приемлемо |
| watermark.js | 48 KB | 🟢 Нормально |
| Inter шрифты (4 файла) | 96 KB суммарно | 🟡 Без subset |

### 8.3 Рендеринг

- Все 4 набора панелей (crop / resize / watermark / export) находятся в DOM одновременно. `display:none` предотвращает reflow, но они занимают память и парсятся при загрузке
- Mesh-градиент в `.editor-image-placeholder` использует 5 `radial-gradient` + 1 `linear-gradient` — тяжёлый расчёт при изменении размера окна, но вызывается не часто

---

## 9. Изображения и шрифты

### Изображения

Проект не использует растровые изображения — все иконки встроены как SVG прямо в HTML. Это корректный подход для desktop-приложения.

### Шрифты

| Файл | Вес | Начертание | Использование |
|------|-----|-----------|--------------|
| inter-400.woff2 | ~24 KB | Regular | Основной текст |
| inter-500.woff2 | ~24 KB | Medium | Кнопки, метки |
| inter-600.woff2 | ~24 KB | Semibold | Заголовки |
| inter-700.woff2 | ~24 KB | Bold | Названия секций |

✅ Используется woff2 (оптимальный формат)  
✅ `font-display: swap` установлен  
✅ Локальные файлы — нет внешних запросов  
🟡 Шрифты не субсетированы (full charset). Для Cyrillic+Latin экономия подсетинга составила бы ~40–50% на каждый файл (~50 KB суммарно)  
🟡 Italic-вариант отсутствует (синтетический наклон используется в watermark-режиме)  

---

## 10. Зависимости

### `package.json` анализ

| Пакет | Тип | Используется? | Размер | Рекомендация |
|-------|-----|--------------|--------|-------------|
| `electron` ^43.2.0 | devDep | ✅ Да | ~120 MB | Актуальная версия |
| `sharp` ^0.35.3 | dep | ✅ Да (main.js, lazy require) | ~30 MB | Ключевая зависимость, всё верно |
| `electron-store` ^11.0.2 | dep | ❌ НЕТ | ~200 KB | **Можно удалить** — нигде не импортируется |
| `exif-parser` ^0.1.12 | dep | ❌ НЕТ | ~50 KB | **Можно удалить** — нигде не импортируется |
| `exif-reader` ^2.0.3 | dep | ❌ НЕТ | ~30 KB | **Можно удалить** — нигде не импортируется |

**Итого можно удалить 3 пакета:**

```bash
npm uninstall electron-store exif-parser exif-reader
```

Это уменьшит `node_modules` на ~280 KB и время установки.

**Примечание:** Функционал `electron-store` (персистентность настроек) реализован через `localStorage` в renderer (см. `EXPORT_SETTINGS_KEY` в app.js L1361). EXIF-метаданные не читаются — только размеры через `sharp().metadata()`.

---

## 11. Безопасность

| # | Уязвимость | Уровень | Описание |
|---|-----------|---------|---------|
| S1 | Отсутствует `sandbox: true` | 🟡 Средний | Рекомендован Electron 20+ |
| S2 | Нет валидации путей в IPC | 🟡 Низкий | Пути из нативных диалогов, риск минимален |
| S3 | `document.body.style.overflow` — избыточно, но безвредно | 🟢 | — |
| S4 | `escapeHtml` используется в history ✅ | — | Защита от XSS в пользовательском вводе |
| S5 | contextBridge без `ipcRenderer` expose ✅ | — | Правильная изоляция |
| S6 | Нет `webSecurity: false` ✅ | — | CSP не нарушен |
| S7 | Нет `eval`, `new Function` ✅ | — | Код чистый |
| S8 | `app.requestSingleInstanceLock` отсутствует | 🟡 Низкий | Конкурентный доступ к файлам |

---

## 12. Итоговый рейтинг

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| **Архитектура** | 7/10 | Хорошая база, но 2090-строчный HTML и глобальный namespace |
| **Производительность** | 6/10 | Base64 в памяти, нет lazy loading, синхронный I/O |
| **Безопасность** | 8/10 | Всё основное верно, нет sandbox |
| **Чистота кода** | 6/10 | Много мёртвого кода, несоответствующие ID |
| **Поддерживаемость** | 6/10 | Большие файлы, window.* coupling |
| **Масштабируемость** | 5/10 | Монолитный HTML, нет bundler |
| **CSS** | 6/10 | ~324 строки мёртвого CSS, self-contradicting rule, !important |
| **JavaScript** | 7/10 | В целом хорошо написан, но есть реальные баги |
| **Electron** | 7/10 | Безопасность настроена верно, нет sandbox и ready-to-show |
| **HTML** | 6/10 | 2090 строк, нет aria-live, inline-стили |

**Общий балл: 6.4/10**

---

## 13. План оптимизации

### 🔴 Критические (нужно исправить немедленно)

| # | Задача | Файл | Сложность | Время | Ожидаемый выигрыш |
|---|--------|------|-----------|-------|------------------|
| C1 | Исправить несоответствие ID ватермарк-offset | watermark.js L162, L895 | Низкая | 10 мин | Корректная работа отступов ватермарка |
| C2 | Исправить `wm-font-family` → `wm-font-family-btn` | watermark.js L85 | Низкая | 5 мин | Устранение dead listener |
| C3 | Добавить `freeSnapshot()` в error paths undo | app.js L1114, L1290 | Низкая | 10 мин | Устранение утечки Blob URL |
| C4 | Исправить border self-contradiction в moz-range-thumb | components.css L1100 | Низкая | 2 мин | Корректный Firefox UI |

### 🟡 Высокий приоритет

| # | Задача | Файл | Сложность | Время | Ожидаемый выигрыш |
|---|--------|------|-----------|-------|------------------|
| H1 | Удалить 3 неиспользуемых пакета | package.json | Низкая | 5 мин | −280 KB зависимостей |
| H2 | Удалить мёртвые функции init (5 шт.) | app.js | Низкая | 20 мин | −40 строк, чище DOMContentLoaded |
| H3 | Исправить синхронный I/O в IPC | main.js L27, L75, L159 | Средняя | 30 мин | Нет зависаний при больших файлах |
| H4 | Добавить `sandbox: true` | main.js | Низкая | 10 мин | Повышение безопасности |
| H5 | Добавить `ready-to-show` паттерн | main.js | Низкая | 10 мин | Нет белого экрана при запуске |
| H6 | Добавить `requestSingleInstanceLock()` | main.js | Низкая | 15 мин | Нет конкурентного доступа к файлам |

### 🟠 Средний приоритет

| # | Задача | Сложность | Время | Выигрыш |
|---|--------|-----------|-------|---------|
| M1 | Удалить ~324 строки мёртвого CSS | Средняя | 45 мин | −10% размера CSS |
| M2 | Вынести дублированный gradient в CSS-класс | Низкая | 10 мин | DRY, удобство изменений |
| M3 | Слить дублированные `initModal()` | Низкая | 20 мин | −25 строк |
| M4 | Кэшировать повторяющиеся querySelector | Средняя | 30 мин | Производительность галереи |
| M5 | Объединить форматтеры размера (resize.js) | Низкая | 10 мин | Устранение дублирования |
| M6 | Вынести TOGGLE_KEYS в константу | Низкая | 5 мин | DRY |
| M7 | Добавить `aria-live` для toast | Низкая | 15 мин | Доступность |
| M8 | Заменить `rgba(22,98,76,...)` на переменную | Средняя | 40 мин | Поддерживаемость темы |

### 🟢 Низкий приоритет

| # | Задача | Сложность | Время | Выигрыш |
|---|--------|-----------|-------|---------|
| L1 | Субсетировать шрифты Inter | Средняя | 1–2 ч | −50 KB шрифтов |
| L2 | Вынести `window.*` в EventBus | Высокая | 4–8 ч | Чистая архитектура |
| L3 | Lazy-создание панелей редактора | Высокая | 4–8 ч | −200KB DOM при запуске |
| L4 | Оптимизировать tile-grid в watermark | Средняя | 1–2 ч | Плавность preview |
| L5 | Добавить JSDoc `@typedef Photo` | Низкая | 30 мин | Читаемость |
| L6 | Добавить `inputmode="numeric"` для числовых полей | Низкая | 20 мин | Mobile/tablet UX |

---

## 14. Финальный отчёт

| Метрика | Количество |
|---------|-----------|
| ✅ Найдено мёртвого кода (функции) | 7 функций (~95 строк JS) |
| ✅ Найдено мёртвого CSS | ~324 строки (~9% components.css) |
| ✅ Найдено реальных багов | 3 (ватермарк-offset ID, font-family listener, Blob leak) |
| ✅ Найдено дублирований | 6 (thumbnail, formatSize, gradient, initModal, TOGGLE_KEYS, querySelector) |
| ✅ Найдено проблем безопасности | 3 (sandbox, singleInstance, path validation) |
| ✅ Найдено проблем производительности | 5 (sync I/O, base64, no lazy loading, tile DOM, querySelector) |
| ✅ Строк можно удалить | ~420 строк (~3.7% кодовой базы) |
| ✅ Файлов можно удалить | 0 (все файлы нужны) |
| ✅ Пакетов можно удалить | 3 (`electron-store`, `exif-parser`, `exif-reader`) |
| ✅ Уменьшение размера node_modules | −280 KB |
| ✅ Уменьшение размера CSS | −10–15% (после удаления мёртвого кода) |
| ✅ Ускорение запуска (ready-to-show) | Нет белого экрана |
| ✅ Снижение потребления памяти | Устранение Blob-утечек при частом undo |

---

## 15. Quick Wins

Изменения, которые можно выполнить за **5–30 минут** с максимальным эффектом:

### ⚡ 1. Удалить 3 пакета (5 минут)
```bash
npm uninstall electron-store exif-parser exif-reader
```
Экономия ~280 KB, чище package.json.

### ⚡ 2. Исправить баг отступов ватермарка (10 минут)
`watermark.js` L162 и L895: заменить `'wm-text-offset-x'` → `'wm-offset-x'`, `'wm-text-offset-y'` → `'wm-offset-y'`

### ⚡ 3. Исправить утечку Blob URL (10 минут)
`app.js` L1114 и L1290: добавить `freeSnapshot()` перед pop():
```js
const snap = photoUndoStack(photo).pop();
freeSnapshot(snap);
```

### ⚡ 4. Исправить CSS border (2 минуты)
`components.css` L1100: удалить `border: none;` в `.icp-align-slider::-moz-range-thumb`

### ⚡ 5. Добавить `sandbox: true` и `ready-to-show` (15 минут)
```js
// main.js — webPreferences:
sandbox: true,
// main.js — createWindow:
win.show(false);
win.once('ready-to-show', () => win.show());
```

### ⚡ 6. Удалить 5 мёртвых init-функций (20 минут)
Из `app.js` удалить: `initInspectorTabs`, `initSubTabs`, `initToggles`, `initPositionGrid`, `initOpacity` и их вызовы в `DOMContentLoaded`

### ⚡ 7. Добавить `requestSingleInstanceLock` (5 минут)
```js
// main.js — перед app.whenReady():
const lock = app.requestSingleInstanceLock();
if (!lock) { app.quit(); }
```

### ⚡ 8. Исправить `window.wmActivate` (5 минут)
`app.js` L893: удалить `window.wmActivate?.();` (функция не существует)

---

*Суммарное время всех Quick Wins: ~72 минуты*  
*Суммарный эффект: 3 реальных бага исправлены, 3 пакета удалены, безопасность повышена, памятеечка устранена*
