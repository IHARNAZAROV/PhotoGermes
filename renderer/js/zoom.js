/* ========================================================
   zoom.js — Масштаб редактора
   Управление: слайдер · Ctrl+колёсико · Ctrl+= / Ctrl+- / Ctrl+0
   ======================================================== */
'use strict';

const ZOOM_MIN     = 10;
const ZOOM_MAX     = 200;
const ZOOM_DEFAULT = 100;   // 100% = изображение полностью занимает область (object-fit:contain)
const ZOOM_STEP    = 10;

let _zoom = ZOOM_DEFAULT;

// ── Активный целевой элемент (меняется при смене инструмента) ──
let _activeWrap = null;   // элемент, к которому применяется scale()
let _activeArea = null;   // элемент, на котором слушается Ctrl+wheel

// ── DOM-узлы ──────────────────────────────────────────────
function getSlider()     { return document.getElementById('zoom-slider'); }
function getLabel()      { return document.getElementById('zoom-label'); }
function getWrap()       { return _activeWrap; }

// ── Применить масштаб ─────────────────────────────────────
function setZoom(val) {
    _zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(val)));

    // Трансформация активного контейнера изображения
    const w = getWrap();
    if (w) {
        w.style.transform       = `scale(${_zoom / 100})`;
        w.style.transformOrigin = 'center center';
    }

    // Компенсация масштаба для ручек кадра обрезки
    document.documentElement.style.setProperty(
        '--crop-handle-scale',
        (100 / _zoom).toFixed(4)
    );

    // Синхронизация слайдера в футере
    const s = getSlider();
    if (s && Number(s.value) !== _zoom) s.value = _zoom;

    // Синхронизация подписи в футере
    const l = getLabel();
    if (l) l.textContent = _zoom + '%';

    // Синхронизация кнопки-метки в панели Resize
    const resizeBtn = document.querySelector('#resize-zoom-toggle span');
    if (resizeBtn) resizeBtn.textContent = _zoom + '%';
}

// ── Переключить целевой элемент (вызывается из app.js при смене инструмента) ─
//   wrap  — элемент, к которому применяется transform: scale()
//   area  — элемент, на котором слушается Ctrl+wheel (обычно его родитель-контейнер)
function setTarget(wrap, area) {
    // Убрать трансформацию с предыдущего wrap
    if (_activeWrap && _activeWrap !== wrap) {
        _activeWrap.style.transform = '';
    }

    // Перенести wheel-листенер на новый area
    if (_activeArea && _activeArea !== area) {
        _activeArea.removeEventListener('wheel', _onWheel, { passive: false });
    }

    _activeWrap = wrap || null;
    _activeArea = area || null;

    if (_activeArea) {
        _activeArea.addEventListener('wheel', _onWheel, { passive: false });
    }

    // Применить текущий зум к новому элементу
    setZoom(_zoom);
}

// ── Обработчик колёсика (хранится как именованная функция для removeEventListener) ─
function _onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(_zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
}

// ── Публичное API (доступно через window.zoom) ─────────────
function zoomIn()    { setZoom(_zoom + ZOOM_STEP); }
function zoomOut()   { setZoom(_zoom - ZOOM_STEP); }
function zoomReset() { setZoom(ZOOM_DEFAULT); }
function getZoom()   { return _zoom; }

// ── Инициализация ─────────────────────────────────────────
function initZoom() {
    // Слайдер в футере
    const s = getSlider();
    if (s) {
        s.value = ZOOM_DEFAULT;
        s.addEventListener('input', () => setZoom(Number(s.value)));
    }

    // Клавиатурные сокращения: Ctrl+= / Ctrl++ / Ctrl+- / Ctrl+0
    document.addEventListener('keydown', e => {
        if (!e.ctrlKey && !e.metaKey) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            zoomIn();
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            zoomOut();
        } else if (e.key === '0') {
            e.preventDefault();
            zoomReset();
        }
    });

    // Двойной клик по любому активному wrap — сброс на 100%
    document.addEventListener('dblclick', e => {
        if (!_activeWrap) return;
        if (!_activeWrap.contains(e.target)) return;
        if (e.target.closest('.crop-frame')) return;
        zoomReset();
    });

    // Начальное состояние: целевой элемент — crop view (инструмент по умолчанию)
    // app.js вызовет setTarget() при первом переключении инструмента;
    // до этого применяем зум к первому доступному wrap.
    const defaultWrap = document.querySelector('#crop-editor-view .editor-canvas-wrap');
    const defaultArea = document.querySelector('#crop-editor-view .editor-canvas-area');
    setTarget(defaultWrap, defaultArea);
}

document.addEventListener('DOMContentLoaded', initZoom);

// ── Экспорт ───────────────────────────────────────────────
window.zoom = {
    in:        zoomIn,
    out:       zoomOut,
    reset:     zoomReset,
    get:       getZoom,
    set:       setZoom,
    setTarget, // вызывается из app.js при смене инструмента
};
