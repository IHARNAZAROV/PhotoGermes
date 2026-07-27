/* ========================================================
   colorpicker.js — Кастомный HSV-пикер цвета
   ======================================================== */
'use strict';

(function () {

    // ── Внутреннее состояние ───────────────────────────
    let H = 0, S = 0, V = 1;   // H:0-360  S:0-1  V:0-1
    let _onChange  = null;
    let _triggerEl = null;
    let _open      = false;
    let _hueReady  = false;
    let _lastSvH   = -1;   // track last hue used to draw the SV gradient

    // ── DOM-ссылки ────────────────────────────────────
    let popup, svCanvas, svCtx, svCursor,
        hueCanvas, hueCtx, hueThumb,
        previewCircle,
        rInp, gInp, bInp, hexInp, eyedropBtn;

    // ── Конвертации цвета ──────────────────────────────
    function hsvToRgb(h, s, v) {
        const i = Math.floor(h / 60) % 6;
        const f = h / 60 - Math.floor(h / 60);
        const p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
        const tbl = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]];
        const [r,g,b] = tbl[i] || tbl[0];
        return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
        let h = 0;
        const s = max ? d/max : 0, v = max;
        if (d) {
            if      (max===r) h = ((g-b)/d + (g<b?6:0)) / 6;
            else if (max===g) h = ((b-r)/d + 2) / 6;
            else              h = ((r-g)/d + 4) / 6;
        }
        return { h: h*360, s, v };
    }

    function hexToRgb(hex) {
        hex = (hex||'').replace(/^#/,'');
        if (hex.length===3) hex = hex.split('').map(c=>c+c).join('');
        const n = parseInt(hex, 16);
        return isNaN(n) ? {r:255,g:255,b:255} : {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
    }

    function rgbToHex(r,g,b) {
        return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
    }

    function clamp(n) { return Math.max(0, Math.min(255, Math.round(+n)||0)); }

    // ── Рендер SV-градиента ────────────────────────────
    function drawSv() {
        // Skip redraw if hue hasn't changed — gradient is identical
        if (_lastSvH === H) return;
        _lastSvH = H;
        const w = svCanvas.width, h = svCanvas.height;
        svCtx.fillStyle = `hsl(${H},100%,50%)`;
        svCtx.fillRect(0,0,w,h);
        const wg = svCtx.createLinearGradient(0,0,w,0);
        wg.addColorStop(0,'rgba(255,255,255,1)');
        wg.addColorStop(1,'rgba(255,255,255,0)');
        svCtx.fillStyle = wg; svCtx.fillRect(0,0,w,h);
        const bg = svCtx.createLinearGradient(0,0,0,h);
        bg.addColorStop(0,'rgba(0,0,0,0)');
        bg.addColorStop(1,'rgba(0,0,0,1)');
        svCtx.fillStyle = bg; svCtx.fillRect(0,0,w,h);
    }

    // ── Рендер радуги (однократно) ─────────────────────
    function drawHue() {
        if (_hueReady) return;
        const w = hueCanvas.width, h = hueCanvas.height;
        const g = hueCtx.createLinearGradient(0,0,w,0);
        for (let i=0; i<=6; i++) g.addColorStop(i/6, `hsl(${i*60},100%,50%)`);
        hueCtx.fillStyle = g; hueCtx.fillRect(0,0,w,h);
        _hueReady = true;
    }

    // ── Позиции курсоров ───────────────────────────────
    function moveCursor() {
        svCursor.style.left = (S * svCanvas.width)      + 'px';
        svCursor.style.top  = ((1-V) * svCanvas.height) + 'px';
    }

    function moveHueThumb() {
        hueThumb.style.left = (H / 360 * hueCanvas.width) + 'px';
    }

    // ── Полная синхронизация UI ────────────────────────
    function syncAll(emit) {
        drawSv();
        moveCursor();
        moveHueThumb();
        const {r,g,b} = hsvToRgb(H,S,V);
        const hex = rgbToHex(r,g,b);
        rInp.value   = r;
        gInp.value   = g;
        bInp.value   = b;
        hexInp.value = hex.slice(1).toUpperCase();
        previewCircle.style.background = hex;
        if (emit !== false && _onChange) _onChange(hex);
    }

    // ── Обработка перетаскивания SV ────────────────────
    let dragSv = false, dragHue = false;

    function applySv(e) {
        const r = svCanvas.getBoundingClientRect();
        S = Math.max(0, Math.min(1, (e.clientX-r.left) / r.width));
        V = Math.max(0, Math.min(1, 1-(e.clientY-r.top) / r.height));
        syncAll();
    }

    function applyHue(e) {
        const r = hueCanvas.getBoundingClientRect();
        H = Math.max(0, Math.min(360, (e.clientX-r.left) / r.width * 360));
        syncAll();
    }

    // ── Привязка событий ───────────────────────────────
    function bindEvents() {
        // SV canvas
        svCanvas.addEventListener('mousedown', e => { dragSv=true; applySv(e); e.preventDefault(); });
        // Hue canvas
        hueCanvas.addEventListener('mousedown', e => { dragHue=true; applyHue(e); e.preventDefault(); });
        // Named functions so the listeners can be removed later via removeEventListener
        function _onCpMove(e) {
            if (dragSv)  applySv(e);
            if (dragHue) applyHue(e);
        }
        function _onCpUp() { dragSv = dragHue = false; }

        document.addEventListener('mousemove', _onCpMove);
        document.addEventListener('mouseup',   _onCpUp);

        // RGB inputs
        [rInp,gInp,bInp].forEach(inp => {
            inp.addEventListener('input', () => {
                const {h,s,v} = rgbToHsv(clamp(rInp.value), clamp(gInp.value), clamp(bInp.value));
                H=h; S=s; V=v; syncAll();
            });
        });

        // HEX input
        hexInp.addEventListener('input', () => {
            const raw = hexInp.value.replace(/[^0-9a-fA-F]/g,'');
            if (raw.length === 6) {
                const {r,g,b} = hexToRgb(raw);
                const {h,s,v} = rgbToHsv(r,g,b);
                H=h; S=s; V=v; syncAll();
            }
        });
        hexInp.addEventListener('blur', () => syncAll(false)); // переформатировать

        // Пипетка
        if (window.EyeDropper) {
            eyedropBtn.addEventListener('click', async () => {
                try {
                    close();
                    const res = await new EyeDropper().open();
                    const {r,g,b} = hexToRgb(res.sRGBHex);
                    const {h,s,v} = rgbToHsv(r,g,b);
                    H=h; S=s; V=v; syncAll();
                } catch {}
            });
        } else {
            eyedropBtn.classList.add('cp-eyedrop--disabled');
        }

        // Закрытие по клику вне попапа
        document.addEventListener('mousedown', e => {
            if (!_open) return;
            if (popup.contains(e.target)) return;
            if (_triggerEl && _triggerEl.contains(e.target)) return;
            close();
        }, true);

        // Закрытие по Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && _open) close();
        });
    }

    // ── Инициализация размеров canvas ─────────────────
    function resizeCanvases() {
        const svW = svCanvas.clientWidth  || 220;
        const svH = svCanvas.clientHeight || 148;
        if (svCanvas.width !== svW || svCanvas.height !== svH) {
            svCanvas.width  = svW;
            svCanvas.height = svH;
        }
        const hW = hueCanvas.clientWidth  || 148;
        const hH = hueCanvas.clientHeight || 14;
        if (hueCanvas.width !== hW || hueCanvas.height !== hH) {
            hueCanvas.width  = hW;
            hueCanvas.height = hH;
            _hueReady = false; // перерисовать радугу
        }
    }

    // ── Позиционирование попапа ────────────────────────
    function position(anchor) {
        const ar = anchor.getBoundingClientRect();
        const pw = popup.offsetWidth  || 252;
        const ph = popup.offsetHeight || 280;
        let left = ar.left;
        let top  = ar.bottom + 8;
        if (left + pw > window.innerWidth  - 8) left = window.innerWidth  - pw - 8;
        if (top  + ph > window.innerHeight - 8) top  = ar.top - ph - 8;
        popup.style.left = Math.max(8, left) + 'px';
        popup.style.top  = Math.max(8, top)  + 'px';
    }

    // ── Публичное API ──────────────────────────────────
    function open(anchor, initialHex, onChangeCb) {
        _triggerEl = anchor;
        _onChange  = onChangeCb;

        const {r,g,b} = hexToRgb(initialHex || '#ffffff');
        const {h,s,v} = rgbToHsv(r,g,b);
        H=h; S=s; V=v;

        // Показать невидимо, чтобы измерить размеры
        popup.style.visibility = 'hidden';
        popup.style.display    = 'block';

        resizeCanvases();
        drawHue();
        syncAll(false);

        position(anchor);
        popup.style.visibility = '';
        _open = true;
    }

    function close() {
        if (!popup) return;
        popup.style.display = 'none';
        _open = false;
    }

    // ── DOMContentLoaded ──────────────────────────────
    function init() {
        popup         = document.getElementById('cp-popup');
        if (!popup) return;
        svCanvas      = document.getElementById('cp-sv-canvas');
        svCtx         = svCanvas.getContext('2d');
        svCursor      = document.getElementById('cp-sv-cursor');
        hueCanvas     = document.getElementById('cp-hue-canvas');
        hueCtx        = hueCanvas.getContext('2d');
        hueThumb      = document.getElementById('cp-hue-thumb');
        previewCircle = document.getElementById('cp-preview-circle');
        rInp          = document.getElementById('cp-r');
        gInp          = document.getElementById('cp-g');
        bInp          = document.getElementById('cp-b');
        hexInp        = document.getElementById('cp-hex');
        eyedropBtn    = document.getElementById('cp-eyedrop-btn');
        bindEvents();
    }

    window.openColorPicker  = open;
    window.closeColorPicker = close;
    document.addEventListener('DOMContentLoaded', init);

})();
