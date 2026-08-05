# UI/UX Аудит — Фотоцентр ГермесГарант
> Проведён как ведущий Product Designer уровня Apple · Microsoft · Adobe · Figma · Linear  
> Дата: 2026-08-05 · Версия: 1.0.0  
> Методология: анализ исходного кода + скриншоты + эталоны 2026 года

---

## 📋 СОДЕРЖАНИЕ

1. [Первое впечатление](#1-первое-впечатление)
2. [Визуальная иерархия](#2-визуальная-иерархия)
3. [Компоновка и расположение панелей](#3-компоновка)
4. [Навигация и UX-потоки](#4-навигация)
5. [UX-проблемы и решения](#5-ux-проблемы)
6. [Современные UI-фишки — применимость](#6-современные-ui-фишки)
7. [Типографика](#7-типографика)
8. [Цветовая система](#8-цветовая-система)
9. [Компоненты](#9-компоненты)
10. [Accessibility](#10-accessibility)
11. [Производительность интерфейса](#11-производительность-интерфейса)
12. [Итоговый план рефакторинга](#12-итоговый-план)

---

## 1. Первое впечатление

### Общая оценка: ★★★☆☆ — профессиональная база, устаревшая упаковка

**Что работает хорошо:**
- Единая цветовая схема с зелёным брендом (#16624c) — узнаваемая и последовательная
- Разделение на токены в `variables.css` — архитектурно грамотно
- Inter в качестве шрифта — современно и читаемо
- Панельная компоновка логична для десктопного инструмента
- Скруглённые панели создают ощущение карточности (Notion/Linear style)

**Что выдаёт устаревший дизайн:**

| # | Проблема | Источник |
|---|----------|----------|
| I1 | Шапка высотой **68px** — избыточно для десктопного инструмента 2026 года (норма: 44–52px) | `variables.css --header-h: 68px` |
| I2 | Логотип занимает ~180px из ~1280px ширины экрана — диспропорция | `header-brand` блок |
| I3 | Кнопки в шапке разнородны: primary + outline + ghost + icon-only — нет единой системы | `index.html L49–136` |
| I4 | Инфо-карточка в сайдбаре с эмодзи (✂️📐🔏💾) — диссонирует с профессиональным UI | `app-info-card` |
| I5 | Пустой экран редактора (тёмно-зелёный фон с сеткой) без подсказки «что делать» | `editor-image-placeholder` |
| I6 | Раздел «Галерея» в сайдбаре — фактически просто заголовок «Все фото», лишний уровень | `gallery-nav` |
| I7 | Нет тёмной темы — стандарт де-факто для 2026 года | `variables.css` |
| I8 | Footer с текстом статуса стилистически оторван от остального интерфейса | `app-footer` |

---

## 2. Визуальная иерархия

### 2.1 Контраст

| Элемент | Текущее соотношение | Норма WCAG AA | Оценка |
|---------|-------------------|---------------|--------|
| Основной текст (#20242c на #fff) | ~15:1 | 4.5:1 | ✅ |
| Muted текст (#6f7782 на #fff) | ~4.8:1 | 4.5:1 | ✅ |
| Faint текст (#a8aeb6 на #fff) | ~2.7:1 | 4.5:1 | ❌ Слишком низкий |
| Faint текст (#a8aeb6 на #f6f8f9) | ~2.5:1 | 4.5:1 | ❌ |
| Белый текст на --color-primary (#16624c) | ~7.2:1 | 4.5:1 | ✅ |
| Иконки (muted) на панели | ~3.2:1 | 3:1 для UI | ⚠️ Граничное |

**Проблема:** `--color-faint: #a8aeb6` используется для вспомогательного текста, но не проходит WCAG AA. При уменьшении шрифта до 11px (var(--text-xs)) контраст критически недостаточен.

**Решение:**
```css
--color-faint: #8a9099; /* вместо #a8aeb6 — контраст 3.7:1 */
```

### 2.2 Акценты и размеры

- **Размер кнопок:** `btn-primary` высота 36px — нормально. Но `btn-icon` 32px при шрифте 13px создаёт плотность.
- **Заголовки:** Нет явной H1 в интерфейсе — все панели имеют одинаковый визуальный вес. «Редактирование», «Фотографии», «Обрезка» — одного уровня.
- **Интервалы:** Padding панелей 10px + gap 8px создаёт достаточное дыхание, но само содержимое панелей местами слишком плотное (sidebar-section-label → tool-card — зазор 6–8px).
- **Плотность:** Сайдбар (tool-card) перегружен: иконка + заголовок + подзаголовок на 256px ширине.

### 2.3 Рекомендации по иерархии

```
СЕЙЧАС:              ДОЛЖНО БЫТЬ:
«Обрезка»            «ИНСТРУМЕНТЫ» (label-11px-uppercase)
«Изменение кадра»      Обрезка (tool-name, 13px/500)
                       Изменение кадра (12px/400/muted) — опционально
```

Убрать подзаголовки tool-card из сайдбара — они съедают место и не несут ценности при повторном использовании. Сохранить в tooltip при hover.

---

## 3. Компоновка

### 3.1 Текущая схема

```
┌─────────────────── Header 68px ──────────────────────┐
│ [Logo 180px] [spacer] [Add] [←][→] | [Save][SaveAs] │
│              [sep] [Undo][Redo] | [History] | [About] │
├──────────┬──────────┬────────────────────┬────────────┤
│ Sidebar  │ Gallery  │     Editor         │ Inspector  │
│  256px   │  308px   │  (flexible)        │  312px     │
│          │          │                    │            │
├──────────┴──────────┴────────────────────┴────────────┤
│                  Footer 36px                          │
└───────────────────────────────────────────────────────┘
```

**Проблемы:**

| # | Проблема | Последствие |
|---|----------|-------------|
| L1 | Sidebar (256) + Gallery (308) = 564px фиксированы — Editor получает ~400px при окне 1280px | Редактор узкий, неудобная работа |
| L2 | Gallery и Sidebar имеют схожую ширину (308 vs 256) — нарушен принцип «главное шире» | Нет визуального приоритета |
| L3 | Inspector (312px) почти равен Editor при маленьком окне | Inspector перебивает редактор |
| L4 | Header занимает 68px при фактически 2 строках кнопок | Лишний вертикальный расход |
| L5 | `app-main` padding 10px + gap 8px + 4 панели = много «рам» | Дробит экран |

### 3.2 Рекомендуемая компоновка

```
┌───────────────── Header 48px ────────────────────────┐
│ [Logo 140px] | [←][→] | [Undo][Redo] | [Save][…]   │
│                              [right: History | About] │
├─────────┬────────────┬──────────────────────┬─────────┤
│ Sidebar │  Gallery   │      Editor           │Inspector│
│  200px  │  260px     │   (flexible, min 480) │  280px  │
│  fixed  │  collaps.  │                       │ collaps.│
├─────────┴────────────┴──────────────────────┴─────────┤
│              Footer/StatusBar 28px                    │
└───────────────────────────────────────────────────────┘
```

**Ключевые изменения:**
- Header: 68px → 48px (–20px вертикального пространства редактора)
- Sidebar: 256px → 200px (иконки + метки, без подзаголовков)
- Gallery: сворачиваемая по клику на сепаратор (Split View паттерн)
- Inspector: сворачиваемая при активном редакторе
- Footer: 36px → 28px

### 3.3 Альтернатива: компактный sidebar только из иконок

Для опытных пользователей — sidebar в режиме «icon-only» (48px):

```
┌────────────────────────────────────────────────────────┐
│ Header 48px                                            │
├────┬──────────────┬──────────────────────────┬─────────┤
│ 48 │   Gallery    │       Editor             │Inspector│
│ px │   260px      │  (flexible, min 560)     │  280px  │
│    │              │                          │         │
└────┴──────────────┴──────────────────────────┴─────────┘
```

Активный инструмент подсвечивается в sidebar; Inspector меняет содержимое при переключении.

---

## 4. Навигация

### 4.1 Текущий поток работы

```
Открыть приложение
  → добавить фото (кнопка в header ИЛИ в gallery footer)
    → фото появляется в gallery
      → кликнуть на фото → оно выбирается
        → выбрать инструмент слева
          → настроить в inspector справа
            → нажать «Применить» в inspector
              → нажать «Сохранить» в header
```

**Проблемы потока:**

| # | Проблема | Лишние клики |
|---|----------|-------------|
| N1 | Кнопка «Добавить фото» есть и в header, и в gallery footer — дублирование не критично, но добавляет когнитивную нагрузку | — |
| N2 | Нет быстрого пути: добавить → сразу применить crop → сохранить. Пользователь должен вручную выбрать инструмент | +2 клика |
| N3 | «Настройки экспорта» находятся в сайдбаре как «инструмент», но это другая парадигма (глобальная настройка, не операция над фото) | Смешение контекстов |
| N4 | После «Применить» нет явной обратной связи кроме toast — нет индикатора «что было сделано» без открытия «Истории» | Неуверенность пользователя |
| N5 | Нет поиска / фильтрации по файлам в галерее | Проблема при 50+ фото |
| N6 | Нет горячей клавиши для переключения между инструментами (C — crop, R — resize, W — watermark, E — export) | Медленная работа |
| N7 | Undo/Redo только в header — далеко от рабочей зоны | Лишний перенос взгляда |
| N8 | Нет возможности применить инструмент сразу ко всем фото не переключаясь к каждому | Не пакетный workflow |

### 4.2 Рекомендации по навигации

1. **Горячие клавиши для инструментов:** C, R, W, E (Crop, Resize, Watermark, Export)
2. **Command Palette** (Cmd+K): быстрый доступ к любому действию по тексту — подробнее в разделе 6
3. **Drag & Drop в gallery:** перетаскивание файлов прямо на галерею из Finder/Explorer (уже реализовано — сохранить ✅)
4. **Breadcrumb в editor-header:** «Инструменты / Обрезка» с кликабельным первым уровнем
5. **Batch-действия:** при выборе нескольких фото в галерее — «Применить ко всем выбранным» без переключения

---

## 5. UX-проблемы

### 5.1 🔴 Критичные — пользователь не понимает состояние

**UX-1: Пустой редактор без фото**

_Сценарий:_ Пользователь открывает приложение. Видит тёмно-зелёный экран с сеткой и placeholder-иконкой без подписи «что делать».

_Проблема:_ Нет Empty State с инструкцией. Пользователь не понимает, почему ничего не происходит.

_Решение:_
```
┌──────────────────────────────────────────────┐
│                                              │
│          [иконка добавления фото]            │
│        Нет загруженных фотографий            │
│   Перетащите файлы или нажмите «+»           │
│                                              │
│         [Добавить фото  ↑]                  │
└──────────────────────────────────────────────┘
```

**UX-2: Применение операции не даёт видимого результата**

_Сценарий:_ Пользователь жмёт «Применить» (обрезка). Toast показывается и исчезает. Thumbnail в галерее обновляется — но миниатюра маленькая и изменение незаметно.

_Решение:_ После применения:
- Editor должен показать результат на 0.3–0.5сек с лёгкой анимацией
- Thumbnail в галерее должен пульсировать (animation уже есть — `selectedPulse`, адаптировать)
- Опциональный бейдж «✓ Обрезка применена» на gallery-item на 2 сек

**UX-3: Отличие «Сохранить» vs «Применить» неочевидно**

_Сценарий:_ Пользователь жмёт «Применить» — думает, что сохранил. Закрывает приложение. Файл не перезаписан.

_Решение:_ Переименовать:
- «Применить» → «Применить к фото»
- «Экспортировать» → «Экспортировать файл»
- «Сохранить» в header → «Сохранить всё» с указанием количества изменённых файлов: «Сохранить (3 фото)»

### 5.2 🟡 Высокий приоритет — лишние действия

**UX-4: Список инструментов дублирует Inspector**

Сайдбар показывает «Обрезка / Изменение кадра» — Inspector тоже показывает «Обрезка / Кадрирование изображения». Это одна и та же информация в двух местах.

_Решение:_ В сайдбаре только иконка + label (без subtitle). В Inspector — полное описание.

**UX-5: «История» — модальное окно вместо inline-панели**

Для профессионального инструмента History должна быть боковой панелью (как в Photoshop/Figma), а не модальным окном, которое перекрывает рабочую зону и прерывает поток.

_Решение:_ История → правая панель (временно заменяет Inspector или расширяется под ним).

**UX-6: Нет индикации несохранённых изменений**

Если у фото есть применённые операции (photo.ops.length > 0), заголовок окна и/или gallery-item не показывают «грязное» состояние.

_Решение:_ 
- Точка `•` перед именем файла в gallery-item при наличии несохранённых ops
- `document.title = '● Фотоцентр ГермесГарант'` при изменениях (аналог VS Code)

**UX-7: Watermark offset всегда 0 (баг)**

`wm-text-offset-x` / `wm-text-offset-y` — ID не совпадают с HTML (зафиксировано в AUDIT_REPORT.md). UX-последствие: пользователь двигает слайдеры и не видит эффекта — думает, что приложение сломано.

### 5.3 🟢 Средний приоритет — улучшение опыта

**UX-8: Zoom-слайдер в footer оторван от редактора**

Footer с zoom находится внизу, а canvas — в центре. При работе взгляд постоянно перемещается.

_Решение:_ Floating Toolbar с zoom прямо над/под canvas (как в Figma):
```
[  -  ] ■■■■■■■■□□  [100%]  [  +  ]   ← floating bar над footer
```

**UX-9: Selection bar в галерее появляется резко**

`gallery-sel-bar` появляется без анимации (только CSS transition отсутствует).

_Решение:_
```css
.gallery-sel-bar {
  transition: height .2s ease, opacity .2s ease;
}
```

**UX-10: Кнопки «Сохранить» и «Сохранить как…» рядом**

Два похожих действия без чёткого разграничения. При стрессе пользователь может нажать не ту.

_Решение:_ «Сохранить» — primary кнопка. «Сохранить как…» переместить в dropdown (split-button паттерн):
```
[ ↓ Сохранить ▾ ]
         ↓
  [Сохранить  Ctrl+S    ]
  [Сохранить как… ⇧S  ]
```

---

## 6. Современные UI-фишки

### 6.1 Command Palette ⭐ Рекомендован

**Приоритет: Высокий**

Нажатие `Cmd/Ctrl+K` открывает глобальный поиск команд — паттерн из Linear, Raycast, VS Code:

```
┌─────────────────────────────────────────────┐
│ 🔍  Поиск действий…                         │
├─────────────────────────────────────────────┤
│  ✂️  Обрезка                          C     │
│  📐  Изменение размера                R     │
│  🔏  Ватермарк                        W     │
│  💾  Сохранить всё                  ⌘S     │
│  ➕  Добавить фото                         │
│  🕐  Открыть историю                        │
└─────────────────────────────────────────────┘
```

Реализация: `<dialog>` с `input[type=search]` + fuzzy-filter по массиву команд.

### 6.2 Toast-уведомления ✅ Уже есть, улучшить

**Текущая проблема:** Toast без `aria-live="polite"` — screen reader не объявляет.

**Улучшение:** Stack toast-ов, а не замена одного другим. Swipe-to-dismiss. Позиция: bottom-right (стандарт), а не center.

### 6.3 Skeleton Loading ⭐ Рекомендован

При добавлении фото thumbnail показывает skeleton вместо пустой рамки:

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.gallery-item--loading .gallery-thumb {
  background: linear-gradient(90deg, #f0f2f4 25%, #e4e8ec 50%, #f0f2f4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
```

### 6.4 Inline Editing

Имя файла в gallery-item — кликабельно для переименования прямо в списке (double-click → `contenteditable`).

### 6.5 Drag & Drop переупорядочивания

Перетаскивание фото в галерее для изменения порядка обработки — реализуется через HTML5 Drag and Drop API (items уже рендерятся JS-ом).

### 6.6 Progressive Disclosure в Inspector

Секции инспектора сворачиваемы. По умолчанию раскрыты самые важные (соотношение сторон, трансформации). Остальные — свёрнуты под `<details>`:

```html
<details class="ri-section" open>
  <summary class="ri-section-label">Соотношение сторон</summary>
  <!-- content -->
</details>
```

### 6.7 Onboarding Hints

При первом запуске (через `electron-store`) — подсветка ключевых зон с подсказкой:

```
1. «Нажмите здесь, чтобы добавить фото» → Add button
2. «Выберите инструмент слева» → Sidebar tools
3. «Настройте параметры справа» → Inspector
```

Реализация: overlay с `pointer-events: none` кроме target-элемента + последовательная смена шагов.

### 6.8 Split View для Resize ✅ Уже есть

Сохранить, улучшить divider: добавить `cursor: col-resize` при hover и highlight линии.

### 6.9 Keyboard Shortcuts Overlay

`Shift+?` → модальное окно со всеми горячими клавишами в tabличном формате.

### 6.10 Виртуализация галереи

При 100+ фото `gallery-list` рендерит все items в DOM. Нужна виртуализация:

```js
// Рендерить только видимые + 5 выше и ниже viewport
function renderVirtualGallery(scrollTop, containerHeight) {
  const itemHeight = 72; // высота gallery-item
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
  const end = Math.min(photos.length, start + Math.ceil(containerHeight / itemHeight) + 10);
  // Render photos[start..end], set padding-top = start * itemHeight
}
```

---

## 7. Типографика

### 7.1 Текущее состояние

| Переменная | Значение | Применение |
|------------|----------|------------|
| `--text-xs` | 11px | Метки, badges, timestamps |
| `--text-sm` | 12px | Подзаголовки, описания |
| `--text-base` | 13px | Основной текст UI |
| `--text-md` | 14px | Кнопки, заголовки секций |
| `--text-lg` | 16px | Заголовки панелей |
| `--text-xl` | 20px | Редко используется |

### 7.2 Проблемы

**T1: Линейная прогрессия без ритма**

Шаги 11→12→13→14→16→20px — нет типографического масштаба. В 2026 году стандартна модульная шкала:

```
Рекомендованный minor third (1.2×):
10px → 12px → 14px → 17px → 20px → 24px
```

**T2: --text-xs = 11px критически мал**

11px в 96dpi ≈ 8.25 пунктов — ниже WCAG-рекомендации 14px для мелкого текста. Особенно критично для `section-label`, `gallery-nav-badge`, `about-meta-key`.

**T3: Line-height не везде задан**

В компонентах часто нет `line-height`, что даёт browser-default 1.2 — текст задыхается.

**T4: Отсутствие letter-spacing на заглавных label**

`sidebar-section-label`, `ri-label` используют uppercase без letter-spacing — это читается слитно.

### 7.3 Рекомендации

```css
:root {
  /* Типографическая шкала (minor third 1.2) */
  --text-2xs: 10px;   /* ← добавить */
  --text-xs:  12px;   /* было 11px */
  --text-sm:  13px;   /* было 12px */
  --text-base: 14px;  /* было 13px */
  --text-md:  16px;   /* было 14px */
  --text-lg:  18px;   /* было 16px */
  --text-xl:  22px;   /* было 20px */

  /* Line-heights */
  --lh-tight:  1.3;
  --lh-normal: 1.5;
  --lh-loose:  1.7;
}

/* Uppercase labels всегда с tracking */
.sidebar-section-label,
.ri-label,
.ep-card-title {
  letter-spacing: 0.06em;
}
```

**Шрифты:** Inter остаётся оптимальным выбором. Возможное усиление:
- Inter Display (SemiBold 600) для заголовков панелей
- Inter Mono для числовых значений (размеры px, %, DPI) — улучшает считываемость

---

## 8. Цветовая система

### 8.1 Текущая палитра

```
Brand:     #16624c (primary)   #0f523f (hover)   #e8f2ee (light)
Surfaces:  #f6f8f9 (bg)        #ffffff (panel)    #f0f2f4 (panel2)
Borders:   #e7ebef             #d4d9de
Text:      #20242c             #6f7782 (muted)    #a8aeb6 (faint)
Semantic:  #d94040 (danger)    #e0832a (warning)  #16624c (success = primary!)
```

### 8.2 Критические проблемы

**C1: --color-success = --color-primary**

Успех и brand — один цвет (#16624c). Пользователь не различает «брендовый элемент» от «успешное действие».

```css
/* Решение: */
--color-success:     #1a7a52;  /* чуть светлее primary */
--color-success-bg:  #edf7f2;
--color-success-text: #155e3f;
```

**C2: Нет Info-цвета**

Нет `--color-info` — для нейтральных уведомлений используется danger или success.

```css
--color-info:     #2563eb;
--color-info-bg:  #eff6ff;
```

**C3: Semantic цвета без фоновых вариантов**

Только базовый цвет без `*-bg` и `*-text` вариантов. Это затрудняет создание inline alerts, badges, status-индикаторов.

### 8.3 Рекомендованная расширенная палитра

```css
:root {
  /* === BRAND === */
  --color-primary:        #16624c;
  --color-primary-hover:  #0f523f;
  --color-primary-active: #0b3d2e;
  --color-primary-light:  #e8f2ee;
  --color-primary-muted:  rgba(22, 98, 76, 0.12);
  --color-primary-rgb:    22, 98, 76;

  /* === SURFACES (Light) === */
  --color-bg:          #f5f7f9;   /* чуть теплее */
  --color-bg-elevated: #ffffff;
  --color-panel:       #ffffff;
  --color-panel-2:     #f0f2f4;
  --color-overlay:     rgba(10, 16, 24, 0.5);

  /* === BORDERS === */
  --color-border:      #e3e8ed;
  --color-border-2:    #ccd2d9;
  --color-border-focus: var(--color-primary);

  /* === TEXT === */
  --color-text:        #1a2028;   /* чуть насыщеннее */
  --color-text-sec:    #4a5568;   /* вторичный (был --muted) */
  --color-text-ter:    #718096;   /* третичный (был --faint, осветлён) */
  --color-text-inv:    #ffffff;   /* на тёмных фонах */

  /* === SEMANTIC === */
  --color-success:      #1a7a52;
  --color-success-bg:   #edf7f2;
  --color-success-text: #155e3f;

  --color-warning:      #c9760a;
  --color-warning-bg:   #fff8ed;
  --color-warning-text: #92530a;

  --color-danger:       #c53030;
  --color-danger-bg:    #fff5f5;
  --color-danger-text:  #9b2c2c;

  --color-info:         #2563eb;
  --color-info-bg:      #eff6ff;
  --color-info-text:    #1d4ed8;

  /* === ELEVATION (shadows with brand tint) === */
  --shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm:  0 1px 4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,.03);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.10), 0 0 0 1px rgba(0,0,0,.04);
  --shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0,0,0,.04);
  --shadow-xl:  0 20px 48px rgba(0, 0, 0, 0.20);
}
```

### 8.4 Тёмная тема (Dark Mode)

**Приоритет: Высокий** — стандарт для профессиональных инструментов 2026 года.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:        #0f1117;
    --color-panel:     #161b22;
    --color-panel-2:   #1c2230;
    --color-border:    #2d3748;
    --color-border-2:  #4a5568;
    --color-text:      #e2e8f0;
    --color-text-sec:  #a0aec0;
    --color-text-ter:  #718096;
    --color-primary:   #2ecc8e;   /* светлее для dark bg */
    --color-primary-hover: #27b37d;
    --color-primary-light: rgba(46, 204, 142, 0.12);
    --shadow-sm: 0 1px 4px rgba(0,0,0,.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,.4);
  }
}
```

Переключение также через `data-theme="dark"` на `<html>` для ручного контроля.

---

## 9. Компоненты

### 9.1 Кнопки

**Текущая система:** `btn-primary` / `btn-outline` / `btn-ghost` / `btn-icon` / `btn-delete-checked` / `gallery-sel-clear`

**Проблемы:**
- `btn-delete-checked` — отдельный класс вместо `btn btn-danger`
- `gallery-sel-clear` — ещё один одноразовый класс
- Нет `btn-sm` и `btn-lg` вариантов
- Нет loading state (spinner) для асинхронных операций

**Рекомендация — единая Button System:**

```css
/* Базовый класс */
.btn { /* общие свойства: height, padding, border-radius, font, transition */ }

/* Размеры */
.btn-sm  { height: 28px; padding: 0 10px; font-size: var(--text-sm);  }
.btn-md  { height: 34px; padding: 0 14px; font-size: var(--text-base); } /* default */
.btn-lg  { height: 40px; padding: 0 18px; font-size: var(--text-md);  }

/* Варианты */
.btn-primary { background: var(--color-primary); color: var(--color-text-inv); }
.btn-secondary { background: var(--color-panel-2); color: var(--color-text); }
.btn-outline { border: 1.5px solid var(--color-border); }
.btn-ghost   { background: transparent; }
.btn-danger  { background: var(--color-danger); color: #fff; }

/* States */
.btn[aria-busy="true"] { /* spinner overlay */ }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
```

### 9.2 Поля ввода

**Текущие:** `ep-suffix-input`, `ri-dim-input`, `wm-*-input` — разные классы, разный padding, разная высота.

**Проблемы:**
- Нет focus-state ring (только border-color меняется — слабо)
- Нет error-state
- Нет inline validation

**Рекомендация:**

```css
.input {
  height: 34px;
  padding: 0 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-bg);
  transition: border-color .15s, box-shadow .15s;
}
.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
  outline: none;
}
.input--error {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px rgba(197, 48, 48, 0.12);
}
```

### 9.3 Переключатели (Toggle)

`export-toggle` — реализован хорошо. Нужно:
- Добавить `role="switch"` и `aria-checked`
- Унифицировать с `ri-switch-input` (два разных класса для одного компонента)

```html
<!-- Единый компонент -->
<button class="toggle" role="switch" aria-checked="false" data-key="progressive">
  <span class="toggle-thumb"></span>
</button>
```

### 9.4 Слайдеры (Range)

**Текущие:** `export-quality-slider`, `icp-align-slider`, `wm-*-slider` — разные стили.

Проблема: внешний вид нативного range input различается в Chrome и Firefox. CSS настроен для WebKit, но Firefox видит неверный border (bug 5.1 в AUDIT_REPORT.md).

**Рекомендация:** Единый класс `.slider` с полным кроссбраузерным стилем:

```css
.slider { /* общие свойства */ }
.slider::-webkit-slider-thumb { /* webkit */ }
.slider::-moz-range-thumb     { /* firefox */ }
```

### 9.5 Карточки форматов

`export-format-card` и `export-dpi-card` — дублируют паттерн. Объединить в `.choice-card`:

```css
.choice-card { /* border + padding + cursor + transition */ }
.choice-card.active { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-muted); }
```

### 9.6 Модальные окна

**About-modal** и **History-modal** — идентичная структура, но разные классы (`.about-overlay` vs `.history-overlay`). Объединить в универсальный `.modal-overlay` + `.modal-dialog`.

Добавить:
```html
<dialog class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
```
Использовать нативный `<dialog>` для автоматической accessibility-поддержки.

### 9.7 Tool Cards в Sidebar

Текущие tool-card слишком высокие (icon + title + subtitle ≈ 68px каждый × 4 = 272px из 600px sidebar).

**Компактный вариант:**

```
┌────────────────────────────┐
│  [icon]  Обрезка           │  ← 40px height
└────────────────────────────┘
```

Subtitle → tooltip при hover (уже есть #app-tooltip механизм).

### 9.8 Gallery Items

Текущий gallery-item: thumbnail + имя файла + checkbox + статус.

**Проблемы:**
- Нет индикатора «применены операции» (dirty state)
- Нет индикатора ошибки загрузки
- Нет skeleton при загрузке

**Улучшенная структура:**

```
┌─[✓]─[thumbnail 56px]──────────┐
│  filename.jpg          [●] ops │  ← ● = dirty indicator
│  1200×800 · 2.4MB              │
└────────────────────────────────┘
```

### 9.9 Inspector Header

Текущий inspector показывает заголовок инструмента и подзаголовок. Добавить:
- Иконку инструмента рядом с заголовком (уже есть `ri-inspector-icon`)
- Кнопку «?» для открытия help об инструменте

### 9.10 Empty States

Нет качественных Empty State для:
- Галерея без фото → добавить иллюстрацию + CTA
- История без операций → «Вы ещё не применяли операций»
- Результаты фильтрации — 0 фото → «Ничего не найдено»

---

## 10. Accessibility

### 10.1 Контраст

| Проблема | Текущее | Требуется | Решение |
|----------|---------|-----------|---------|
| `--color-faint` на белом | 2.5:1 | 4.5:1 | Сменить на #8a9099 |
| 11px текст на bg | критично | 4.5:1 | Увеличить до 12px min |
| Placeholder text | ~2.8:1 | 3:1 | Сменить на #8a9099 |

### 10.2 Клавиатурная навигация

**Текущие проблемы:**
- Tool cards не имеют `tabindex="0"` и `role="button"` — недоступны с клавиатуры
- Gallery items: checkbox доступен, но сам item-клик (выбор фото) — нет `tabindex`
- Кастомные dropdown-кнопки (font-family в watermark) без `aria-expanded`
- Crop handles (`.crop-handle`) — полностью недоступны с клавиатуры
- Inspector секции без `role="group"` + `aria-labelledby`

### 10.3 ARIA

Добавить:
```html
<!-- Tool cards -->
<div class="tool-card" role="button" tabindex="0" aria-pressed="false">

<!-- Toggle -->
<button class="toggle" role="switch" aria-checked="false">

<!-- Dropdown -->
<button aria-haspopup="listbox" aria-expanded="false">

<!-- Toast -->
<div id="toast-container" aria-live="polite" aria-atomic="true">

<!-- Модальные -->
<dialog role="dialog" aria-modal="true" aria-labelledby="dialog-title">

<!-- Gallery items -->
<div class="gallery-item" role="option" tabindex="0" aria-selected="false">
```

### 10.4 Масштабирование и HiDPI

- Все размеры в px → частично проблема при системном масштабировании 125%/150%
- SVG-иконки `width/height` заданы в px — ок, они масштабируются
- `min-width: 900px; min-height: 700px` на `.app-root` — фиксированный минимум, может быть проблемой на маленьких экранах (Surface Go, 1024×600)

**Рекомендация:** min-height: 640px, добавить `@media (max-height: 700px)` с уменьшением header до 40px.

### 10.5 Tab Focus

Добавить видимый focus ring для всех интерактивных элементов:
```css
/* Уже есть :focus-visible — хорошо ✅ */
/* Добавить для кастомных элементов: */
.tool-card:focus-visible,
.gallery-item:focus-visible,
.crop-handle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## 11. Производительность интерфейса

### 11.1 Текущие проблемы

| # | Проблема | Влияние |
|---|----------|---------|
| P1 | `rebuildGallery()` полностью перерисовывает все items при каждом изменении | При 50+ фото — janky scroll |
| P2 | `renderTileGrid()` удаляет/создаёт 12 DOM-узлов при каждом RAF | Постоянный layout thrashing |
| P3 | Нет `will-change` на анимированных элементах (crop-frame, wm-overlay) | Layout перерисовки |
| P4 | Тени (shadow-md) на 4 панелях одновременно | GPU layer pressure |
| P5 | `document.querySelector('.gallery-list')` в горячих путях | Повторные DOM-запросы |
| P6 | 2090 строк HTML загружены разом — все 4 inspector-view в DOM | Лишние DOM-узлы (скрытые) |

### 11.2 Рекомендации

**Анимации:**
```css
/* Добавить только для интерактивных слоёв */
.wm-overlay,
.crop-frame,
.app-info-card {
  will-change: transform;
}

/* После завершения анимации — сбросить */
.gallery-item {
  will-change: auto; /* не держать постоянно */
}
```

**Уменьшение визуального шума:**
- Убрать shadow с `.app-header` (уже border-bottom достаточно)
- Упростить тень панелей: `shadow-sm` → `0 1px 0 var(--color-border)` (плоский разделитель вместо тени)

**Оптимизация gallery:**
- `DOM recycling`: хранить пул gallery-item элементов, переиспользовать
- Или полноценная виртуализация (см. раздел 6.10)

**CSS containment:**
```css
.app-gallery,
.app-sidebar,
.app-inspector {
  contain: layout style;
}
.gallery-item {
  contain: layout;
}
```

---

## 12. Итоговый план рефакторинга

### 12.1 Что оставить без изменений

- Цветовой бренд (#16624c) — узнаваем и хорош ✅
- Шрифт Inter — современен ✅
- Структура CSS-токенов (`variables.css`) — правильный подход ✅
- 4-панельная компоновка — адекватна для десктопного редактора ✅
- Паттерн crop-overlay с handles — функционален ✅
- Split-view в resize — современное решение ✅
- Toast-система (концептуально) ✅
- Структура JS-модулей ✅

### 12.2 Приоритизированный план

---

#### 🔴 КРИТИЧНО (выполнить первым)

| # | Задача | Эффект |
|---|--------|--------|
| CR-1 | Исправить `wm-text-offset-x/y` → `wm-offset-x/y` в watermark.js | Баг: смещение ватермарка не работает |
| CR-2 | Empty State для редактора — добавить CTA и инструкцию | Пользователь понимает, что делать |
| CR-3 | Индикация dirty state (несохранённые изменения) | Пользователь не теряет данные |
| CR-4 | `aria-live="polite"` на toast-контейнере | Базовая accessibility |
| CR-5 | Исправить контраст `--color-faint` → #8a9099 | WCAG AA соответствие |

---

#### 🟠 ВЫСОКИЙ ПРИОРИТЕТ

| # | Задача | Эффект |
|---|--------|--------|
| HP-1 | Header: 68px → 48px, убрать дублирующие действия | +20px рабочей зоны |
| HP-2 | Tool cards: убрать subtitle, оставить только icon + title (40px height) | Компактнее sidebar |
| HP-3 | Split-button для «Сохранить / Сохранить как…» | Чище header, меньше путаницы |
| HP-4 | Тёмная тема через `prefers-color-scheme` | Стандарт 2026 года |
| HP-5 | Горячие клавиши C/R/W/E для инструментов | Быстрая работа |
| HP-6 | `role/aria` для tool-cards, gallery-items, toggles | Keyboard accessibility |
| HP-7 | Skeleton loading в gallery при добавлении фото | UX при медленных файлах |
| HP-8 | Унифицировать toggle: `export-toggle` + `ri-switch` → один компонент | Код и UX консистентны |
| HP-9 | Единый класс `.modal-overlay` + `.modal-dialog` (убрать дублирование) | ~100 строк CSS экономии |
| HP-10 | Убрать инфо-карточку с эмодзи из sidebar (или сделать иконки SVG) | Профессиональный вид |

---

#### 🟡 СРЕДНИЙ ПРИОРИТЕТ

| # | Задача | Эффект |
|---|--------|--------|
| MP-1 | Command Palette (Cmd+K) | Быстрый доступ к командам |
| MP-2 | Расширить цветовую систему (success/warning/danger/info с bg-вариантами) | Семантика цветов |
| MP-3 | Анимация для gallery-sel-bar (slideDown) | Плавный UX |
| MP-4 | Floating zoom toolbar над footer | Zoom ближе к canvas |
| MP-5 | Типографика: поднять --text-xs до 12px, --text-base до 14px | Читаемость |
| MP-6 | `contain: layout` на gallery-item, sidebar, inspector | Производительность |
| MP-7 | Dirty indicator (•) на gallery-item | Видно, что изменено |
| MP-8 | History как inline-панель, не модал | Меньше прерываний потока |
| MP-9 | Progressive Disclosure в inspector (сворачиваемые секции) | Меньше перегруженности |
| MP-10 | Унифицировать `.slider` для всех range inputs | CSS консистентность |

---

#### 🟢 НИЗКИЙ ПРИОРИТЕТ

| # | Задача | Эффект |
|---|--------|--------|
| LP-1 | Onboarding hints при первом запуске | Снижение порога входа |
| LP-2 | Виртуализация gallery (100+ фото) | Производительность |
| LP-3 | Keyboard Shortcuts overlay (Shift+?) | Discoverability |
| LP-4 | Inter Mono для числовых значений | Читаемость цифр |
| LP-5 | Drag-to-reorder в gallery | Удобство организации |
| LP-6 | CSS containment для панелей | Тонкая оптимизация |
| LP-7 | Убрать все мёртвые CSS-классы (~324 строки) | Размер бандла |
| LP-8 | `will-change` на анимированных элементах | GPU-оптимизация |
| LP-9 | Breadcrumbs в editor-header | Ориентация в UI |
| LP-10 | Batch-применение инструмента ко всем выбранным фото | Пакетный workflow |

---

### 12.3 Краткая сводка по принципам 2026 года

| Принцип | Статус сейчас | После рефакторинга |
|---------|--------------|-------------------|
| **Information Density** | Средняя (много пустого в sidebar) | Высокая (компактный sidebar) |
| **Keyboard-first** | ❌ Нет | ✅ Горячие клавиши + Cmd+K |
| **Dark Mode** | ❌ Нет | ✅ `prefers-color-scheme` |
| **Progressive Disclosure** | ❌ Нет | ✅ Сворачиваемые секции |
| **Skeleton/Loading states** | ❌ Нет | ✅ Shimmer в gallery |
| **Semantic Color System** | ⚠️ Частично | ✅ Полная система |
| **WCAG AA Contrast** | ⚠️ Нарушения | ✅ Все компоненты |
| **Design Tokens** | ✅ Есть (базовые) | ✅ Расширенные |
| **Component Unification** | ❌ Разные классы | ✅ Единая библиотека |
| **Empty States** | ❌ Нет | ✅ Все кейсы покрыты |

---

> **Итог:** Приложение имеет сильную техническую базу и хороший визуальный вектор, но требует последовательного UI/UX рефакторинга. Критичные и высокоприоритетные задачи (CR + HP) займут ~3–5 дней и дадут наибольший ощутимый результат. Средний и низкий приоритеты — итеративно в следующих спринтах.
