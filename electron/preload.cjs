const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("organizer", {
  desktop: true,
  load: () => ipcRenderer.invoke("workspace:load"),
  save: (state, revision) =>
    ipcRenderer.invoke("workspace:save", state, revision),
  exportBackup: () => ipcRenderer.invoke("workspace:export"),
  importBackup: () => ipcRenderer.invoke("workspace:import"),
  undoRestore: () => ipcRenderer.invoke("workspace:undo"),
  testNotification: () => ipcRenderer.invoke("notification:test"),
  info: () => ipcRenderer.invoke("app:info"),
  openAuthor: () => ipcRenderer.invoke("app:author"),
  openDataFolder: () => ipcRenderer.invoke("app:data-folder"),
  onNavigate: (listener) => {
    const handler = (_event, id, kind) => listener(id, kind);
    ipcRenderer.on("navigate-task", handler);
    return () => ipcRenderer.removeListener("navigate-task", handler);
  },
  onChange: (listener) => {
    const handler = (_event, snapshot) => listener(snapshot);
    ipcRenderer.on("workspace:changed", handler);
    return () => ipcRenderer.removeListener("workspace:changed", handler);
  },
});
