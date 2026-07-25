/* ========================================================
   crop.js — Interactive crop frame: drag · resize · aspect ratio
              pixel inputs · custom select · frame lock
   ======================================================== */
'use strict';

// ── State ─────────────────────────────────────────────────
// All coordinates in % of the container element
const crop = { x: 8, y: 10, w: 84, h: 80 };
let cropAspect  = null;   // null = free, number = real-pixel W/H ratio
let frameLocked = false;  // frame lock button state
let dragCtx     = null;   // active drag context

// ── Cursor per handle ─────────────────────────────────────
const HANDLE_CURSORS = {
    tl: 'nw-resize', tc: 'n-resize',  tr: 'ne-resize',
    lc: 'w-resize',                    rc: 'e-resize',
    bl: 'sw-resize', bc: 's-resize',  br: 'se-resize',
};

// ── DOM helpers ───────────────────────────────────────────
function getContainer() { return document.getElementById('editor-placeholder'); }
function getCropFrame()  { return document.querySelector('.crop-frame'); }
function getHandleKey(el) {
    return [...el.classList].find(c => c !== 'crop-handle');
}

// Convert real-pixel aspect ratio → %-coordinate aspect ratio
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
    updatePixelInputs();
}

// ── Pixel inputs sync ──────────────────────────────────────
function updatePixelInputs() {
    const c = getContainer();
    if (!c) return;
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    const wInput = document.getElementById('frame-width');
    const hInput = document.getElementById('frame-height');
    if (wInput && document.activeElement !== wInput)
        wInput.value = Math.round(crop.w / 100 * cw);
    if (hInput && document.activeElement !== hInput)
        hInput.value = Math.round(crop.h / 100 * ch);
}

function initPixelInputs() {
    const wInput = document.getElementById('frame-width');
    const hInput = document.getElementById('frame-height');

    // ── Frame lock button ────────────────────────────────
    const lockBtn = document.querySelector('.frame-lock-btn');
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            frameLocked = !frameLocked;
            lockBtn.classList.toggle('locked', frameLocked);
        });
    }

    // ── Width input ──────────────────────────────────────
    function commitWidth() {
        const c = getContainer();
        if (!c) return;
        const px = parseInt(wInput.value);
        if (isNaN(px) || px < 1) { updatePixelInputs(); return; }
        let newW = Math.max(MIN_PCT, Math.min(100 - crop.x, px / c.offsetWidth * 100));
        let newH = crop.h;

        const pctAspect = getPctAspect();
        if (pctAspect !== null) {
            newH = newW / pctAspect;
        } else if (frameLocked && crop.w > 0) {
            newH = newW * (crop.h / crop.w);
        }

        Object.assign(crop, clampCrop(crop.x, crop.y, newW, newH));
        applyCrop();
    }

    // ── Height input ─────────────────────────────────────
    function commitHeight() {
        const c = getContainer();
        if (!c) return;
        const px = parseInt(hInput.value);
        if (isNaN(px) || px < 1) { updatePixelInputs(); return; }
        let newH = Math.max(MIN_PCT, Math.min(100 - crop.y, px / c.offsetHeight * 100));
        let newW = crop.w;

        const pctAspect = getPctAspect();
        if (pctAspect !== null) {
            newW = newH * pctAspect;
        } else if (frameLocked && crop.h > 0) {
            newW = newH * (crop.w / crop.h);
        }

        Object.assign(crop, clampCrop(crop.x, crop.y, newW, newH));
        applyCrop();
    }

    wInput?.addEventListener('blur', commitWidth);
    wInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { commitWidth(); wInput.blur(); }
        if (e.key === 'Escape') { updatePixelInputs(); wInput.blur(); }
    });

    hInput?.addEventListener('blur', commitHeight);
    hInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { commitHeight(); hInput.blur(); }
        if (e.key === 'Escape') { updatePixelInputs(); hInput.blur(); }
    });
}

// ── Clamp to valid bounds ─────────────────────────────────
const MIN_PCT = 5;

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

    if (handle.includes('l'))  { x = start.x + dxPct; w = start.w - dxPct; }
    if (handle.includes('r'))  { w = start.w + dxPct; }
    if (handle.includes('t'))  { y = start.y + dyPct; h = start.h - dyPct; }
    if (handle.includes('b'))  { h = start.h + dyPct; }
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
                const nw2 = Math.max(MIN_PCT, w);
                const nh2 = nw2 / pctAspect;
                w = nw2; h = nh2;
                if (handle.includes('t')) y = start.y + start.h - nh2;
                if (handle.includes('l')) x = start.x + start.w - nw2;
            } else {
                const nh2 = Math.max(MIN_PCT, h);
                const nw2 = nh2 * pctAspect;
                h = nh2; w = nw2;
                if (handle.includes('t')) y = start.y + start.h - nh2;
                if (handle.includes('l')) x = start.x + start.w - nw2;
            }
        }
    }

    return clampCrop(x, y, w, h);
}

// ── Mouse handlers ────────────────────────────────────────
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
    dragCtx = { type: 'resize', handle, startX: e.clientX, startY: e.clientY, start: { ...crop } };
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
        crop.x = s.x; crop.y = s.y;
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

// ── Aspect ratio ──────────────────────────────────────────
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
    if (ratio === null) { applyCrop(); return; }

    const pctAspect = getPctAspect();
    if (!pctAspect) return;

    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    let nw = crop.w;
    let nh = nw / pctAspect;
    if (nh > 96) { nh = 96; nw = nh * pctAspect; }
    if (nw > 96) { nw = 96; nh = nw / pctAspect; }

    crop.w = nw; crop.h = nh;
    crop.x = Math.max(0, Math.min(100 - nw, cx - nw / 2));
    crop.y = Math.max(0, Math.min(100 - nh, cy - nh / 2));
    applyCrop();
}

// ── Custom dropdown ───────────────────────────────────────
function initCustomSelect() {
    const btn      = document.getElementById('aspect-select-btn');
    const dropdown = document.getElementById('aspect-select-dropdown');
    const label    = document.getElementById('aspect-select-label');
    if (!btn || !dropdown) return;

    // Toggle open/close
    btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        dropdown.classList.toggle('open', !isOpen);
        btn.classList.toggle('open', !isOpen);
    });

    // Option click
    dropdown.querySelectorAll('.frame-select-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const value = opt.dataset.value;
            setSelectValue(value);
            syncPresetBtns(value);
            applyAspectPreset(RATIO_MAP[value] ?? null);
            dropdown.classList.remove('open');
            btn.classList.remove('open');
        });
    });

    // Close on outside click
    document.addEventListener('click', () => {
        dropdown.classList.remove('open');
        btn.classList.remove('open');
    });
}

function setSelectValue(value) {
    const label = document.getElementById('aspect-select-label');
    if (label) label.textContent = value;
    document.querySelectorAll('#aspect-select-dropdown .frame-select-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === value);
    });
}

function syncPresetBtns(value) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        const l = btn.querySelector('.preset-label')?.textContent?.trim();
        btn.classList.toggle('active', l === value);
    });
}

// ── Reset ─────────────────────────────────────────────────
function resetCrop() {
    cropAspect = null;
    crop.x = 8; crop.y = 10; crop.w = 84; crop.h = 80;
    applyCrop();
    setSelectValue('Свободно');
    syncPresetBtns('Свободно');
}

// ── Init ──────────────────────────────────────────────────
function initCrop() {
    const frame = getCropFrame();
    if (!frame) return;

    // Frame drag
    frame.addEventListener('mousedown', onFrameMouseDown);

    // Handle resize + cursors
    frame.querySelectorAll('.crop-handle').forEach(h => {
        const key = getHandleKey(h);
        h.style.cursor = HANDLE_CURSORS[key] || 'crosshair';
        h.addEventListener('mousedown', onHandleMouseDown);
    });

    // Global mouse tracking
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);

    // Preset buttons → aspect ratio + sync select
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.querySelector('.preset-label')?.textContent?.trim();
            if (value && value in RATIO_MAP) {
                setSelectValue(value);
                applyAspectPreset(RATIO_MAP[value] ?? null);
            }
        });
    });

    // Reset action button
    document.querySelectorAll('.preset-action').forEach(btn => {
        const lbl = btn.querySelector('.preset-action-label')?.textContent?.trim();
        if (lbl === 'Сбросить') btn.addEventListener('click', resetCrop);
    });

    // Custom select dropdown
    initCustomSelect();

    // Pixel inputs
    initPixelInputs();

    // Initial render
    applyCrop();
}

document.addEventListener('DOMContentLoaded', initCrop);

// ── Public API for app.js ─────────────────────────────
/**
 * Convert the current crop frame (% of container) into normalized image
 * fractions [0-1], accounting for object-fit:contain letterboxing.
 *
 * @param {number} photoW - natural width of the displayed photo (px)
 * @param {number} photoH - natural height of the displayed photo (px)
 * @returns {{ x, y, x2, y2 } | null}  fractions of source image, or null on error
 */
window.cropGetNormalized = function(photoW, photoH) {
    const c = getContainer();
    if (!c || !photoW || !photoH) return null;

    const cW = c.offsetWidth;
    const cH = c.offsetHeight;

    // How object-fit:contain scales the image inside the container
    const scale     = Math.min(cW / photoW, cH / photoH);
    const renderedW = photoW * scale;
    const renderedH = photoH * scale;
    const offX      = (cW - renderedW) / 2;   // horizontal letterbox
    const offY      = (cH - renderedH) / 2;   // vertical letterbox

    // Crop frame corners in container pixels
    const left   = crop.x             / 100 * cW;
    const top    = crop.y             / 100 * cH;
    const right  = (crop.x + crop.w)  / 100 * cW;
    const bottom = (crop.y + crop.h)  / 100 * cH;

    // Map to fractions of the rendered (and therefore source) image
    return {
        x:  Math.max(0, Math.min(1, (left   - offX) / renderedW)),
        y:  Math.max(0, Math.min(1, (top    - offY) / renderedH)),
        x2: Math.max(0, Math.min(1, (right  - offX) / renderedW)),
        y2: Math.max(0, Math.min(1, (bottom - offY) / renderedH)),
    };
};
