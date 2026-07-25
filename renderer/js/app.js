/* ========================================================
   app.js — UI interactions (no business logic)
   ======================================================== */

'use strict';

// ── Gallery mock data ──────────────────────────────────
const MOCK_PHOTOS = [
  { name: 'IMG_2024_1024.jpg', res: '5472 × 3648', size: '8.2 МБ', emoji: '🏔' },
  { name: 'IMG_2024_1025.jpg', res: '5472 × 3648', size: '7.1 МБ', emoji: '🌊' },
  { name: 'IMG_2024_1026.jpg', res: '5472 × 3648', size: '6.8 МБ', emoji: '🌲' },
  { name: 'IMG_2024_1027.jpg', res: '5472 × 3648', size: '9.3 МБ', emoji: '🌄' },
  { name: 'IMG_2024_1028.jpg', res: '5472 × 3648', size: '7.6 МБ', emoji: '🌃' },
  { name: 'IMG_2024_1029.jpg', res: '5472 × 3648', size: '8.9 МБ', emoji: '🏕' },
  { name: 'IMG_2024_1030.jpg', res: '4032 × 3024', size: '5.4 МБ', emoji: '🌺' },
  { name: 'IMG_2024_1031.jpg', res: '4032 × 3024', size: '6.1 МБ', emoji: '🐦' },
  { name: 'IMG_2024_1032.jpg', res: '5472 × 3648', size: '8.7 МБ', emoji: '🌅' },
  { name: 'IMG_2024_1033.jpg', res: '3840 × 2160', size: '4.9 МБ', emoji: '🌌' },
  { name: 'IMG_2024_1034.jpg', res: '5472 × 3648', size: '7.8 МБ', emoji: '🦅' },
  { name: 'IMG_2024_1035.jpg', res: '5472 × 3648', size: '8.5 МБ', emoji: '🌾' },
];

let selectedPhotoIndex = 0;

// ── Build gallery items ────────────────────────────────
function buildGallery() {
  const list = document.querySelector('.gallery-list');
  if (!list) return;

  list.innerHTML = '';

  MOCK_PHOTOS.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-item' + (i === selectedPhotoIndex ? ' selected' : '');
    item.dataset.index = i;
    item.innerHTML = `
      <div class="gallery-thumb">
        <div class="gallery-thumb-img">${photo.emoji}</div>
      </div>
      <div class="gallery-item-info">
        <div class="gallery-item-name">${photo.name}</div>
        <div class="gallery-item-meta">${photo.res} &nbsp;·&nbsp; ${photo.size}</div>
      </div>
      <button class="btn-icon gallery-item-menu" data-tooltip="Меню">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="8" cy="3" r="1" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="13" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </button>
    `;

    item.addEventListener('click', () => selectPhoto(i));
    list.appendChild(item);
  });

  updateEditorTitle();
}

function selectPhoto(index) {
  selectedPhotoIndex = index;

  document.querySelectorAll('.gallery-item').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });

  updateEditorTitle();
  updateFooter();
}

function updateEditorTitle() {
  const titleEl = document.querySelector('.editor-title');
  if (titleEl && MOCK_PHOTOS[selectedPhotoIndex]) {
    titleEl.textContent = `Редактирование: ${MOCK_PHOTOS[selectedPhotoIndex].name}`;
  }
}

function updateFooter() {
  const fileEl  = document.querySelector('.footer-file');
  const infoEl  = document.querySelector('.footer-info');
  if (fileEl)  fileEl.textContent  = MOCK_PHOTOS[selectedPhotoIndex].name;
  if (infoEl)  infoEl.textContent  = `${MOCK_PHOTOS[selectedPhotoIndex].res}  ·  ${MOCK_PHOTOS[selectedPhotoIndex].size}`;
}

// ── Tool sidebar ───────────────────────────────────────
function initToolCards() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

// ── Gallery nav ────────────────────────────────────────
function initGalleryNav() {
  document.querySelectorAll('.gallery-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.gallery-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ── Preset buttons ─────────────────────────────────────
function initPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ── Inspector tabs ─────────────────────────────────────
function initInspectorTabs() {
  const tabs   = document.querySelectorAll('.inspector-tab');
  const panels = document.querySelectorAll('.inspector-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      panels.forEach(p => {
        p.style.display = p.dataset.panel === target ? '' : 'none';
      });
    });
  });
}

// ── Sub-tabs (Текст / Изображение) ────────────────────
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

// ── Toggles ────────────────────────────────────────────
function initToggles() {
  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('on');
    });
  });
}

// ── Position grid ──────────────────────────────────────
function initPositionGrid() {
  document.querySelectorAll('.pos-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      cell.closest('.position-grid')
          .querySelectorAll('.pos-cell')
          .forEach(c => c.classList.remove('active'));
      cell.classList.add('active');
    });
  });
}

// ── Zoom slider display ────────────────────────────────
function initZoom() {
  const slider = document.getElementById('zoom-slider');
  const label  = document.getElementById('zoom-label');
  if (!slider || !label) return;
  slider.addEventListener('input', () => {
    label.textContent = slider.value + '%';
  });
}

// ── Opacity slider display ─────────────────────────────
function initOpacity() {
  const slider = document.getElementById('opacity-slider');
  const label  = document.getElementById('opacity-value');
  if (!slider || !label) return;
  slider.addEventListener('input', () => {
    label.textContent = slider.value + '%';
  });
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGallery();
  initToolCards();
  initGalleryNav();
  initPresets();
  initInspectorTabs();
  initSubTabs();
  initToggles();
  initPositionGrid();
  initZoom();
  initOpacity();
  updateFooter();
});
