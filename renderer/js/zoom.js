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

// ── DOM-узлы ──────────────────────────────────────────────
function getSlider()     { return document.getElementById('zoom-slider'); }
function getLabel()      { return document.getElementById('zoom-label'); }
function getWrap()       { return document.querySelector('.editor-canvas-wrap'); }
function getCanvasArea() { return document.querySelector('.editor-canvas-area'); }

// ── Применить масштаб ─────────────────────────────────────
function setZoom(val) {
    _zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(val)));

    // Трансформация контейнера изображения
    const w = getWrap();
    if (w) {
        w.style.transform       = `scale(${_zoom / 100})`;
        w.style.transformOrigin = 'center center';
    }

    // Компенсация масштаба для ручек кадра обрезки:
    // CSS-свойство scale не конфликтует с transform (translateX/Y) на центральных ручках
    document.documentElement.style.setProperty(
        '--crop-handle-scale',
        (100 / _zoom).toFixed(4)
    );

    // Синхронизация слайдера
    const s = getSlider();
    if (s && Number(s.value) !== _zoom) s.value = _zoom;

    // Синхронизация подписи
    const l = getLabel();
    if (l) l.textContent = _zoom + '%';
}

// ── Публичное API (доступно через window.zoom) ─────────────
function zoomIn()    { setZoom(_zoom + ZOOM_STEP); }
function zoomOut()   { setZoom(_zoom - ZOOM_STEP); }
function zoomReset() { setZoom(ZOOM_DEFAULT); }
function getZoom()   { return _zoom; }

// ── Инициализация ─────────────────────────────────────────
function initZoom() {
    // Слайдер
    const s = getSlider();
    if (s) {
        // Игнорируем значение HTML-атрибута — всегда стартуем с 100%
        s.value = ZOOM_DEFAULT;
        s.addEventListener('input', () => setZoom(Number(s.value)));
    }

    // Ctrl+Колёсико над областью редактора — zoom без прокрутки
    const area = getCanvasArea();
    if (area) {
        area.addEventListener('wheel', e => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setZoom(_zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
        }, { passive: false });
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

    // Двойной клик по области редактора — сброс на 100%
    const canvasWrap = getWrap();
    if (canvasWrap) {
        canvasWrap.addEventListener('dblclick', e => {
            // Не срабатывать на элементах кадра обрезки
            if (e.target.closest('.crop-frame')) return;
            zoomReset();
        });
    }

    // Применить начальное значение
    setZoom(_zoom);
}

document.addEventListener('DOMContentLoaded', initZoom);

// ── Экспорт ───────────────────────────────────────────────
window.zoom = {
    in:    zoomIn,
    out:   zoomOut,
    reset: zoomReset,
    get:   getZoom,
    set:   setZoom,
};
