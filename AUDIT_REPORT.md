# Аудит PhotoGermes

Дата: 2026-07-28

## Область проверки

Проверены Electron main/preload слой, renderer JavaScript, HTML/CSS структура, npm-скрипты и базовая безопасность IPC.

## Ключевые выводы

### Критичные / высокие

1. **XSS/DOM injection через имена файлов.** В `renderGalleryItem` имя файла вставляется в `innerHTML` без экранирования. Файл с именем, содержащим HTML, может ломать разметку или выполнить обработчики в renderer-процессе. Рекомендуется использовать `escapeHtml(photo.name)` или сборку DOM через `textContent`.
2. **IPC принимает произвольные пути из renderer.** Методы `photos:get-info`, `photos:get-thumbnail`, `photos:get-preview`, `photos:save`, `photos:resize`, `photos:export`, `photos:save-as` доверяют путям/данным, пришедшим из preload API. При XSS это превращается в риск чтения/перезаписи файлов. Рекомендуется хранить whitelist выбранных пользователем путей в main-процессе и проверять все IPC-операции по токену/ID фото.
3. **Потеря качества и метаданных при сохранении.** Preview создаётся максимум 1200×900 и как JPEG, а затем может быть перезаписан поверх исходника. Нужно разделить экранный preview и full-resolution processing pipeline; сохранять/экспортировать через Sharp от оригинала + список операций.

### Средние

4. **Блокирующий FS в main-процессе.** Используются `fs.statSync`, `fs.accessSync`, `fs.writeFileSync`, `fs.copyFileSync`, `fs.renameSync`. На больших файлах/сетевых дисках это может подвешивать Electron main process. Лучше перейти на `fs.promises` и очередь операций.
5. **Жёсткий layout без адаптивности.** UI имеет `min-width: 1280px` и `min-height: 800px`; окно Electron минимально 1200×800. На ноутбуках/малых экранах интерфейс будет тесным. Нужны collapsible панели, responsive breakpoints и режим одной рабочей области.
6. **Внешний Google Fonts import.** Локальная desktop-программа зависит от сети для шрифта Inter. Лучше упаковать font assets локально или использовать системный stack без сетевого запроса.
7. **Нет автоматизированных quality gates.** В `package.json` есть только `start`; отсутствуют lint/test/check scripts. Добавить ESLint, stylelint/prettier, smoke-тесты IPC и npm audit в CI.

### Низкие / поддерживаемость

8. **Глобальные зависимости между renderer-модулями.** Модули общаются через `window.*` (`window.formatSize`, `window.generateThumbnail`, `window.resizeLoadPhoto`, `window.wmActivate`, `window.zoom`). Это затрудняет тестирование и рефакторинг. Рекомендуется перейти к ES modules или явному app-controller/event bus.
9. **Дублирование UI-паттернов dropdown/slider/modal.** Кастомные dropdown реализованы отдельно в crop/resize/watermark/colorpicker, CSS для `.ri-select-dropdown` повторяется. Выделить общий компонент dropdown/popover и общий range-control helper.
10. **История действий — только журнал, не полноценная временная шкала.** Есть undo/redo snapshot-стек, но история панели не связана с переходом к состояниям. Можно объединить их в timeline с превью и rollback.

## Рекомендуемый порядок исправлений

1. Закрыть XSS в renderer (`textContent`/`escapeHtml` для всех пользовательских строк).
2. Ввести безопасную модель IPC: ID фото вместо произвольных путей, whitelist в main, валидация форматов и лимитов размера.
3. Перевести сохранение/экспорт на full-resolution pipeline через Sharp.
4. Добавить lint/check/test scripts и CI.
5. Рефакторинг renderer в ES modules + общие UI-компоненты.
6. UX-модернизация: responsive panels, command palette, пакетная очередь операций, non-destructive edits, сравнение before/after.

## Актуальные UI/UX улучшения

- **Command palette** (`Ctrl+K`) для быстрых действий: открыть, экспортировать, применить пресет, найти инструмент.
- **Before/After comparison**: split-view с draggable divider и удержанием клавиши для просмотра оригинала.
- **Non-destructive editing stack**: список операций с возможностью включать/выключать шаги и менять порядок.
- **Batch operations queue**: очередь пакетного resize/export/watermark с прогрессом, отменой и retry.
- **Smart presets**: пресеты под маркетплейсы/соцсети/печать с подсказками DPI/соотношения сторон.
- **Inline validation**: предупреждения о потере качества, изменении формата, перезаписи оригинала.
- **Empty states с обучением**: краткие подсказки drag&drop, горячие клавиши, демо-пример.
- **Accessible UI**: полноценная навигация клавиатурой, ARIA для custom controls, focus trapping в модалках.
