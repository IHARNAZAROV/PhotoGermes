/* ========================================================
   resize.js — Изменение размера: split-view + controls
   ======================================================== */
'use strict';

/* ── Split-view drag ─────────────────────────────────── */
(function initSplitDrag() {
    const container = document.getElementById('resize-split-container');
    const leftPanel = document.getElementById('resize-split-left');
    const divider   = document.getElementById('resize-divider');
    if (!container || !leftPanel || !divider) return;

    let dragging = false;
    let startX   = 0;
    let startW   = 0;

    function setPosition(newW) {
        leftPanel.style.width = newW + 'px';
        divider.style.left    = newW + 'px';
    }

    divider.addEventListener('mousedown', e => {
        dragging = true;
        startX   = e.clientX;
        startW   = leftPanel.offsetWidth;
        document.body.style.cursor     = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const rect = container.getBoundingClientRect();
        const delta = e.clientX - startX;
        let newW  = startW + delta;
        const min = rect.width * 0.2;
        const max = rect.width * 0.8;
        setPosition(Math.max(min, Math.min(max, newW)));
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor     = '';
        document.body.style.userSelect = '';
    });

    // Touch support
    divider.addEventListener('touchstart', e => {
        dragging = true;
        startX   = e.touches[0].clientX;
        startW   = leftPanel.offsetWidth;
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', e => {
        if (!dragging) return;
        const rect = container.getBoundingClientRect();
        let newW = startW + (e.touches[0].clientX - startX);
        const min = rect.width * 0.2;
        const max = rect.width * 0.8;
        setPosition(Math.max(min, Math.min(max, newW)));
    }, { passive: true });
    document.addEventListener('touchend', () => { dragging = false; });

    // Keep divider in sync whenever the container resizes
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => {
            const rect = container.getBoundingClientRect();
            if (!rect.width) return;
            const curW = leftPanel.offsetWidth;
            // Re-clamp in case window shrunk
            const min = rect.width * 0.2;
            const max = rect.width * 0.8;
            setPosition(Math.max(min, Math.min(max, curW)));
        }).observe(container);
    }
})();

/* ── Mode toggle (% / px) ────────────────────────────── */
(function initResizeMode() {
    const btnPct  = document.getElementById('resize-mode-pct');
    const btnPx   = document.getElementById('resize-mode-px');
    const unitW   = document.getElementById('resize-unit-w');
    const unitH   = document.getElementById('resize-unit-h');
    const inpW    = document.getElementById('resize-width');
    const inpH    = document.getElementById('resize-height');
    if (!btnPct || !btnPx) return;

    let mode = 'pct'; // 'pct' | 'px'

    function switchMode(newMode) {
        mode = newMode;
        btnPct.classList.toggle('active', mode === 'pct');
        btnPx.classList.toggle('active',  mode === 'px');
        const unit = mode === 'pct' ? '%' : 'px';
        if (unitW) unitW.textContent = unit;
        if (unitH) unitH.textContent = unit;

        if (mode === 'pct') {
            if (inpW) inpW.value = 70;
            if (inpH) inpH.value = 70;
        } else {
            // Try to get dimensions from active photo
            const photo = window.__resizeGetPhoto?.();
            if (inpW) inpW.value = photo?.width  || 1920;
            if (inpH) inpH.value = photo?.height || 1080;
        }
        updateResizeResult();
    }

    btnPct.addEventListener('click', () => switchMode('pct'));
    btnPx.addEventListener('click',  () => switchMode('px'));

    window.__resizeMode = () => mode;
})();

/* ── Linked width / height ───────────────────────────── */
(function initResizeLink() {
    const inpW    = document.getElementById('resize-width');
    const inpH    = document.getElementById('resize-height');
    const linkBtn = document.getElementById('resize-link-btn');
    const keepCb  = document.getElementById('resize-keep-ratio');
    if (!inpW || !inpH) return;

    let linked = true; // mirror keepCb

    function syncLink() {
        linked = keepCb ? keepCb.checked : true;
        if (linkBtn) linkBtn.classList.toggle('active', linked);
    }

    if (keepCb) keepCb.addEventListener('change', syncLink);
    if (linkBtn) {
        linkBtn.addEventListener('click', () => {
            if (keepCb) { keepCb.checked = !keepCb.checked; syncLink(); }
        });
    }

    inpW.addEventListener('input', () => {
        if (linked) {
            const photo = window.__resizeGetPhoto?.();
            const ratio = (photo && photo.width && photo.height) ? photo.height / photo.width : 1;
            const mode  = window.__resizeMode?.() ?? 'pct';
            if (mode === 'pct') {
                inpH.value = inpW.value;
            } else {
                inpH.value = Math.round(Number(inpW.value) * ratio) || '';
            }
        }
        updateResizeResult();
    });

    inpH.addEventListener('input', () => {
        if (linked) {
            const photo = window.__resizeGetPhoto?.();
            const ratio = (photo && photo.width && photo.height) ? photo.width / photo.height : 1;
            const mode  = window.__resizeMode?.() ?? 'pct';
            if (mode === 'pct') {
                inpW.value = inpH.value;
            } else {
                inpW.value = Math.round(Number(inpH.value) * ratio) || '';
            }
        }
        updateResizeResult();
    });

    syncLink();
})();

/* ── Custom resample dropdown ────────────────────────── */
(function initResampleDropdown() {
    const wrap    = document.getElementById('resize-resample-wrap');
    const btn     = document.getElementById('resize-resample-btn');
    const labelEl = document.getElementById('resize-resample-label');
    const dropdown= document.getElementById('resize-resample-dropdown');
    if (!wrap || !btn || !dropdown) return;

    function open()  { btn.classList.add('open'); dropdown.classList.add('open'); }
    function close() { btn.classList.remove('open'); dropdown.classList.remove('open'); }
    function toggle(){ btn.classList.contains('open') ? close() : open(); }

    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });

    dropdown.querySelectorAll('.ri-select-option').forEach(opt => {
        opt.addEventListener('click', () => {
            dropdown.querySelectorAll('.ri-select-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            if (labelEl) labelEl.textContent = opt.dataset.value;
            close();
            updateResizeResult();
        });
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (!wrap.contains(e.target)) close();
    });
})();

/* ── Quality slider ──────────────────────────────────── */
(function initResizeQuality() {
    const slider = document.getElementById('resize-quality');
    const label  = document.getElementById('resize-quality-val');
    if (!slider || !label) return;

    function updateFill() {
        const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--slider-pct', pct + '%');
        label.textContent = slider.value + '%';
    }

    slider.addEventListener('input', () => { updateFill(); updateResizeResult(); });
    updateFill(); // init
})();

/* ── Result calculation ─────────────────────────────── */
function updateResizeResult() {
    const photo   = window.__resizeGetPhoto?.();
    const inpW    = document.getElementById('resize-width');
    const inpH    = document.getElementById('resize-height');
    const mode    = window.__resizeMode?.() ?? 'pct';
    const quality = Number(document.getElementById('resize-quality')?.value ?? 90) / 100;

    const rSize    = document.getElementById('resize-result-size');
    const rFile    = document.getElementById('resize-result-filesize');
    const rEconomy = document.getElementById('resize-result-economy');
    const lblAfter = document.getElementById('resize-label-after');

    if (!photo || !photo.width || !photo.height) {
        if (rSize)    rSize.textContent    = '— × —';
        if (rFile)    rFile.textContent    = '—';
        if (rEconomy) rEconomy.textContent = '—';
        if (lblAfter) lblAfter.textContent = '';
        return;
    }

    let newW, newH;
    if (mode === 'pct') {
        const pctW = Math.max(1, Math.min(10000, Number(inpW?.value) || 70));
        const pctH = Math.max(1, Math.min(10000, Number(inpH?.value) || 70));
        newW = Math.round(photo.width  * pctW / 100);
        newH = Math.round(photo.height * pctH / 100);
    } else {
        newW = Math.max(1, Number(inpW?.value) || photo.width);
        newH = Math.max(1, Number(inpH?.value) || photo.height);
    }

    // Approximate new file size
    const origPixels = photo.width * photo.height;
    const newPixels  = newW * newH;
    const ratio      = (newPixels / origPixels) * quality;
    const newSize    = Math.round(photo.sizeBytes * ratio);
    const saved      = photo.sizeBytes - newSize;
    const savedPct   = photo.sizeBytes > 0 ? Math.round(saved / photo.sizeBytes * 100) : 0;

    if (rSize)    rSize.textContent = `${newW} × ${newH} px`;
    if (rFile)    rFile.textContent = '≈ ' + formatResizeSize(newSize);
    if (rEconomy) {
        if (saved > 0) {
            rEconomy.textContent      = `≈ ${formatResizeSize(saved)} (${savedPct}%)`;
            rEconomy.style.color      = 'var(--color-primary)';
            rEconomy.style.fontWeight = '600';
        } else {
            rEconomy.textContent      = '−';
            rEconomy.style.color      = 'var(--color-muted)';
            rEconomy.style.fontWeight = '400';
        }
    }

    // Update the "После изменения" badge in the split view
    if (lblAfter) {
        lblAfter.textContent = `${newW} × ${newH} рх • ${formatResizeSize(newSize)}`;
    }
}

function formatResizeSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    if (bytes >= 1024)        return Math.round(bytes / 1024) + ' КБ';
    return bytes + ' Б';
}

window.__updateResizeResult = updateResizeResult;

/* ── Called from app.js when a photo is selected and
      resize tab is active — loads the image into both
      split panels.                                      */
window.resizeLoadPhoto = function(photo) {
    const orig  = document.getElementById('resize-img-orig');
    const after = document.getElementById('resize-img-after');
    const lblOrig  = document.getElementById('resize-label-orig');
    const lblAfter = document.getElementById('resize-label-after');

    const src = photo?.preview || photo?.objectUrl || '';
    const hasPhoto = !!src;

    [orig, after].forEach(img => {
        if (!img) return;
        img.src   = src;
        img.style.display = hasPhoto ? 'block' : 'none';
    });

    const resText = (photo && photo.width && photo.height)
        ? `${photo.width} × ${photo.height} рх`
        : '';
    const sizeText = (photo && photo.sizeBytes)
        ? ' • ' + formatResizeSize(photo.sizeBytes)
        : '';
    if (lblOrig)  lblOrig.textContent  = resText + sizeText;

    // Placeholder graphic when no photo
    const ph = document.querySelector('.resize-split-placeholder');
    if (ph) ph.style.display = hasPhoto ? 'none' : 'flex';

    updateResizeResult();
};
