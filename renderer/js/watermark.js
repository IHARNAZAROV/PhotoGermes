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

    // Color swatch click → open custom picker
    colorPreview?.addEventListener('click', () => {
        openColorPicker(colorPreview, colorInput?.value || '#ffffff', hex => {
            if (colorInput)   colorInput.value = hex;
            if (colorPreview) colorPreview.style.background = hex;
            updateWmOverlay();
        });
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

    ['wm-text-offset-x', 'wm-text-offset-y'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateWmOverlay);
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

// ── SVG recoloring ─────────────────────────────────────
// Stores the original SVG text so we can re-tint it on demand
let _wmOriginalSvgText = null;
let _wmIsSvg           = false;


/** Replace all non-transparent fill/stroke/stop-color values with newColor */
function recolorSvg(svgText, newColor) {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl   = doc.documentElement;

    // Check for parse errors
    if (svgEl.tagName === 'parsererror') return svgText;

    const KEEP = new Set(['none', 'transparent', 'inherit', 'currentcolor', '']);

    function colorable(v) {
        if (!v) return false;
        return !KEEP.has(v.trim().toLowerCase());
    }

    function processEl(el) {
        ['fill', 'stroke'].forEach(attr => {
            const v = el.getAttribute(attr);
            if (v !== null && colorable(v)) el.setAttribute(attr, newColor);
        });

        // stop-color for gradient stops
        const sc = el.getAttribute('stop-color');
        if (sc !== null && colorable(sc)) el.setAttribute('stop-color', newColor);

        // inline style
        const style = el.getAttribute('style');
        if (style) {
            const updated = style
                .replace(/((?:fill|stroke|stop-color)\s*:\s*)([^;]+)/gi, (_m, prop, val) => {
                    return colorable(val.trim()) ? prop + newColor : _m;
                });
            el.setAttribute('style', updated);
        }

        for (const child of el.children) processEl(child);
    }

    processEl(svgEl);
    return new XMLSerializer().serializeToString(doc);
}

/** Turn SVG text into a data: URL usable as <img src> */
function svgTextToDataUrl(svgText) {
    // Base64-encode to avoid URI-encoding issues with complex SVGs
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
}

/** Apply chosen color to the stored SVG and update the preview thumb */
function applyWmSvgColor(color) {
    if (!_wmOriginalSvgText) return;
    const recolored = recolorSvg(_wmOriginalSvgText, color);
    const dataUrl   = svgTextToDataUrl(recolored);
    const thumb     = document.getElementById('wm-upload-thumb');
    if (thumb) thumb.src = dataUrl;

    // Sync preview swatch colour
    const preview = document.getElementById('wm-svg-color-preview');
    if (preview) preview.style.background = color;

    updateWmOverlay();
}

/** Show / hide the SVG color block and build palette swatches */
function showWmSvgColorBlock(show) {
    const block = document.getElementById('wm-svg-color-block');
    if (!block) return;
    block.style.display = show ? '' : 'none';
}

function initWmSvgColorControls() {
    const colorInput   = document.getElementById('wm-svg-color-input');
    const colorPreview = document.getElementById('wm-svg-color-preview');
    colorPreview?.addEventListener('click', () => {
        openColorPicker(colorPreview, colorInput?.value || '#ffffff', hex => {
            if (colorInput) colorInput.value = hex;
            applyWmSvgColor(hex);
        });
    });
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
        const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
        if (isSvg) {
            // Read SVG text, store it, then show preview from data URL
            const reader = new FileReader();
            reader.onload = () => {
                _wmOriginalSvgText = reader.result;
                _wmIsSvg = true;
                showWmSvgColorBlock(true);
                // Reset color state
                const preview = document.getElementById('wm-svg-color-preview');
                const picker  = document.getElementById('wm-svg-color-input');
                if (preview) preview.style.background = '#ffffff';
                if (picker)  picker.value = '#ffffff';
                showImagePreview(svgTextToDataUrl(_wmOriginalSvgText));
            };
            reader.readAsText(file);
        } else {
            _wmOriginalSvgText = null;
            _wmIsSvg = false;
            showWmSvgColorBlock(false);
            const url = URL.createObjectURL(file);
            showImagePreview(url);
        }
    });

    // Drag-over on upload zone
    uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-active'); });
    uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-active'));
    uploadZone?.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-active');
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
        if (isSvg) {
            const reader = new FileReader();
            reader.onload = () => {
                _wmOriginalSvgText = reader.result;
                _wmIsSvg = true;
                showWmSvgColorBlock(true);
                const preview = document.getElementById('wm-svg-color-preview');
                const picker  = document.getElementById('wm-svg-color-input');
                if (preview) preview.style.background = '#ffffff';
                if (picker)  picker.value = '#ffffff';
                showImagePreview(svgTextToDataUrl(_wmOriginalSvgText));
            };
            reader.readAsText(file);
        } else {
            _wmOriginalSvgText = null;
            _wmIsSvg = false;
            showWmSvgColorBlock(false);
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
        _wmOriginalSvgText = null;
        _wmIsSvg = false;
        showWmSvgColorBlock(false);
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

    ['wm-img-offset-x', 'wm-img-offset-y'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateWmOverlay);
    });
}


// ── Keep preview overlay bound to the visible image ─────
function syncWmOverlayBounds() {
    const placeholder = document.getElementById('wm-editor-placeholder');
    const img = document.getElementById('wm-editor-img');
    const overlay = document.getElementById('wm-overlay');
    if (!placeholder || !img || !overlay) return;

    const hasPhoto = placeholder.classList.contains('has-photo')
        && img.style.display !== 'none'
        && img.naturalWidth > 0
        && img.naturalHeight > 0;

    if (!hasPhoto) {
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        return;
    }

    const boxW = placeholder.clientWidth;
    const boxH = placeholder.clientHeight;
    if (!boxW || !boxH) return;

    const boxRatio = boxW / boxH;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let visibleW = boxW;
    let visibleH = boxH;

    if (imgRatio > boxRatio) {
        visibleH = boxW / imgRatio;
    } else {
        visibleW = boxH * imgRatio;
    }

    overlay.style.left = `${(boxW - visibleW) / 2}px`;
    overlay.style.top = `${(boxH - visibleH) / 2}px`;
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
    overlay.style.width = `${visibleW}px`;
    overlay.style.height = `${visibleH}px`;
}

// ── Overlay update (live preview) ─────────────────────
function updateWmOverlay() {
    const labelEl   = document.getElementById('wm-label');
    const labelText = document.getElementById('wm-label-text');
    const overlay   = document.getElementById('wm-overlay');
    if (!labelEl || !overlay) return;
    syncWmOverlayBounds();

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

        const labelContent = text;
        const textStyles = {
            fontFamily: `'${family}', sans-serif`,
            fontSize:   size + 'px',
            fontWeight: bold   ? '700' : '500',
            fontStyle:  italic ? 'italic' : 'normal',
            color,
            opacity,
            whiteSpace: 'nowrap',
        };

        if (!labelContent.trim()) {
            clearTileGrid(overlay);
            clearImageStyles(labelEl);
            if (labelText) labelText.textContent = '';
            labelEl.style.display = 'none';
        } else if (tile) {
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
    const isText = document.getElementById('wm-tab-text')?.classList.contains('active');
    const ox = Math.max(0, +(document.getElementById(isText ? 'wm-text-offset-x' : 'wm-img-offset-x')?.value || 18));
    const oy = Math.max(0, +(document.getElementById(isText ? 'wm-text-offset-y' : 'wm-img-offset-y')?.value || 18));
    overlay.style.display        = 'flex';
    overlay.style.justifyContent = jc;
    overlay.style.alignItems     = ai;
    overlay.style.padding        = `${oy}px ${ox}px`;
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

// ── Apply watermark to image data ──────────────────────
function getWmSettings() {
    const isText = document.getElementById('wm-tab-text')?.classList.contains('active');
    const overlay = document.getElementById('wm-overlay');
    const label = document.getElementById('wm-label');
    const activeGrid = document.getElementById(isText ? 'wm-text-position-grid' : 'wm-img-position-grid')
        ?.querySelector('.wm-pos-cell.active');
    const dragged = label?.style.position === 'absolute' && label.style.left && label.style.top;
    return {
        mode: isText ? 'text' : 'image',
        position: activeGrid?.dataset.pos || (isText ? 'cc' : 'br'),
        dragged: dragged ? {
            x: parseFloat(label.style.left) / Math.max(1, overlay.clientWidth),
            y: parseFloat(label.style.top) / Math.max(1, overlay.clientHeight),
        } : null,
        text: document.getElementById('wm-text-input')?.value || '',
        family: getWmFontFamily(),
        fontSize: +(document.getElementById('wm-font-size')?.value || 24),
        bold: document.getElementById('wm-bold')?.classList.contains('active'),
        italic: document.getElementById('wm-italic')?.classList.contains('active'),
        color: document.getElementById('wm-text-color')?.value || '#ffffff',
        textOpacity: (document.getElementById('wm-text-opacity')?.value ?? 70) / 100,
        textTile: document.getElementById('wm-tile')?.checked,
        diagonal: document.getElementById('wm-diagonal')?.checked,
        textAngle: +(document.getElementById('wm-text-angle')?.value || 0),
        imageSrc: document.getElementById('wm-upload-thumb')?.src || '',
        imageOpacity: (document.getElementById('wm-img-opacity')?.value ?? 80) / 100,
        imageWidth: +(document.getElementById('wm-img-width')?.value || 200),
        imageHeight: +(document.getElementById('wm-img-height')?.value || 200),
        imageTile: document.getElementById('wm-img-tile')?.checked,
        imageAngle: +(document.getElementById('wm-img-angle')?.value || 0),
        offsetX: Math.max(0, +(document.getElementById(isText ? 'wm-text-offset-x' : 'wm-img-offset-x')?.value || 18)),
        offsetY: Math.max(0, +(document.getElementById(isText ? 'wm-text-offset-y' : 'wm-img-offset-y')?.value || 18)),
    };
}

function loadWmImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function calcWmPoint(pos, cw, ch, ww, wh, ox, oy) {
    const x = pos.endsWith('l') ? ox : pos.endsWith('r') ? cw - ww - ox : (cw - ww) / 2;
    const y = pos.startsWith('t') ? oy : pos.startsWith('b') ? ch - wh - oy : (ch - wh) / 2;
    return [x, y];
}

function drawRotated(ctx, x, y, w, h, angle, draw) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle * Math.PI / 180);
    draw(-w / 2, -h / 2);
    ctx.restore();
}

async function applyWatermarkToPhotoCanvas(photo, settings, cachedLogo) {
    const src = photo.preview || photo.objectUrl;
    if (!src) return false;
    const base = await loadWmImage(src).catch(() => null);
    if (!base) return false;

    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);

    if (settings.mode === 'text') {
        if (!settings.text.trim()) return false;
        const angle = settings.diagonal ? 45 : settings.textAngle;
        ctx.font = `${settings.italic ? 'italic ' : ''}${settings.bold ? '700' : '500'} ${settings.fontSize}px ${settings.family}, sans-serif`;
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = settings.textOpacity;
        ctx.textBaseline = 'top';
        const metrics = ctx.measureText(settings.text);
        const w = metrics.width, h = settings.fontSize * 1.25;
        const draw = (x, y) => drawRotated(ctx, x, y, w, h, angle, (dx, dy) => ctx.fillText(settings.text, dx, dy));
        if (settings.textTile) {
            for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) draw((c + .5) * canvas.width / 4 - w / 2, (r + .5) * canvas.height / 3 - h / 2);
        } else {
            const [x, y] = settings.dragged ? [settings.dragged.x * canvas.width, settings.dragged.y * canvas.height] : calcWmPoint(settings.position, canvas.width, canvas.height, w, h, settings.offsetX, settings.offsetY);
            draw(x, y);
        }
    } else {
        if (!cachedLogo) return false;
        ctx.globalAlpha = settings.imageOpacity;
        const w = Math.min(settings.imageWidth, canvas.width);
        const h = Math.min(settings.imageHeight, canvas.height);
        const draw = (x, y) => drawRotated(ctx, x, y, w, h, settings.imageAngle, (dx, dy) => ctx.drawImage(cachedLogo, dx, dy, w, h));
        if (settings.imageTile) {
            for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) draw((c + .5) * canvas.width / 4 - w / 2, (r + .5) * canvas.height / 3 - h / 2);
        } else {
            const [x, y] = settings.dragged ? [settings.dragged.x * canvas.width, settings.dragged.y * canvas.height] : calcWmPoint(settings.position, canvas.width, canvas.height, w, h, settings.offsetX, settings.offsetY);
            draw(x, y);
        }
    }
    ctx.globalAlpha = 1;
    photo.preview = canvas.toDataURL('image/jpeg', 0.92);
    photo.width = canvas.width;
    photo.height = canvas.height;
    photo.sizeBytes = Math.round((photo.preview.length - 22) * 0.75);
    const tc = document.createElement('canvas');
    const ratio = Math.max(160 / canvas.width, 120 / canvas.height);
    tc.width = Math.round(canvas.width * ratio);
    tc.height = Math.round(canvas.height * ratio);
    tc.getContext('2d').drawImage(canvas, 0, 0, tc.width, tc.height);
    photo.thumbnail = tc.toDataURL('image/jpeg', 0.75);
    return true;
}

async function applyWatermark() {
    if (selectedIndex < 0) { showToast('Откройте фото для ватермарка'); return; }
    const settings = getWmSettings();
    if (settings.mode === 'text' && !settings.text.trim()) { showToast('Введите текст ватермарка'); return; }
    let cachedLogo = null;
    if (settings.mode === 'image') {
        if (!settings.imageSrc) { showToast('Загрузите изображение ватермарка'); return; }
        cachedLogo = await loadWmImage(settings.imageSrc).catch(() => null);
        if (!cachedLogo) { showToast('Не удалось загрузить изображение ватермарка'); return; }
    }
    const indexes = checkedIndices.size >= 2 ? [...checkedIndices] : [selectedIndex];
    const btn = document.getElementById('btn-apply-watermark');
    if (btn) btn.disabled = true;
    if (indexes.length === 1 && typeof pushUndo === 'function') pushUndo();
    let okCount = 0;
    for (const i of indexes) {
        const ok = await applyWatermarkToPhotoCanvas(photos[i], settings, cachedLogo);
        if (ok) { okCount++; patchThumbnail(i); }
    }
    if (btn) btn.disabled = false;
    if (!okCount) { showToast('Не удалось применить ватермарк'); return; }
    await loadEditorPreview(photos[selectedIndex]);
    const wmImg = document.getElementById('wm-editor-img');
    if (wmImg) wmImg.src = photos[selectedIndex].preview || photos[selectedIndex].objectUrl;
    rebuildGallery();
    updateCounts();
    if (typeof updateUndoRedoBtns === 'function') updateUndoRedoBtns();
    pushHistory('tool', indexes.length > 1 ? `Ватермарк применён к ${okCount} фото` : `Ватермарк применён: ${photos[selectedIndex].name}`);
    showToast(indexes.length > 1 ? `Ватермарк применён к ${okCount} фото` : 'Ватермарк применён');
}


function clearWatermarkControls() {
    const textInput = document.getElementById('wm-text-input');
    if (textInput) textInput.value = '';

    const thumbEl = document.getElementById('wm-upload-thumb');
    const fileInput = document.getElementById('wm-image-input');
    const idleState = document.getElementById('wm-upload-idle');
    const previewState = document.getElementById('wm-upload-preview');
    if (thumbEl) thumbEl.src = '';
    if (fileInput) fileInput.value = '';
    if (idleState) idleState.style.display = 'flex';
    if (previewState) previewState.style.display = 'none';

    resetLabelFromDrag();
    updateWmOverlay();
    showToast('Ватермарк удалён из предпросмотра');
}

function isEditableTarget(target) {
    return target?.closest?.('input, textarea, select, [contenteditable="true"]');
}

function initWmClearControls() {
    document.getElementById('btn-clear-watermark')?.addEventListener('click', clearWatermarkControls);
    document.addEventListener('keydown', e => {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;
        if (typeof activeTool !== 'undefined' && activeTool !== 'watermark') return;
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        clearWatermarkControls();
    });
}

function initWmApplyBtn() {
    const btn = document.getElementById('btn-apply-watermark');
    if (!btn) return;
    btn.addEventListener('click', applyWatermark);
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


function initWmOverlayBounds() {
    document.getElementById('wm-editor-img')?.addEventListener('load', () => {
        syncWmOverlayBounds();
        updateWmOverlay();
    });
    window.addEventListener('resize', () => {
        syncWmOverlayBounds();
        updateWmOverlay();
    });
}

// ── Public init ────────────────────────────────────────
window.initWatermark = function () {
    initWmFontDropdown();
    initWmSubTabs();
    initWmTextControls();
    initWmPositionGrids();
    initWmImageControls();
    initWmSvgColorControls();
    initWmDrag();
    initWmApplyBtn();
    initWmClearControls();
    initWmToggle();
    initWmOverlayBounds();
    updateWmOverlay();
};

// ── Called when the watermark tab becomes active ───────
window.wmActivate = function () {
    updateWmOverlay();
};
