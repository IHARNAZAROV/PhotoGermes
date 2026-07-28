const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    /** Open native file-picker dialog. Returns Promise<string[]> of file paths. */
    openPhotos:    ()         => ipcRenderer.invoke("dialog:open-photos"),

    /** Get file metadata. Returns Promise<{name,filePath,width,height,sizeBytes}|null> */
    getInfo:       (filePath) => ipcRenderer.invoke("photos:get-info",      filePath),

    /** Get 160×120 thumbnail as base64 data-URL. Returns Promise<string|null> */
    getThumbnail:  (filePath) => ipcRenderer.invoke("photos:get-thumbnail",  filePath),

    /** Get full-size editor preview as base64 data-URL. Returns Promise<string|null> */
    getPreview:    (filePath) => ipcRenderer.invoke("photos:get-preview",    filePath),

    /** Overwrite file at filePath. dataUrl=null means no edits (original already saved). */
    savePhoto:     (filePath, dataUrl)              => ipcRenderer.invoke("photos:save",    filePath, dataUrl),

    /** Show native Save-As dialog. defaultDir: optional initial directory for dialog. */
    savePhotoAs:   (name, dataUrl, originalPath, defaultDir) => ipcRenderer.invoke("photos:save-as", name, dataUrl, originalPath, defaultDir),

    /** Resize photo using Sharp. Returns Promise<{ok, dataUrl}|{ok, error}>. */
    resizePhoto:   (params)                         => ipcRenderer.invoke("photos:resize", params),

    /** Show native folder-picker dialog. Returns Promise<string|null>. */
    selectFolder:  ()                               => ipcRenderer.invoke("dialog:select-folder"),

    /** Convert a photo to the target format/quality using Sharp. Returns Promise<{ok,dataUrl}|{ok,error}>. */
    exportPhoto:   (params)                         => ipcRenderer.invoke("photos:export", params),

    /**
     * Full-resolution non-destructive pipeline.
     * Applies ops (crop, resize) to the original file via Sharp and encodes
     * the result in the requested format, preserving EXIF/ICC metadata.
     * Returns Promise<{ok, dataUrl}|{ok, error}>.
     */
    processAndExport: (params) => ipcRenderer.invoke("photos:process-and-export", params),
});
