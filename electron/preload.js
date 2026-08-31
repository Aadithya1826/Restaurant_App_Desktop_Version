const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config & Path Selection
  selectDataDirectory: () => ipcRenderer.invoke('select-data-directory'),
  getDataDirectory: () => ipcRenderer.invoke('get-data-directory'),
  setDataDirectory: (path) => ipcRenderer.invoke('set-data-directory', path),

  // File System Operations
  saveOfflineData: (folder, filename, data) => ipcRenderer.invoke('save-offline-data', folder, filename, data),
  getOfflineData: (folder, filename) => ipcRenderer.invoke('get-offline-data', folder, filename),
  logError: (message) => ipcRenderer.invoke('log-error', message),
  
  // Sync Queue Operations
  queueSyncAction: (endpoint, method, payload) => ipcRenderer.invoke('queue-sync-action', endpoint, method, payload),
  getSyncQueue: () => ipcRenderer.invoke('get-sync-queue'),
  dequeueSyncAction: (id) => ipcRenderer.invoke('dequeue-sync-action', id),
  printSilent: (html) => ipcRenderer.invoke('print-silent', html)
});
