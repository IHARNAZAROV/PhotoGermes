/* ========================================================
   watermark.js — Ватермарк: Текст и изображения
   ======================================================== */
'use strict';

// ── Font family custom dropdown ────────────────────────
function initWmFontDropdown() {
    const btn      = document.getElementById('wm-font-family-btn');
    const dropdown = document.getElementById('wm-font-family-dropdown');
    const label    = document.getElementById('wm-font-family-label');
    const preview  = document.getElementById('wm-font-family-preview');
    if (!btn || !dropdown) return;

    // Toggle open/close
    btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
    });

    // Option click
    dropdown.querySelectorAll('.ri-select-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const val = opt.dataset.value;

            // Update active state
            dropdown.querySelectorAll('.ri-select-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');

            // Update button label + preview
            if (label)   label.textContent = val;
            if (preview) {
                preview.style.fontFamily = `'${val}', sans-serif`;
            }

            // Close
            dropdown.classList.remove('open');
            btn.classList.remove('open');

            updateWmOverlay();
        });
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            btn.classList.remove('open');
        }
    });
}

// Helper: get selected font family value
function getWmFontFamily() {
    const active = document.querySelector('#wm-font-family-dropdown .ri-select-option.active');
    return active?.dataset.value || 'Inter';
}

// ── Sub-tab switching ──────────────────────────────────
function initWmSubTabs() {
    const tabText  = document.getElementById('wm-tab-text');
    const tabImage = document.getElementById('wm-tab-image');
    const panelText  = document.getElementById('wm-panel-text');
    const panelImage = document.getElementById('wm-panel-image');
    if (!tabText || !tabImage) return;

    function activate(panel) {
        const isText = panel === 'text';
        tabText.classList.toggle('active', isText);
        tabImage.classList.toggle('active', !isText);
        panelText.style.display  = isText  ? 'flex' : 'none';
        panelImage.style.display = !isText ? 'flex' : 'none';
        updateWmOverlay();
    }

    tabText.addEventListener('click',  () => activate('text'));
    tabImage.addEventListener('click', () => activate('image'));
}

// ── Live text preview ──────────────────────────────────
function initWmTextControls() {
    const textInput   = document.getElementById('wm-text-input');
    const fontFamily  = document.getElementById('wm-font-family');
    const fontSize    = document.getElementById('wm-font-size');
    const boldBtn     = document.getElementById('wm-bold');
    const italicBtn   = document.getElementById('wm-italic');
    const colorInput  = document.getElementById('wm-text-color');
    const colorPreview = document.getElementById('wm-text-color-preview');
    const opacitySlider = document.getElementById('wm-text-opacity');
    const opacityFill   = document.getElementById('wm-text-opacity-fill');
    const opacityVal    = document.getElementById('wm-text-opacity-val');
    const labelText   = document.getElementById('wm-label-text');
    const label       = document.getElementById('wm-label');

    if (!textInput) return;

    // Sync text
    textInput.addEventListener('input', updateWmOverlay);

    // Sync font family
    fontFamily?.addEventListener('change', updateWmOverlay);

    // Sync font size
    fontSize?.addEventListener('input', updateWmOverlay);

    // Bold
    boldBtn?.addEventListener('click', () => {
        boldBtn.classList.toggle('active');
        updateWmOverlay();
    });

    // Italic
    italicBtn?.addEventListener('click', () => {
        italicBtn.classList.toggle('active');
        updateWmOverlay();
    });

    // Color swatch click → open native picker
    colorPreview?.addEventListener('click', () => colorInput?.click());
    colorInput?.addEventListener('input', () => {
        if (colorPreview) colorPreview.style.background = colorInput.value;
        updateWmOverlay();
    });

    // Opacity
    opacitySlider?.addEventListener('input', () => {
        const v = opacitySlider.value;
        if (opacityFill) opacityFill.style.width = v + '%';
        if (opacityVal)  opacityVal.textContent  = v + '%';
        updateWmOverlay();
    });

    // Angle: numeric input ↔ slider sync
    const angleInput  = document.getElementById('wm-text-angle');
    const angleSlider = document.getElementById('wm-text-angle-slider');
    const angleReset  = document.getElementById('wm-text-angle-reset');

    angleInput?.addEventListener('input', () => {
        if (angleSlider) angleSlider.value = angleInput.value;
        updateWmOverlay();
    });
    angleSlider?.addEventListener('input', () => {
        if (angleInput) angleInput.value = angleSlider.value;
        updateWmOverlay();
    });
    angleReset?.addEventListener('click', () => {
        if (angleInput)  angleInput.value  = '0';
        if (angleSlider) angleSlider.value = '0';
        updateWmOverlay();
    });

    // Мозаика: tile mode toggle
    document.getElementById('wm-tile')?.addEventListener('change', () => {
        resetLabelFromDrag();
        updateWmOverlay();
    });

    // По диагонали: diagonal toggle — lock angle to 45°, update overlay
    document.getElementById('wm-diagonal')?.addEventListener('change', e => {
        if (e.target.checked) {
            // Store current angle before locking
            if (angleInput)  angleInput.value  = '45';
            if (angleSlider) angleSlider.value = '45';
        }
        updateWmOverlay();
    });
}

// ── Position grid ──────────────────────────────────────
function initWmPositionGrids() {
    document.querySelectorAll('.wm-position-grid').forEach(grid => {
        grid.querySelectorAll('.wm-pos-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                grid.querySelectorAll('.wm-pos-cell').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                // Reset any drag-absolute positioning so flexbox takes over
                resetLabelFromDrag();
                updateWmOverlay();
            });
        });
    });
}

// Reset label out of drag-absolute mode back to flex-child
function resetLabelFromDrag() {
    const label   = document.getElementById('wm-label');
    const overlay = document.getElementById('wm-overlay');
    if (!label || !overlay) return;
    label.style.position = '';
    label.style.left     = '';
    label.style.top      = '';
    overlay.style.position = 'absolute'; // keep absolute on the overlay itself
}

// ── Image controls ─────────────────────────────────────
function initWmImageControls() {
    const fileInput      = document.getElementById('wm-image-input');
    const uploadZone     = document.getElementById('wm-upload-zone');
    const idleState      = document.getElementById('wm-upload-idle');
    const previewState   = document.getElementById('wm-upload-preview');
    const thumbEl        = document.getElementById('wm-upload-thumb');
    const removeBtn      = document.getElementById('wm-upload-remove');

    const widthInput     = document.getElementById('wm-img-width');
    const heightInput    = document.getElementById('wm-img-height');
    const linkBtn        = document.getElementById('wm-img-link-btn');
    const opacitySlider  = document.getElementById('wm-img-opacity');
    const opacityFill    = document.getElementById('wm-img-opacity-fill');
    const opacityVal     = document.getElementById('wm-img-opacity-val');
    const angleInput     = document.getElementById('wm-img-angle');
    const angleSlider    = document.getElementById('wm-img-angle-slider');
    const angleReset     = document.getElementById('wm-img-angle-reset');

    let aspectRatio = 1; // natural W/H ratio of the uploaded image
    let isLinked    = true;

    // File pick
    fileInput?.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        showImagePreview(url);
    });

    // Drag-over on upload zone
    uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-active'); });
    uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-active'));
    uploadZone?.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-active');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            showImagePreview(url);
        }
    });

    function showImagePreview(url) {
        const img = new Image();
        img.onload = () => {
            aspectRatio = img.naturalWidth / img.naturalHeight;
            const w = Math.round(Math.min(img.naturalWidth, 400));
            const h = Math.round(w / aspectRatio);
            if (widthInput)  widthInput.value  = w;
            if (heightInput) heightInput.value = h;
            updateWmOverlay();
        };
        img.src = url;

        if (thumbEl)      thumbEl.src = url;
        if (idleState)    idleState.style.display    = 'none';
        if (previewState) previewState.style.display = 'flex';
    }

    // Remove image
    removeBtn?.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (thumbEl)      thumbEl.src = '';
        if (idleState)    idleState.style.display    = 'flex';
        if (previewState) previewState.style.display = 'none';
        if (fileInput)    fileInput.value = '';
        updateWmOverlay();
    });

    // Lock aspect ratio toggle
    linkBtn?.addEventListener('click', () => {
        isLinked = !isLinked;
        linkBtn.classList.toggle('active', isLinked);
    });

    // Width input → sync height if linked
    widthInput?.addEventListener('input', () => {
        if (isLinked && aspectRatio && heightInput) {
            heightInput.value = Math.round(+widthInput.value / aspectRatio) || '';
        }
        updateWmOverlay();
    });
    heightInput?.addEventListener('input', () => {
        if (isLinked && aspectRatio && widthInput) {
            widthInput.value = Math.round(+heightInput.value * aspectRatio) || '';
        }
        updateWmOverlay();
    });

    // Opacity
    opacitySlider?.addEventListener('input', () => {
        const v = opacitySlider.value;
        if (opacityFill) opacityFill.style.width = v + '%';
        if (opacityVal)  opacityVal.textContent  = v + '%';
        updateWmOverlay();
    });

    // Angle
    angleInput?.addEventListener('input', () => {
        if (angleSlider) angleSlider.value = angleInput.value;
        updateWmOverlay();
    });
    angleSlider?.addEventListener('input', () => {
        if (angleInput) angleInput.value = angleSlider.value;
        updateWmOverlay();
    });
    angleReset?.addEventListener('click', () => {
        if (angleInput)  angleInput.value  = '0';
        if (angleSlider) angleSlider.value = '0';
        updateWmOverlay();
    });

    // Мозаика (image)
    document.getElementById('wm-img-tile')?.addEventListener('change', () => {
        resetLabelFromDrag();
        updateWmOverlay();
    });
}

// ── Overlay update (live preview) ─────────────────────
function updateWmOverlay() {
    const labelEl   = document.getElementById('wm-label');
    const labelText = document.getElementById('wm-label-text');
    const overlay   = document.getElementById('wm-overlay');
    if (!labelEl || !overlay) return;

    const isText = document.getElementById('wm-tab-text')?.classList.contains('active');

    if (isText) {
        const text     = document.getElementById('wm-text-input')?.value || '';
        const family   = getWmFontFamily();
        const size     = +(document.getElementById('wm-font-size')?.value || 24);
        const bold     = document.getElementById('wm-bold')?.classList.contains('active');
        const italic   = document.getElementById('wm-italic')?.classList.contains('active');
        const color    = document.getElementById('wm-text-color')?.value || '#ffffff';
        const opacity  = (document.getElementById('wm-text-opacity')?.value ?? 70) / 100;
        const tile     = document.getElementById('wm-tile')?.checked;
        const diagonal = document.getElementById('wm-diagonal')?.checked;
        const angle    = diagonal ? 45 : +(document.getElementById('wm-text-angle')?.value || 0);

        // Sync angle controls with diagonal state
        syncDiagonalAngleUI(diagonal, 'wm-text-angle', 'wm-text-angle-slider', angle);

        const labelContent = text || '© Ватермарк';
        const textStyles = {
            fontFamily: `'${family}', sans-serif`,
            fontSize:   size + 'px',
            fontWeight: bold   ? '700' : '500',
            fontStyle:  italic ? 'italic' : 'normal',
            color,
            opacity,
            whiteSpace: 'nowrap',
        };

        if (tile) {
            renderTileGrid(overlay, labelContent, textStyles, angle, 'text');
        } else {
            // Restore single-label mode
            clearTileGrid(overlay);
            // Clear image-mode residue
            clearImageStyles(labelEl);
            labelEl.style.border = '1.5px dashed rgba(255,255,255,.55)';

            if (labelText) {
                labelText.textContent = labelContent;
                Object.assign(labelText.style, textStyles);
                labelText.style.opacity = opacity;
                labelText.style.display = '';
            }
            labelEl.style.transform = `rotate(${angle}deg)`;
            labelEl.style.display   = '';

            // Apply flexbox position (respects grid selection)
            const grid   = document.getElementById('wm-text-position-grid');
            const active = grid?.querySelector('.wm-pos-cell.active');
            applyFlexPosition(overlay, active?.dataset.pos || 'cc');
        }

    } else {
        // ── Image mode ──────────────────────────────────────
        const thumb   = document.getElementById('wm-upload-thumb');
        const hasSrc  = thumb?.src && !thumb.src.endsWith('#') && !thumb.src.endsWith('/');
        const opacity = (document.getElementById('wm-img-opacity')?.value ?? 80) / 100;
        const angle   = +(document.getElementById('wm-img-angle')?.value || 0);
        const wVal    = +(document.getElementById('wm-img-width')?.value  || 200);
        const hVal    = +(document.getElementById('wm-img-height')?.value || 200);
        const tile    = document.getElementById('wm-img-tile')?.checked;
        const src     = hasSrc ? thumb.src : null;

        const imgStyles = {
            width:  Math.min(wVal, 200) + 'px',
            height: Math.min(hVal, 150) + 'px',
            opacity,
        };

        if (tile && src) {
            renderTileGrid(overlay, src, imgStyles, angle, 'image');
        } else {
            clearTileGrid(overlay);
            clearImageStyles(labelEl);

            if (src) {
                if (labelText) labelText.style.display = 'none';
                labelEl.style.backgroundImage    = `url('${src}')`;
                labelEl.style.backgroundSize     = 'contain';
                labelEl.style.backgroundRepeat   = 'no-repeat';
                labelEl.style.backgroundPosition = 'center';
                labelEl.style.width              = imgStyles.width;
                labelEl.style.height             = imgStyles.height;
                labelEl.style.opacity            = opacity;
                labelEl.style.border             = '1.5px dashed rgba(255,255,255,.55)';
            } else {
                clearImageStyles(labelEl);
                if (labelText) {
                    labelText.style.display = '';
                    labelText.textContent   = '[ Загрузите изображение ]';
                    labelText.style.color   = 'rgba(255,255,255,.6)';
                    labelText.style.fontSize = '13px';
                    labelText.style.fontWeight = '400';
                    labelText.style.opacity = '1';
                }
            }
            labelEl.style.transform = `rotate(${angle}deg)`;
            labelEl.style.display   = '';

            const grid   = document.getElementById('wm-img-position-grid');
            const active = grid?.querySelector('.wm-pos-cell.active');
            applyFlexPosition(overlay, active?.dataset.pos || 'br');
        }
    }
}

// ── Sync angle UI when "По диагонали" is toggled ──────
function syncDiagonalAngleUI(diagonal, inputId, sliderId, effectiveAngle) {
    const angleInput  = document.getElementById(inputId);
    const angleSlider = document.getElementById(sliderId);
    const resetBtn    = document.getElementById(inputId + '-reset');
    if (diagonal) {
        if (angleInput)  { angleInput.value  = 45; angleInput.disabled  = true; }
        if (angleSlider) { angleSlider.value = 45; angleSlider.disabled = true; }
        if (resetBtn)      resetBtn.disabled = true;
    } else {
        if (angleInput)  angleInput.disabled  = false;
        if (angleSlider) angleSlider.disabled = false;
        if (resetBtn)    resetBtn.disabled    = false;
    }
}

// ── Tile grid renderer ────────────────────────────────
function renderTileGrid(overlay, content, styles, angle, mode) {
    // Remove existing single label from flow (keep in DOM for reference)
    const labelEl = document.getElementById('wm-label');
    if (labelEl) labelEl.style.display = 'none';

    // Create or reuse tile container
    let tileGrid = overlay.querySelector('.wm-tile-grid');
    if (!tileGrid) {
        tileGrid = document.createElement('div');
        tileGrid.className = 'wm-tile-grid';
        overlay.appendChild(tileGrid);
    }

    // Layout: fill overlay with evenly spaced items
    tileGrid.style.cssText = `
        position: absolute; inset: 0;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 0;
        pointer-events: none;
        overflow: hidden;
    `;

    // Rebuild 12 tile cells
    tileGrid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const cell = document.createElement('div');
        cell.style.cssText = 'display:flex; align-items:center; justify-content:center; overflow:hidden;';

        if (mode === 'image') {
            const img = document.createElement('img');
            img.src = content;
            img.style.cssText = `
                max-width: 90%; max-height: 90%;
                object-fit: contain;
                opacity: ${styles.opacity ?? 0.8};
                transform: rotate(${angle}deg);
                display: block;
            `;
            cell.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = content;
            span.style.cssText = `
                font-family: ${styles.fontFamily || 'Inter, sans-serif'};
                font-size: ${styles.fontSize || '16px'};
                font-weight: ${styles.fontWeight || '500'};
                font-style: ${styles.fontStyle || 'normal'};
                color: ${styles.color || '#fff'};
                opacity: ${styles.opacity ?? 0.7};
                transform: rotate(${angle}deg);
                white-space: nowrap;
                display: block;
            `;
            cell.appendChild(span);
        }
        tileGrid.appendChild(cell);
    }

    // Reset overlay flex so the tile grid fills it
    overlay.style.justifyContent = '';
    overlay.style.alignItems     = '';
}

// ── Remove tile grid, restore single-label mode ───────
function clearTileGrid(overlay) {
    const tileGrid = overlay?.querySelector('.wm-tile-grid');
    if (tileGrid) tileGrid.remove();
    const labelEl = document.getElementById('wm-label');
    if (labelEl) labelEl.style.display = '';
}

// ── Clear image-mode inline styles from label ─────────
function clearImageStyles(el) {
    if (!el) return;
    el.style.backgroundImage    = '';
    el.style.backgroundSize     = '';
    el.style.backgroundRepeat   = '';
    el.style.backgroundPosition = '';
    el.style.width              = '';
    el.style.height             = '';
    el.style.opacity            = '';
    el.style.border             = '';
}

// ── Map 9-grid pos key → flex alignment ──────────────
const POS_MAP = {
    tl: ['flex-start','flex-start'], tc: ['center','flex-start'], tr: ['flex-end','flex-start'],
    cl: ['flex-start','center'],     cc: ['center','center'],     cr: ['flex-end','center'],
    bl: ['flex-start','flex-end'],   bc: ['center','flex-end'],   br: ['flex-end','flex-end'],
};

function applyFlexPosition(overlay, pos) {
    const [jc, ai] = POS_MAP[pos] || ['center','center'];
    overlay.style.display        = 'flex';
    overlay.style.justifyContent = jc;
    overlay.style.alignItems     = ai;
    overlay.style.padding        = '18px';
}

// ── Draggable watermark on canvas ─────────────────────
function initWmDrag() {
    const label   = document.getElementById('wm-label');
    const overlay = document.getElementById('wm-overlay');
    if (!label || !overlay) return;

    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

    label.addEventListener('mousedown', e => {
        // Disable drag in tile mode
        const isText = document.getElementById('wm-tab-text')?.classList.contains('active');
        const tileId = isText ? 'wm-tile' : 'wm-img-tile';
        if (document.getElementById(tileId)?.checked) return;

        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect  = label.getBoundingClientRect();
        const oRect = overlay.getBoundingClientRect();
        origX = rect.left - oRect.left;
        origY = rect.top  - oRect.top;

        // Switch overlay to absolute positioning for free drag
        overlay.style.justifyContent = '';
        overlay.style.alignItems     = '';
        label.style.position = 'absolute';
        label.style.left     = origX + 'px';
        label.style.top      = origY + 'px';

        // Deactivate position grid so it doesn't snap back
        const gridId = isText ? 'wm-text-position-grid' : 'wm-img-position-grid';
        document.getElementById(gridId)
            ?.querySelectorAll('.wm-pos-cell')
            .forEach(c => c.classList.remove('active'));

        label.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        label.style.left = (origX + dx) + 'px';
        label.style.top  = (origY + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (dragging) {
            dragging = false;
            const l = document.getElementById('wm-label');
            if (l) l.style.cursor = 'move';
        }
    });
}

// ── Apply button feedback ──────────────────────────────
function initWmApplyBtn() {
    const btn = document.getElementById('btn-apply-watermark');
    if (!btn) return;
    btn.addEventListener('click', () => {
        // UI-only: flash applied state
        const orig = btn.innerHTML;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,8 6,12 14,4"/></svg> Применено`;
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1800);
    });
}

// ── Toggle preview ─────────────────────────────────────
function initWmToggle() {
    const btn     = document.getElementById('wm-toggle-preview');
    const overlay = document.getElementById('wm-overlay');
    if (!btn || !overlay) return;
    let visible = true;
    btn.addEventListener('click', () => {
        visible = !visible;
        overlay.style.opacity = visible ? '1' : '0';
        btn.classList.toggle('active', !visible);
    });
}

// ── Public init ────────────────────────────────────────
window.initWatermark = function () {
    initWmFontDropdown();
    initWmSubTabs();
    initWmTextControls();
    initWmPositionGrids();
    initWmImageControls();
    initWmDrag();
    initWmApplyBtn();
    initWmToggle();
    updateWmOverlay();
};

// ── Called when the watermark tab becomes active ───────
window.wmActivate = function () {
    updateWmOverlay();
};
