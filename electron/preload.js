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
  queueSyncAction: (endpoint, method, payload, meta) => ipcRenderer.invoke('queue-sync-action', endpoint, method, payload, meta),
  getSyncQueue: () => ipcRenderer.invoke('get-sync-queue'),
  dequeueSyncAction: (id) => ipcRenderer.invoke('dequeue-sync-action', id),
  markSyncAttempt: (id, error, retryAfterMs) => ipcRenderer.invoke('mark-sync-attempt', id, error, retryAfterMs),
  deadLetterSyncAction: (id, reason) => ipcRenderer.invoke('deadletter-sync-action', id, reason),
  getSyncStats: () => ipcRenderer.invoke('get-sync-stats'),

  // Bill numbering (atomic, resets per business day)
  peekBillNumber: (businessDate) => ipcRenderer.invoke('peek-bill-number', businessDate),
  allocateBillNumber: (businessDate) => ipcRenderer.invoke('allocate-bill-number', businessDate),

  printSilent: (html) => ipcRenderer.invoke('print-silent', html)
});
