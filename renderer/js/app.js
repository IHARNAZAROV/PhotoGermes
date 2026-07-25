/* ========================================================
   app.js — photo loading + multi-select + delete + UI
   ======================================================== */
'use strict';

// ── State ──────────────────────────────────────────────
/** @type {Array<Photo>} */
let photos = [];

// ── Action history (last 10 entries) ───────────────────
/** @type {Array<{type:string, label:string, time:Date}>} */
let actionHistory = [];
const HISTORY_MAX = 10;

const HISTORY_ICONS = {
    photo_load:  `<circle cx="8" cy="8" r="6"/><path d="M3 13l3-3 2 2 2.5-3L14 13"/><circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none"/>`,
    tool:        `<rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 8h6M8 5v6"/>`,
    crop:        `<path d="M3 6h9v9M6 3v9h9"/><rect x="6" y="6" width="6" height="6" stroke-dasharray="2 1.2"/>`,
    save:        `<path d="M13 13H3a1 1 0 01-1-1V3l3-1h7l2 2v8a1 1 0 01-1 1z"/><path d="M5 13V8h6v5"/><path d="M5 2v3h5V2"/>`,
    rotate:      `<path d="M14 8a6 6 0 1 0-1.2 3.6"/><polyline points="14,3.5 14,8 9.5,8"/>`,
    flip:        `<line x1="8" y1="2" x2="8" y2="14" stroke-dasharray="2.5 1.5"/><polyline points="1,6 4.5,8 1,10"/><polyline points="15,6 11.5,8 15,10"/>`,
    reset:       `<path d="M2.5 8a5.5 5.5 0 1 0 1-3.3"/><polyline points="2.5,2 2.5,5.5 6,5.5"/>`,
};

function pushHistory(type, label) {
    actionHistory.unshift({ type, label, time: new Date() });
    if (actionHistory.length > HISTORY_MAX) actionHistory.length = HISTORY_MAX;
    renderHistoryPanel();
}

function formatHistoryTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderHistoryPanel() {
    const list = document.getElementById('history-list');
    if (!list) return;

    if (actionHistory.length === 0) {
        list.innerHTML = `
          <div class="history-placeholder">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="24" cy="24" r="19"/>
              <polyline points="24,14 24,24 30,30"/>
              <path d="M10 10l4 4M38 10l-4 4"/>
            </svg>
            <p>История действий пуста.<br/>Начните редактирование — каждое действие будет сохраняться здесь.</p>
          </div>`;
        return;
    }

    list.innerHTML = actionHistory.map((entry, i) => {
        const icon = HISTORY_ICONS[entry.type] || HISTORY_ICONS.tool;
        const isFirst = i === 0;
        return `
          <div class="history-entry${isFirst ? ' history-entry--new' : ''}">
            <div class="history-entry-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                ${icon}
              </svg>
            </div>
            <div class="history-entry-body">
              <div class="history-entry-label">${entry.label}</div>
              <div class="history-entry-time">${formatHistoryTime(entry.time)}</div>
            </div>
          </div>`;
    }).join('');
}

let selectedIndex    = -1;   // photo open in editor
let checkedIndices   = new Set(); // photos checked for deletion
let lastCheckedIndex = -1;   // anchor for shift-range selection

// ── Editor transform state ──────────────────────────────
let editorRotation = 0;     // 0 | 90 | 180 | 270
let editorFlipH    = false;

// ── Undo / Redo — per-photo stacks ─────────────────────
// Each photo object carries ._undoStack and ._redoStack.
// History is isolated to the photo it belongs to, so switching
// photos never bleeds undo/redo state between images.
function photoUndoStack(photo) {
    if (!photo._undoStack) photo._undoStack = [];
    return photo._undoStack;
}
function photoRedoStack(photo) {
    if (!photo._redoStack) photo._redoStack = [];
    return photo._redoStack;
}

// ── Detect environment ─────────────────────────────────
const isElectron = typeof window.api !== 'undefined';

// ── Helpers ────────────────────────────────────────────
function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    if (bytes >= 1024)        return (bytes / 1024).toFixed(0) + ' КБ';
    return bytes + ' Б';
}
function formatRes(w, h) {
    return (w && h) ? `${w} × ${h}` : '— × —';
}

// ── Empty state ────────────────────────────────────────
function renderEmptyState() {
    const list = document.querySelector('.gallery-list');
    list.innerHTML = `
      <div class="gallery-empty">
        <div class="gallery-empty-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="8" width="32" height="26" rx="3"/>
            <path d="M4 28l8-8 6 6 5-5 9 8"/>
            <circle cx="14" cy="17" r="3"/>
            <line x1="22" y1="2" x2="22" y2="8"/>
            <line x1="18" y1="5" x2="26" y2="5"/>
          </svg>
        </div>
        <p class="gallery-empty-title">Нет фотографий</p>
        <p class="gallery-empty-hint">Нажмите «Добавить фото»<br>или перетащите файлы сюда</p>
      </div>
    `;
}

function renderEditorEmpty() {
    const placeholder = document.getElementById('editor-placeholder');
    const img = document.getElementById('editor-img');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (placeholder) placeholder.classList.remove('has-photo');
    const title = document.querySelector('.editor-title');
    if (title) title.textContent = 'Редактирование';
    const footerFile = document.querySelector('.footer-file');
    const footerInfo = document.querySelector('.footer-info');
    if (footerFile) footerFile.textContent = '—';
    if (footerInfo) footerInfo.textContent = '';
    updateSelectionUI();
}

// ── Gallery item render ────────────────────────────────
function renderGalleryItem(photo, index) {
    const item = document.createElement('div');
    const isSelected = index === selectedIndex;
    const isChecked  = checkedIndices.has(index);
    item.className = 'gallery-item'
        + (isSelected ? ' selected' : '')
        + (isChecked  ? ' checked'  : '');
    item.dataset.index = index;

    const thumbContent = photo.thumbnail
        ? `<img src="${photo.thumbnail}" alt="${photo.name}" class="gallery-thumb-real" />`
        : `<div class="gallery-thumb-spinner"></div>`;

    item.innerHTML = `
      <div class="gallery-thumb">
        ${thumbContent}
        <label class="gallery-item-check" title="Выбрать для удаления">
          <input type="checkbox" class="gallery-check-input" tabindex="-1"
                 ${isChecked ? 'checked' : ''}/>
          <span class="gallery-check-mark">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1.5,5 4,7.5 8.5,2"/>
            </svg>
          </span>
        </label>
      </div>
      <div class="gallery-item-info">
        <div class="gallery-item-name">${photo.name}</div>
        <div class="gallery-item-meta">${formatRes(photo.width, photo.height)} &nbsp;·&nbsp; ${formatSize(photo.sizeBytes)}</div>
      </div>
      <button class="btn-icon gallery-item-menu" data-tooltip="Меню" tabindex="-1">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="8" cy="3" r="1" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="13" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </button>
    `;

    // ── Click on the item body (open for editing) ──────
    item.addEventListener('click', e => {
        if (e.target.closest('.gallery-item-menu')) return;
        if (e.target.closest('.gallery-item-check'))  return; // handled by checkbox label

        if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd+click → toggle check without changing editor
            toggleCheck(index);
        } else if (e.shiftKey && lastCheckedIndex !== -1) {
            // Shift+click → range check
            checkRange(lastCheckedIndex, index);
        } else {
            // Plain click → open in editor; clear multi-selection
            if (checkedIndices.size > 0) {
                clearChecks();
            }
            selectPhoto(index);
        }
    });

    // ── Checkbox click (direct toggle) ────────────────
    // e.preventDefault() is required unconditionally: clicking a <label> that
    // wraps a <checkbox> fires the handler once on the label, then the browser
    // natively activates the input and dispatches a second click that bubbles
    // back up to this same label listener — calling toggleCheck twice and
    // reverting every change. preventDefault() suppresses that native activation.
    const checkLabel = item.querySelector('.gallery-item-check');
    checkLabel.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        if (e.shiftKey && lastCheckedIndex !== -1) {
            checkRange(lastCheckedIndex, index);
        } else {
            toggleCheck(index);
        }
    });

    return item;
}

function rebuildGallery() {
    const list = document.querySelector('.gallery-list');
    if (!list) return;

    if (photos.length === 0) {
        renderEmptyState();
        renderEditorEmpty();
        updateCounts();
        updateSelectionUI();
        return;
    }

    list.innerHTML = '';
    photos.forEach((photo, i) => list.appendChild(renderGalleryItem(photo, i)));

    updateCounts();
    updateSelectionUI();
}

/** Patch thumbnail of one item in-place */
function patchThumbnail(index) {
    const list = document.querySelector('.gallery-list');
    if (!list) return;
    const item = list.querySelector(`[data-index="${index}"]`);
    if (!item) return;
    const photo = photos[index];
    const thumb = item.querySelector('.gallery-thumb');
    if (photo.thumbnail && thumb) {
        // Replace only the image content, keep the checkbox label
        let img = thumb.querySelector('.gallery-thumb-real, .gallery-thumb-spinner');
        if (!img) img = thumb;
        const newImg = document.createElement('img');
        newImg.src = photo.thumbnail;
        newImg.alt = photo.name;
        newImg.className = 'gallery-thumb-real';
        if (img && img !== thumb) img.replaceWith(newImg);
    }
    const meta = item.querySelector('.gallery-item-meta');
    if (meta) meta.textContent = `${formatRes(photo.width, photo.height)}\u00a0·\u00a0${formatSize(photo.sizeBytes)}`;
}

// ── Multi-select logic ─────────────────────────────────
function toggleCheck(index) {
    if (checkedIndices.has(index)) {
        checkedIndices.delete(index);
    } else {
        checkedIndices.add(index);
    }
    lastCheckedIndex = index;
    syncItemCheckedClass(index);
    updateSelectionUI();
}

function checkRange(from, to) {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let i = lo; i <= hi; i++) checkedIndices.add(i);
    lastCheckedIndex = to;
    // Rebuild DOM to reflect new checked state efficiently
    rebuildGallery();
    updateSelectionUI();
}

function checkAll() {
    photos.forEach((_, i) => checkedIndices.add(i));
    lastCheckedIndex = photos.length - 1;
    rebuildGallery();
    updateSelectionUI();
}

function clearChecks() {
    checkedIndices.clear();
    lastCheckedIndex = -1;
    rebuildGallery();
    updateSelectionUI();
}

/** Sync checked CSS class + checkbox input for a single item without full rebuild */
function syncItemCheckedClass(index) {
    const list = document.querySelector('.gallery-list');
    if (!list) return;
    const item = list.querySelector(`[data-index="${index}"]`);
    if (!item) return;
    const isChecked = checkedIndices.has(index);
    item.classList.toggle('checked', isChecked);
    const input = item.querySelector('.gallery-check-input');
    if (input) input.checked = isChecked;
}

// ── Selection UI (header + footer delete button) ───────
function updateSelectionUI() {
    const count   = checkedIndices.size;
    const total   = photos.length;
    // Button is active when checkboxes are ticked OR a photo is open in the editor
    const canDelete = count > 0 || selectedIndex >= 0;

    // Select-all checkbox
    const selectAllCb = document.getElementById('gallery-select-all');
    if (selectAllCb) {
        selectAllCb.checked       = count > 0 && count === total;
        selectAllCb.indeterminate = count > 0 && count < total;
    }

    // Selection bar — visible only when checkboxes are ticked
    const selBar   = document.getElementById('gallery-sel-bar');
    const selCount = document.getElementById('gallery-sel-count');
    if (selBar) selBar.classList.toggle('visible', count > 0);
    if (selCount) {
        selCount.textContent = count === 1
            ? '1 фото выбрано'
            : `${count} фото выбрано`;
    }

    // Delete button
    const deleteBtn = document.getElementById('btn-delete-checked');
    const deleteLbl = document.getElementById('delete-btn-label');
    if (deleteBtn) {
        deleteBtn.disabled = !canDelete;
        // Red highlight only when explicit checkboxes are ticked
        deleteBtn.classList.toggle('has-selection', count > 0);
    }
    if (deleteLbl) {
        if (count > 1)        deleteLbl.textContent = `Удалить (${count})`;
        else if (count === 1) deleteLbl.textContent = 'Удалить (1)';
        else                  deleteLbl.textContent = 'Удалить';
    }

    // Apply button label
    updateApplyBtn();

    // Footer selected text
    const footerSel = document.querySelector('.footer-selected');
    if (footerSel) {
        if (count > 0) {
            footerSel.textContent = count === 1
                ? 'Отмечено: 1 фото'
                : `Отмечено: ${count} фото`;
        } else if (selectedIndex >= 0) {
            footerSel.textContent = 'Выбрано: 1 фото';
        } else {
            footerSel.textContent = 'Ничего не выбрано';
        }
    }
}

// ── Delete ─────────────────────────────────────────────
function deleteChecked() {
    // If no checkboxes ticked but a photo is open → delete just that one
    if (checkedIndices.size === 0) {
        if (selectedIndex < 0) return;
        checkedIndices.add(selectedIndex);
    }

    const deletedCount = checkedIndices.size;

    // Revoke objectURLs for browser mode
    checkedIndices.forEach(i => {
        const p = photos[i];
        if (p && p.objectUrl) URL.revokeObjectURL(p.objectUrl);
    });

    // Remove photos (highest index first to keep indices stable)
    const sorted = [...checkedIndices].sort((a, b) => b - a);
    sorted.forEach(i => photos.splice(i, 1));

    // Fix selectedIndex after deletion
    if (selectedIndex >= 0) {
        if (checkedIndices.has(selectedIndex)) {
            // The viewed photo was deleted → pick nearest surviving photo
            const newIndex = findNearestSurvivingIndex(sorted);
            selectedIndex = -1;
            checkedIndices.clear();
            lastCheckedIndex = -1;
            rebuildGallery();
            if (newIndex >= 0) selectPhoto(Math.min(newIndex, photos.length - 1));
            else renderEditorEmpty();
        } else {
            // Remap selectedIndex: count how many deleted indices are below it
            const below = sorted.filter(i => i < selectedIndex).length;
            selectedIndex -= below;
            checkedIndices.clear();
            lastCheckedIndex = -1;
            rebuildGallery();
        }
    } else {
        checkedIndices.clear();
        lastCheckedIndex = -1;
        rebuildGallery();
    }

    updateCounts();
    showToast(`${deletedCount} ${pluralPhoto(deletedCount)} удалено`);
}

function findNearestSurvivingIndex(sortedDeleted) {
    // sortedDeleted is DESC; original selectedIndex is in it
    // Find the smallest index not in deleted set that was >= selectedIndex
    const deletedSet = new Set(sortedDeleted);
    for (let i = selectedIndex; i < photos.length + sortedDeleted.length; i++) {
        if (!deletedSet.has(i)) return i;
    }
    for (let i = selectedIndex - 1; i >= 0; i--) {
        if (!deletedSet.has(i)) return i;
    }
    return -1;
}

function pluralPhoto(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'фото';
    if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'фото';
    return 'фото';
}

// ── Toast notification ─────────────────────────────────
function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('toast-hide');
    toast.classList.add('toast-show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
    }, 2500);
}

// ── Keyboard shortcuts ─────────────────────────────────
function initKeyboard() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        // Delete / Backspace → delete checked (or selected if none checked)
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (checkedIndices.size > 0 || selectedIndex >= 0) {
                e.preventDefault();
                deleteChecked();
            }
        }

        // Ctrl+Z → undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            doUndo();
        }

        // Ctrl+Y / Ctrl+Shift+Z → redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            doRedo();
        }

        // Ctrl+S → save; Ctrl+Shift+S → save as
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (e.shiftKey) doSaveAs();
            else            doSave();
        }

        // Ctrl+A → select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            if (photos.length > 0) {
                e.preventDefault();
                checkAll();
            }
        }

        // Escape → clear selection
        if (e.key === 'Escape' && checkedIndices.size > 0) {
            clearChecks();
        }

        // Arrow Up/Down → navigate selected photo
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            if (selectedIndex < photos.length - 1) selectPhoto(selectedIndex + 1);
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            if (selectedIndex > 0) selectPhoto(selectedIndex - 1);
        }
    });
}

// ── View photo in editor ───────────────────────────────
async function selectPhoto(index) {
    selectedIndex = index;

    document.querySelectorAll('.gallery-item').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });

    const photo = photos[index];
    if (!photo) return;

    const titleEl    = document.querySelector('.editor-title');
    const footerFile = document.querySelector('.footer-file');
    const footerInfo = document.querySelector('.footer-info');
    const footerSel  = document.querySelector('.footer-selected');

    if (titleEl)    titleEl.textContent    = `Редактирование: ${photo.name}`;
    if (footerFile) footerFile.textContent = photo.name;
    if (footerInfo) footerInfo.textContent = `${formatRes(photo.width, photo.height)}  ·  ${formatSize(photo.sizeBytes)}`;
    updateSelectionUI();

    // Restore this photo's own transform state (each photo remembers its own)
    editorRotation = photo._rotation ?? 0;
    editorFlipH    = photo._flipH    ?? false;
    applyEditorTransform();
    updateUndoRedoBtns();

    const wInput = document.getElementById('frame-width');
    const hInput = document.getElementById('frame-height');
    if (wInput && photo.width)  wInput.value = photo.width;
    if (hInput && photo.height) hInput.value = photo.height;

    await loadEditorPreview(photo);

    // If resize tab is active, refresh the split-view preview
    if (activeTool === 'resize') {
        window.resizeLoadPhoto?.(photo);
    }

    const list = document.querySelector('.gallery-list');
    const item = list && list.querySelector(`[data-index="${index}"]`);
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function loadEditorPreview(photo) {
    const placeholder = document.getElementById('editor-placeholder');
    const img = document.getElementById('editor-img');
    if (!img || !placeholder) return;

    placeholder.classList.add('loading');
    img.style.display = 'none';

    let src = null;
    if (isElectron && photo.filePath) {
        if (!photo.preview) photo.preview = await window.api.getPreview(photo.filePath);
        src = photo.preview;
    } else {
        // In browser mode prefer photo.preview (updated after crop) over the
        // original objectUrl so the editor always shows the latest version.
        src = photo.preview || photo.objectUrl;
    }

    placeholder.classList.remove('loading');

    if (src) {
        img.src = src;
        img.style.display = 'block';
        placeholder.classList.add('has-photo');
    } else {
        img.src = '';
        img.style.display = 'none';
        placeholder.classList.remove('has-photo');
    }
}

// ── Add photos ─────────────────────────────────────────
async function openPhotos() {
    if (isElectron) {
        const paths = await window.api.openPhotos();
        if (!paths || paths.length === 0) return;
        await addPhotosByPath(paths);
    } else {
        document.getElementById('file-input').click();
    }
}

async function addPhotosByPath(filePaths) {
    const existing  = new Set(photos.map(p => p.filePath));
    const newPaths  = filePaths.filter(p => !existing.has(p));
    if (newPaths.length === 0) return;

    const startIndex = photos.length;
    newPaths.forEach(filePath => photos.push({
        name: filePath.split(/[\\/]/).pop(),
        filePath, width: 0, height: 0, sizeBytes: 0,
        thumbnail: null, preview: null, objectUrl: null
    }));

    rebuildGallery();
    if (selectedIndex === -1) selectPhoto(startIndex);

    newPaths.forEach(fp => pushHistory('photo_load', 'Загрузка фото: ' + fp.split(/[\\/]/).pop()));

    await Promise.all(newPaths.map(async (filePath, offset) => {
        const idx = startIndex + offset;
        const [info, thumbnail] = await Promise.all([
            window.api.getInfo(filePath),
            window.api.getThumbnail(filePath)
        ]);
        if (info) {
            photos[idx].width     = info.width;
            photos[idx].height    = info.height;
            photos[idx].sizeBytes = info.sizeBytes;
        }
        if (thumbnail) photos[idx].thumbnail = thumbnail;
        patchThumbnail(idx);
        if (idx === selectedIndex) {
            const footerInfo = document.querySelector('.footer-info');
            if (footerInfo) footerInfo.textContent = `${formatRes(photos[idx].width, photos[idx].height)}  ·  ${formatSize(photos[idx].sizeBytes)}`;
            await loadEditorPreview(photos[idx]);
            if (activeTool === 'resize') window.resizeLoadPhoto?.(photos[idx]);
        }
    }));
    updateCounts();
}

async function handleFileInput(files) {
    if (!files || files.length === 0) return;
    const existing  = new Set(photos.map(p => p.name + p.sizeBytes));
    const newFiles  = Array.from(files).filter(f => !existing.has(f.name + f.size));
    if (newFiles.length === 0) return;

    const startIndex = photos.length;
    newFiles.forEach(file => photos.push({
        name: file.name, filePath: null,
        width: 0, height: 0, sizeBytes: file.size,
        thumbnail: null, preview: null,
        objectUrl: URL.createObjectURL(file), _file: file
    }));

    rebuildGallery();
    if (selectedIndex === -1) selectPhoto(startIndex);

    newFiles.forEach(f => pushHistory('photo_load', 'Загрузка фото: ' + f.name));

    await Promise.all(newFiles.map(async (file, offset) => {
        const idx   = startIndex + offset;
        const photo = photos[idx];
        const dataUrl = await readFileThumbnail(file);
        if (dataUrl) {
            const { w, h } = await getImageDimensions(photo.objectUrl);
            photo.thumbnail = dataUrl;
            photo.width     = w;
            photo.height    = h;
            photo.preview   = photo.objectUrl;
        }
        patchThumbnail(idx);
        if (idx === selectedIndex) {
            const footerInfo = document.querySelector('.footer-info');
            if (footerInfo) footerInfo.textContent = `${formatRes(photo.width, photo.height)}  ·  ${formatSize(photo.sizeBytes)}`;
            await loadEditorPreview(photo);
            // Now that real dimensions are known, refresh resize split-view
            if (activeTool === 'resize') window.resizeLoadPhoto?.(photo);
        }
    }));
    updateCounts();
}

function readFileThumbnail(file) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio  = Math.max(160 / img.width, 120 / img.height);
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

function getImageDimensions(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = src;
    });
}

// ── Counts ─────────────────────────────────────────────
function updateCounts() {
    const count = photos.length;
    const galleryCount = document.querySelector('.gallery-count');
    if (galleryCount) galleryCount.textContent = `(${count})`;
    const allBadge = document.querySelector('[data-nav="all"] .gallery-nav-badge');
    if (allBadge) allBadge.textContent = count;
}

// ── Apply button label / icon ───────────────────────────
const ICON_SINGLE = `<rect x="2" y="2" width="12" height="12" rx="2"/><polyline points="5,8 7,10.5 11,6"/>`;
const ICON_MULTI  = `<rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>`;

function updateApplyBtn() {
    const lbl  = document.getElementById('apply-btn-label');
    const icon = document.getElementById('apply-btn-icon');
    if (!lbl || !icon) return;

    const n = checkedIndices.size;
    if (n >= 2) {
        lbl.textContent  = `Применить ко всем`;
        icon.innerHTML   = ICON_MULTI;
    } else {
        lbl.textContent  = 'Применить';
        icon.innerHTML   = ICON_SINGLE;
    }
}

// ── Drag & drop ────────────────────────────────────────
function initDragDrop() {
    const gallery = document.querySelector('.app-gallery');
    if (!gallery) return;
    gallery.addEventListener('dragover', e => { e.preventDefault(); gallery.classList.add('drag-over'); });
    gallery.addEventListener('dragleave', () => gallery.classList.remove('drag-over'));
    gallery.addEventListener('drop', async e => {
        e.preventDefault();
        gallery.classList.remove('drag-over');
        const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
        if (!files.length) return;
        if (isElectron) {
            const paths = files.map(f => f.path).filter(Boolean);
            if (paths.length) await addPhotosByPath(paths);
        } else {
            await handleFileInput(files);
        }
    });
}

// ── UI init helpers ────────────────────────────────────
function switchToTool(toolName) {
    const cropEditorView   = document.getElementById('crop-editor-view');
    const resizeEditorView = document.getElementById('resize-editor-view');
    const cropInspector    = document.getElementById('crop-inspector-view');
    const resizeInspector  = document.getElementById('resize-inspector-view');

    const isResize = toolName === 'resize';
    // All tools except resize fall back to showing the crop/default editor view
    const showCrop = !isResize;

    if (cropEditorView)   cropEditorView.style.display   = showCrop  ? 'contents' : 'none';
    if (resizeEditorView) resizeEditorView.style.display  = isResize  ? 'flex'     : 'none';
    if (cropInspector)    cropInspector.style.display    = showCrop  ? 'contents' : 'none';
    if (resizeInspector)  resizeInspector.style.display  = isResize  ? 'flex'     : 'none';

    // Load the current photo into the resize split-view when switching to it
    if (isResize && selectedIndex >= 0 && photos[selectedIndex]) {
        window.resizeLoadPhoto?.(photos[selectedIndex]);
    }
}

let activeTool = 'crop';

function initToolCards() {
    const toolCards = document.querySelectorAll('.tool-card');
    const toolNames = ['crop', 'resize', 'watermark', 'batch', 'export'];

    toolCards.forEach((card, idx) => {
        card.addEventListener('click', () => {
            toolCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            activeTool = toolNames[idx] ?? 'crop';
            switchToTool(activeTool);
        });
    });
}

function initGalleryNav() {
    document.querySelectorAll('.gallery-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.gallery-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function initPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function initInspectorTabs() {
    const tabs   = document.querySelectorAll('.inspector-tab');
    const panels = document.querySelectorAll('.inspector-panel');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            panels.forEach(p => { p.style.display = p.dataset.panel === target ? '' : 'none'; });
        });
    });
}

function initSubTabs() {
    document.querySelectorAll('.sub-tabs').forEach(group => {
        group.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                group.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    });
}

function initToggles() {
    document.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', () => t.classList.toggle('on')));
}

function initPositionGrid() {
    document.querySelectorAll('.pos-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            cell.closest('.position-grid').querySelectorAll('.pos-cell').forEach(c => c.classList.remove('active'));
            cell.classList.add('active');
        });
    });
}

function initOpacity() {
    const slider = document.getElementById('opacity-slider');
    const label  = document.getElementById('opacity-value');
    if (slider && label) slider.addEventListener('input', () => { label.textContent = slider.value + '%'; });
}

function initAddPhotoButtons() {
    document.querySelectorAll('[data-action="add-photos"]').forEach(btn => {
        btn.addEventListener('click', openPhotos);
    });
    const input = document.getElementById('file-input');
    if (input) {
        input.addEventListener('change', async () => {
            await handleFileInput(input.files);
            input.value = '';
        });
    }
}

function initDeleteButton() {
    const btn = document.getElementById('btn-delete-checked');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (checkedIndices.size > 0 || selectedIndex >= 0) deleteChecked();
    });
}

function initSelectAllCheckbox() {
    const cb = document.getElementById('gallery-select-all');
    if (!cb) return;
    cb.addEventListener('change', () => {
        if (cb.checked) checkAll();
        else clearChecks();
    });
}

function initClearSelectionBtn() {
    const btn = document.getElementById('btn-clear-selection');
    if (!btn) return;
    btn.addEventListener('click', clearChecks);
}

// ── Crop apply ─────────────────────────────────────────

/**
 * Crop a photo in-place using Canvas.
 * @param {object} photo  - photo object from the photos[] array
 * @param {{ x, y, x2, y2 }} norm - fractions [0-1] of source image
 * @returns {Promise<boolean>}
 */
function applyCropToPhotoCanvas(photo, norm) {
    return new Promise(resolve => {
        const src = photo.preview || photo.objectUrl;
        if (!src || !photo.width || !photo.height) { resolve(false); return; }

        const img = new Image();
        img.onload = () => {
            const srcX = Math.round(norm.x  * img.naturalWidth);
            const srcY = Math.round(norm.y  * img.naturalHeight);
            const srcW = Math.round(norm.x2 * img.naturalWidth)  - srcX;
            const srcH = Math.round(norm.y2 * img.naturalHeight) - srcY;

            if (srcW < 1 || srcH < 1) { resolve(false); return; }

            // Full-res cropped canvas
            const canvas    = document.createElement('canvas');
            canvas.width    = srcW;
            canvas.height   = srcH;
            canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

            photo.preview   = canvas.toDataURL('image/jpeg', 0.92);
            photo.width     = srcW;
            photo.height    = srcH;
            // Approximate byte size from base64 length
            photo.sizeBytes = Math.round((photo.preview.length - 22) * 0.75);

            // Thumbnail
            const tc    = document.createElement('canvas');
            const ratio = Math.max(160 / srcW, 120 / srcH);
            tc.width    = Math.round(srcW * ratio);
            tc.height   = Math.round(srcH * ratio);
            tc.getContext('2d').drawImage(canvas, 0, 0, tc.width, tc.height);
            photo.thumbnail = tc.toDataURL('image/jpeg', 0.75);

            resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

/** Apply current crop frame to the photo currently open in the editor. */
async function applyCropCurrent() {
    if (selectedIndex < 0) {
        showToast('Откройте фото для обрезки');
        return;
    }
    const photo = photos[selectedIndex];
    const norm  = window.cropGetNormalized?.(photo.width, photo.height);
    if (!norm || (norm.x2 - norm.x) < 0.01 || (norm.y2 - norm.y) < 0.01) {
        showToast('Рамка обрезки слишком маленькая');
        return;
    }

    pushUndo();
    const ok = await applyCropToPhotoCanvas(photo, norm);
    if (!ok) { photoUndoStack(photo).pop(); updateUndoRedoBtns(); showToast('Не удалось применить обрезку'); return; }

    patchThumbnail(selectedIndex);
    await loadEditorPreview(photo);
    const footerInfo = document.querySelector('.footer-info');
    if (footerInfo) footerInfo.textContent =
        `${formatRes(photo.width, photo.height)}\u00a0·\u00a0${formatSize(photo.sizeBytes)}`;
    pushHistory('crop', 'Обрезка применена: ' + photo.name);
    showToast('Обрезка применена');
}

/**
 * Main "Применить" click handler.
 * — If ≥2 photos are checked → apply to those checked photos.
 * — Otherwise → apply to the currently open photo only.
 */
async function applyMain() {
    if (checkedIndices.size >= 2) {
        await applyToChecked();
    } else {
        await applyCropCurrent();
    }
}

/** Apply the current crop frame to every checked photo. */
async function applyToChecked() {
    if (selectedIndex < 0) { showToast('Откройте фото, чтобы задать обрезку'); return; }

    const refPhoto = photos[selectedIndex];
    const norm     = window.cropGetNormalized?.(refPhoto.width, refPhoto.height);
    if (!norm || (norm.x2 - norm.x) < 0.01 || (norm.y2 - norm.y) < 0.01) {
        showToast('Рамка обрезки слишком маленькая');
        return;
    }

    const btn = document.getElementById('btn-apply-all');
    if (btn) btn.disabled = true;

    const targets = [...checkedIndices].map(i => photos[i]).filter(Boolean);
    await Promise.all(targets.map(p => applyCropToPhotoCanvas(p, norm)));

    rebuildGallery();
    if (selectedIndex >= 0) {
        await loadEditorPreview(photos[selectedIndex]);
        const footerInfo = document.querySelector('.footer-info');
        const p = photos[selectedIndex];
        if (footerInfo) footerInfo.textContent =
            `${formatRes(p.width, p.height)}\u00a0·\u00a0${formatSize(p.sizeBytes)}`;
    }
    updateCounts();
    if (btn) btn.disabled = false;
    pushHistory('crop', `Обрезка применена к ${targets.length} фото`);
    showToast(`Обрезка применена к ${targets.length} фото`);
}

function initCropButtons() {
    const applyOne = document.getElementById('btn-apply-crop');
    if (applyOne) applyOne.addEventListener('click', applyCropCurrent);

    const applyAll = document.getElementById('btn-apply-all');
    if (applyAll) applyAll.addEventListener('click', applyMain);
}

// ── Save / Save As ──────────────────────────────────────

/** Convert a data-URL to a Blob. */
function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(',');
    const mime  = header.match(/:(.*?);/)[1];
    const bytes = atob(data);
    const arr   = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

/** Trigger a browser file download. */
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Return a data-URL for the current state of `photo`.
 * Uses photo.preview if available (set after edits), otherwise reads the
 * original File / objectUrl.
 */
async function getPhotoDataUrl(photo) {
    if (photo.preview) return photo.preview;
    if (photo.objectUrl) {
        const response = await fetch(photo.objectUrl);
        const blob     = await response.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }
    return null;
}

/** Re-encode a data-URL as a different MIME type using Canvas. */
function reencodeAs(dataUrl, mimeType) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL(mimeType, 0.92));
        };
        img.src = dataUrl;
    });
}

/**
 * Save — overwrite the original file (Electron) or download with the
 * same filename (browser). Standard Ctrl+S behaviour.
 */
async function doSave() {
    if (selectedIndex < 0) { showToast('Откройте фото для сохранения'); return; }
    const photo = photos[selectedIndex];

    try {
        if (isElectron && photo.filePath) {
            if (typeof window.api?.savePhoto !== 'function') {
                showToast('Перезапустите приложение — требуется обновление');
                return;
            }
            // Pass edited dataUrl only if the photo was actually modified;
            // otherwise pass null so the IPC handler leaves the original file intact.
            const hasEdits = photoUndoStack(photo).length > 0;
            const dataUrl  = hasEdits ? (photo.preview ?? await getPhotoDataUrl(photo)) : null;

            const result = await window.api.savePhoto(photo.filePath, dataUrl);
            if (result?.ok) {
                pushHistory('save', 'Сохранено: ' + photo.name);
                showToast('Файл сохранён');
            } else if (result?.readonly) {
                // File is write-protected or locked — fall back to Save As
                showToast('Файл защищён от записи — выберите путь для сохранения');
                await doSaveAs();
            } else {
                showToast('Ошибка: ' + (result?.error ?? 'не удалось сохранить'));
            }
        } else {
            // Browser: download with the same filename
            const dataUrl = await getPhotoDataUrl(photo);
            if (!dataUrl) { showToast('Нет данных для сохранения'); return; }
            triggerDownload(dataUrlToBlob(dataUrl), photo.name);
            pushHistory('save', 'Сохранено: ' + photo.name);
            showToast('Файл сохранён');
        }
    } catch (err) {
        showToast('Ошибка сохранения: ' + err.message);
        console.error('[save]', err);
    }
}

/**
 * Save As — native dialog (Electron) or showSaveFilePicker / download
 * fallback (browser). Standard Ctrl+Shift+S behaviour.
 */
async function doSaveAs() {
    if (selectedIndex < 0) { showToast('Откройте фото для сохранения'); return; }
    const photo = photos[selectedIndex];

    try {
        if (isElectron) {
            if (typeof window.api?.savePhotoAs !== 'function') {
                showToast('Перезапустите приложение — требуется обновление');
                return;
            }
            // If edits exist, send the edited preview; otherwise send null so
            // the main process copies the original file at full resolution.
            const hasEdits = photoUndoStack(photo).length > 0;
            const dataUrl  = hasEdits ? (photo.preview ?? await getPhotoDataUrl(photo)) : null;

            const result = await window.api.savePhotoAs(photo.name, dataUrl, photo.filePath);
            if (!result) return; // user cancelled dialog
            if (result.ok === false) { showToast('Ошибка: ' + result.error); return; }

            photo.filePath = result.filePath;
            photo.name     = result.name;
            rebuildGallery();
            pushHistory('save', 'Сохранено как: ' + result.name);
            showToast('Сохранено: ' + result.name);
            return;
        }

        // ── Browser ──────────────────────────────────────────
        const dataUrl = await getPhotoDataUrl(photo);
        if (!dataUrl) { showToast('Нет данных для сохранения'); return; }
        await browserSaveAs(photo, dataUrl);

    } catch (err) {
        showToast('Ошибка сохранения: ' + err.message);
        console.error('[save-as]', err);
    }
}

function initSaveButtons() {
    document.querySelector('[data-action="save"]')
        ?.addEventListener('click', doSave);
    document.querySelector('[data-action="save-as"]')
        ?.addEventListener('click', doSaveAs);
}

// ── Undo / Redo core (per-photo) ───────────────────────
/**
 * Snapshot the current state of `photo` plus the current editor transforms.
 * The snapshot belongs entirely to that photo and is restored against it.
 */
function snapshotPhoto(photo) {
    return {
        rotation:  editorRotation,
        flipH:     editorFlipH,
        preview:   photo.preview,
        width:     photo.width,
        height:    photo.height,
        sizeBytes: photo.sizeBytes,
        thumbnail: photo.thumbnail,
    };
}

/** Push a snapshot for the currently selected photo onto its undo stack. */
function pushUndo() {
    if (selectedIndex < 0) return;
    const photo = photos[selectedIndex];
    if (!photo) return;
    photoUndoStack(photo).push(snapshotPhoto(photo));
    // Any new action clears the redo branch for this photo
    photo._redoStack = [];
    updateUndoRedoBtns();
}

async function doUndo() {
    if (selectedIndex < 0) return;
    const photo = photos[selectedIndex];
    if (!photo) return;
    const uStack = photoUndoStack(photo);
    if (!uStack.length) return;
    // Save current state for redo
    photoRedoStack(photo).push(snapshotPhoto(photo));
    const prev = uStack.pop();
    await restorePhotoSnapshot(photo, prev);
    updateUndoRedoBtns();
}

async function doRedo() {
    if (selectedIndex < 0) return;
    const photo = photos[selectedIndex];
    if (!photo) return;
    const rStack = photoRedoStack(photo);
    if (!rStack.length) return;
    // Save current state for undo
    photoUndoStack(photo).push(snapshotPhoto(photo));
    const next = rStack.pop();
    await restorePhotoSnapshot(photo, next);
    updateUndoRedoBtns();
}

/** Apply a snapshot to a specific photo (must already be selected). */
async function restorePhotoSnapshot(photo, snap) {
    editorRotation = snap.rotation;
    editorFlipH    = snap.flipH;
    photo.preview   = snap.preview;
    photo.width     = snap.width;
    photo.height    = snap.height;
    photo.sizeBytes = snap.sizeBytes;
    photo.thumbnail = snap.thumbnail;

    patchThumbnail(selectedIndex);
    await loadEditorPreview(photo);
    applyEditorTransform();

    const footerInfo = document.querySelector('.footer-info');
    if (footerInfo)
        footerInfo.textContent =
            `${formatRes(photo.width, photo.height)}\u00a0·\u00a0${formatSize(photo.sizeBytes)}`;
}

/** Reflect the currently-selected photo's history in the toolbar buttons. */
function updateUndoRedoBtns() {
    const photo   = selectedIndex >= 0 ? photos[selectedIndex] : null;
    const canUndo = photo ? photoUndoStack(photo).length > 0 : false;
    const canRedo = photo ? photoRedoStack(photo).length > 0 : false;
    const undoBtn = document.querySelector('[data-action="undo"]');
    const redoBtn = document.querySelector('[data-action="redo"]');
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
}

function initUndoRedo() {
    const undoBtn = document.querySelector('[data-action="undo"]');
    const redoBtn = document.querySelector('[data-action="redo"]');
    if (undoBtn) undoBtn.addEventListener('click', doUndo);
    if (redoBtn) redoBtn.addEventListener('click', doRedo);
}

// ── JS Tooltip system (position:fixed so no overflow:hidden clipping) ──
function initTooltips() {
    const tip = document.createElement('div');
    tip.id = 'app-tooltip';
    document.body.appendChild(tip);

    let current = null;

    function show(el) {
        const text = el.dataset.tooltip;
        if (!text) return;
        current = el;
        tip.textContent = text;
        tip.style.display = 'block';
        positionTip(el);
    }

    function hide() {
        tip.style.display = 'none';
        current = null;
    }

    function positionTip(el) {
        const rect = el.getBoundingClientRect();
        // Measure after making visible
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let top  = rect.top - th - 6;
        let left = rect.left + rect.width / 2 - tw / 2;

        // If it would go above the viewport, show below instead
        if (top < 4) top = rect.bottom + 6;
        // Clamp horizontally within viewport
        if (left < 4) left = 4;
        if (left + tw > window.innerWidth - 4) left = window.innerWidth - 4 - tw;

        tip.style.top  = top  + 'px';
        tip.style.left = left + 'px';
    }

    document.addEventListener('mouseover', e => {
        const el = e.target.closest('[data-tooltip]');
        if (el) show(el); else hide();
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('[data-tooltip]')) hide();
    });
    document.addEventListener('click', hide);
    document.addEventListener('scroll', hide, true);
}

// ── Editor transform ────────────────────────────────────
function applyEditorTransform() {
    const img = document.getElementById('editor-img');
    if (!img) return;
    // Combine rotation and horizontal flip into one transform
    const t = `rotate(${editorRotation}deg) scaleX(${editorFlipH ? -1 : 1})`;
    img.style.transform = t;

    // Visual hint on the placeholder background too (CSS class)
    const placeholder = document.getElementById('editor-placeholder');
    if (placeholder) {
        placeholder.dataset.rotation = editorRotation;
        placeholder.classList.toggle('flip-h', editorFlipH);
    }

    // Persist transform back to the photo object so switching photos
    // and returning later restores the correct orientation.
    if (selectedIndex >= 0 && photos[selectedIndex]) {
        photos[selectedIndex]._rotation = editorRotation;
        photos[selectedIndex]._flipH    = editorFlipH;
    }
}

function rotateEditor(dir) {
    // dir: +1 = clockwise 90°, -1 = counter-clockwise 90°
    pushUndo();
    editorRotation = ((editorRotation + dir * 90) % 360 + 360) % 360;
    applyEditorTransform();
    pushHistory('rotate', dir > 0 ? 'Поворот вправо на 90°' : 'Поворот влево на 90°');
}

function flipEditorH() {
    pushUndo();
    editorFlipH = !editorFlipH;
    applyEditorTransform();
    pushHistory('flip', 'Отражение по горизонтали');
}

function resetEditorTransform() {
    pushUndo();
    editorRotation = 0;
    editorFlipH    = false;
    applyEditorTransform();
    pushHistory('reset', 'Сброс трансформации');
}

function initEditorTransformButtons() {
    // Header icon buttons
    const map = {
        'Повернуть влево':         () => rotateEditor(-1),
        'Повернуть вправо':        () => rotateEditor(1),
        'Отразить горизонтально':  () => flipEditorH(),
        'Сбросить':                () => resetEditorTransform(),
    };
    Object.entries(map).forEach(([tooltip, handler]) => {
        document.querySelectorAll(`[data-tooltip="${tooltip}"]`)
            .forEach(btn => btn.addEventListener('click', handler));
    });

    // Bottom toolbar preset-action buttons
    document.querySelectorAll('.preset-action').forEach(btn => {
        const label = btn.querySelector('.preset-action-label')?.textContent?.trim();
        if (label === 'Повернуть') btn.addEventListener('click', () => rotateEditor(1));
        if (label === 'Отразить')  btn.addEventListener('click', () => flipEditorH());
        // 'Сбросить' in crop.js handles crop reset; we also reset transform
        if (label === 'Сбросить')  btn.addEventListener('click', () => resetEditorTransform());
    });
}

// ── About modal ────────────────────────────────────────
function initAboutModal() {
    const modal    = document.getElementById('about-modal');
    const openBtn  = document.querySelector('[data-action="about"]');
    const closeBtn = document.getElementById('about-close');
    const closeFtr = document.getElementById('about-close-btn');
    if (!modal) return;

    function open()  { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { modal.classList.remove('open'); document.body.style.overflow = ''; }

    if (openBtn)  openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (closeFtr) closeFtr.addEventListener('click', close);

    // Close on backdrop click
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    // Close on Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
}

// ── Expose current photo for resize.js ─────────────────
window.__resizeGetPhoto = function() {
    return selectedIndex >= 0 ? photos[selectedIndex] : null;
};

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderEmptyState();
    renderEditorEmpty();
    updateCounts();
    updateSelectionUI();

    initAddPhotoButtons();
    initDeleteButton();
    initSelectAllCheckbox();
    initClearSelectionBtn();
    initDragDrop();
    initKeyboard();
    initToolCards();
    initGalleryNav();
    initPresets();
    initInspectorTabs();
    initSubTabs();
    initToggles();
    initPositionGrid();
    initOpacity();
    initEditorTransformButtons();
    initCropButtons();
    initSaveButtons();
    initUndoRedo();
    initTooltips();
    updateUndoRedoBtns();
    initAboutModal();
});
