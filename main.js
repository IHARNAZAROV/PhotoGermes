const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs   = require("fs");

let sharp;
try { sharp = require("sharp"); } catch (e) { sharp = null; }

// ── IPC handlers ───────────────────────────────────────
function registerHandlers() {

    // Open native file dialog, return array of paths
    ipcMain.handle("dialog:open-photos", async () => {
        const result = await dialog.showOpenDialog({
            title: "Добавить фотографии",
            filters: [
                { name: "Изображения", extensions: ["jpg","jpeg","png","webp","tiff","tif","bmp","gif","heic","heif","avif"] }
            ],
            properties: ["openFile", "multiSelections"]
        });
        return result.canceled ? [] : result.filePaths;
    });

    // Return { name, filePath, width, height, sizeBytes }
    ipcMain.handle("photos:get-info", async (_e, filePath) => {
        try {
            const stat = fs.statSync(filePath);
            const info = { name: path.basename(filePath), filePath, sizeBytes: stat.size, width: 0, height: 0 };
            if (sharp) {
                const meta = await sharp(filePath).metadata();
                info.width  = meta.width  || 0;
                info.height = meta.height || 0;
            }
            return info;
        } catch { return null; }
    });

    // Return base64 JPEG data-URL thumbnail (160×120 cover)
    ipcMain.handle("photos:get-thumbnail", async (_e, filePath) => {
        if (!sharp) return null;
        try {
            const buf = await sharp(filePath)
                .resize(160, 120, { fit: "cover", position: "centre" })
                .jpeg({ quality: 75 })
                .toBuffer();
            return "data:image/jpeg;base64," + buf.toString("base64");
        } catch { return null; }
    });

    // Return base64 JPEG data-URL editor preview (max 1200×900)
    ipcMain.handle("photos:get-preview", async (_e, filePath) => {
        if (!sharp) return null;
        try {
            const buf = await sharp(filePath)
                .resize(1200, 900, { fit: "inside", withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
            return "data:image/jpeg;base64," + buf.toString("base64");
        } catch { return null; }
    });

    // Overwrite an existing file with the given data-URL
    ipcMain.handle("photos:save", async (_e, filePath, dataUrl) => {
        try {
            const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
            fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    });

    // Show native Save-As dialog, then write the data-URL to the chosen path
    ipcMain.handle("photos:save-as", async (_e, suggestedName, dataUrl) => {
        try {
            const result = await dialog.showSaveDialog({
                title: "Сохранить как",
                defaultPath: suggestedName,
                filters: [
                    { name: "JPEG",  extensions: ["jpg", "jpeg"] },
                    { name: "PNG",   extensions: ["png"] },
                    { name: "WebP",  extensions: ["webp"] },
                    { name: "Все файлы", extensions: ["*"] }
                ]
            });
            if (result.canceled || !result.filePath) return null;
            const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
            fs.writeFileSync(result.filePath, Buffer.from(base64, "base64"));
            return { filePath: result.filePath, name: path.basename(result.filePath) };
        } catch (e) {
            return null;
        }
    });
}

// ── Window ─────────────────────────────────────────────
function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 950,
        minWidth: 1200,
        minHeight: 800,
        title: "Фотоцентр ГермесГарант",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

registerHandlers();

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
