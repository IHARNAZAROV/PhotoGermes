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
});
