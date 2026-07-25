/* ========================================================
   crop.js — Interactive crop frame: drag · resize · aspect ratio
   ======================================================== */
'use strict';

// ── State ─────────────────────────────────────────────────
// All coordinates in % of the container element
const crop = { x: 8, y: 10, w: 84, h: 80 };
let cropAspect = null;   // null = free,  number = real-pixel W/H ratio
let dragCtx    = null;   // active drag context

// ── Cursor per handle ─────────────────────────────────────
const HANDLE_CURSORS = {
    tl: 'nw-resize', tc: 'n-resize',  tr: 'ne-resize',
    lc: 'w-resize',                    rc: 'e-resize',
    bl: 'sw-resize', bc: 's-resize',  br: 'se-resize',
};

// ── Helpers ───────────────────────────────────────────────
function getContainer() { return document.getElementById('editor-placeholder'); }
function getCropFrame()  { return document.querySelector('.crop-frame'); }

function getHandleKey(el) {
    return [...el.classList].find(c => c !== 'crop-handle');
}

// Convert real-pixel aspect ratio to %-coordinate aspect ratio
// (because x% and y% represent different real lengths when container != square)
function getPctAspect() {
    if (cropAspect === null) return null;
    const c = getContainer();
    if (!c) return null;
    return cropAspect * (c.offsetHeight / c.offsetWidth);
}

// ── Apply state → DOM ─────────────────────────────────────
function applyCrop() {
    const frame = getCropFrame();
    if (!frame) return;
    frame.style.cssText =
        `top:${crop.y.toFixed(3)}%;` +
        `left:${crop.x.toFixed(3)}%;` +
        `width:${crop.w.toFixed(3)}%;` +
        `height:${crop.h.toFixed(3)}%;` +
        `right:auto;bottom:auto;` +
        `pointer-events:auto;`;
}

// ── Clamp to valid bounds ─────────────────────────────────
const MIN_PCT = 5; // minimum frame size in % of container

function clampCrop(nx, ny, nw, nh) {
    nw = Math.max(MIN_PCT, nw);
    nh = Math.max(MIN_PCT, nh);
    nx = Math.max(0, Math.min(100 - nw, nx));
    ny = Math.max(0, Math.min(100 - nh, ny));
    return { x: nx, y: ny, w: nw, h: nh };
}

// ── Compute resize delta by handle ────────────────────────
function computeResize(handle, dxPct, dyPct, start) {
    let { x, y, w, h } = start;

    // Apply raw delta per handle edges
    if (handle.includes('l'))  { x = start.x + dxPct; w = start.w - dxPct; }
    if (handle.includes('r'))  { w = start.w + dxPct; }
    if (handle.includes('t'))  { y = start.y + dyPct; h = start.h - dyPct; }
    if (handle.includes('b'))  { h = start.h + dyPct; }
    // Pure-edge handles: freeze the perpendicular axis
    if (handle === 'lc' || handle === 'rc') { y = start.y; h = start.h; }
    if (handle === 'tc' || handle === 'bc') { x = start.x; w = start.w; }

    // Aspect-ratio constraint for corner handles
    const pctAspect = getPctAspect();
    if (pctAspect !== null) {
        const isCorner = !handle.includes('c');
        if (isCorner) {
            const dw = Math.abs(w - start.w);
            const dh = Math.abs(h - start.h);
            if (dw >= dh * pctAspect) {
                // Width is dominant axis
                const nw2 = Math.max(MIN_PCT, w);
                const nh2 = nw2 / pctAspect;
                w = nw2;
                h = nh2;
                if (handle.includes('t')) y = start.y + start.h - nh2;
                if (handle.includes('l')) x = start.x + start.w - nw2;
            } else {
                // Height is dominant axis
                const nh2 = Math.max(MIN_PCT, h);
                const nw2 = nh2 * pctAspect;
                h = nh2;
                w = nw2;
                if (handle.includes('t')) y = start.y + start.h - nh2;
                if (handle.includes('l')) x = start.x + start.w - nw2;
            }
        }
    }

    return clampCrop(x, y, w, h);
}

// ── Mouse / touch handlers ────────────────────────────────
function onFrameMouseDown(e) {
    if (e.target.closest('.crop-handle')) return;
    e.preventDefault();
    dragCtx = { type: 'move', startX: e.clientX, startY: e.clientY, start: { ...crop } };
    document.body.style.cursor = 'move';
}

function onHandleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const handle = getHandleKey(e.currentTarget);
    dragCtx = {
        type: 'resize', handle,
        startX: e.clientX, startY: e.clientY,
        start: { ...crop }
    };
    document.body.style.cursor = HANDLE_CURSORS[handle] || 'crosshair';
}

function onMouseMove(e) {
    if (!dragCtx) return;
    const c = getContainer();
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dxPct = (e.clientX - dragCtx.startX) / rect.width  * 100;
    const dyPct = (e.clientY - dragCtx.startY) / rect.height * 100;

    if (dragCtx.type === 'move') {
        const s = clampCrop(
            dragCtx.start.x + dxPct,
            dragCtx.start.y + dyPct,
            crop.w, crop.h
        );
        crop.x = s.x;
        crop.y = s.y;
    } else {
        Object.assign(crop, computeResize(dragCtx.handle, dxPct, dyPct, dragCtx.start));
    }
    applyCrop();
}

function onMouseUp() {
    if (!dragCtx) return;
    dragCtx = null;
    document.body.style.cursor = '';
}

// ── Apply aspect ratio preset ─────────────────────────────
const RATIO_MAP = {
    'Свободно': null,
    '1:1':   1,
    '4:3':   4 / 3,
    '16:9':  16 / 9,
    '3:2':   3 / 2,
    '9:16':  9 / 16,
    'Польз.': null,
};

function applyAspectPreset(ratio) {
    cropAspect = ratio;
    if (ratio === null) {
        applyCrop(); // no shape change, just unlock
        return;
    }

    const pctAspect = getPctAspect();
    if (!pctAspect) return;

    // Keep centre, reshape to new ratio
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;

    let nw = crop.w;
    let nh = nw / pctAspect;

    // Fit within 96% bounds
    if (nh > 96) { nh = 96; nw = nh * pctAspect; }
    if (nw > 96) { nw = 96; nh = nw / pctAspect; }

    crop.w = nw;
    crop.h = nh;
    crop.x = Math.max(0, Math.min(100 - nw, cx - nw / 2));
    crop.y = Math.max(0, Math.min(100 - nh, cy - nh / 2));

    applyCrop();
}

// ── Reset to default ──────────────────────────────────────
function resetCrop() {
    cropAspect = null;
    crop.x = 8; crop.y = 10; crop.w = 84; crop.h = 80;
    applyCrop();
    // Reflect "Свободно" as active
    document.querySelectorAll('.preset-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
}

// ── Init ──────────────────────────────────────────────────
function initCrop() {
    const frame = getCropFrame();
    if (!frame) return;

    // Frame drag (move the whole crop box)
    frame.addEventListener('mousedown', onFrameMouseDown);

    // Handle resize
    frame.querySelectorAll('.crop-handle').forEach(h => {
        const key = getHandleKey(h);
        h.style.cursor = HANDLE_CURSORS[key] || 'crosshair';
        h.addEventListener('mousedown', onHandleMouseDown);
    });

    // Global mouse tracking
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);

    // Preset buttons → aspect ratio
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const label = btn.querySelector('.preset-label')?.textContent?.trim();
            if (label && label in RATIO_MAP) {
                applyAspectPreset(RATIO_MAP[label]);
            }
        });
    });

    // "Сбросить" action button
    document.querySelectorAll('.preset-action').forEach(btn => {
        const label = btn.querySelector('.preset-action-label')?.textContent?.trim();
        if (label === 'Сбросить') btn.addEventListener('click', resetCrop);
    });

    // Initial render
    applyCrop();
}

document.addEventListener('DOMContentLoaded', initCrop);
