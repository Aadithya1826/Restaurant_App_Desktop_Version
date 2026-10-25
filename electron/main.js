const { app, BrowserWindow, protocol, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const serveModule = require('electron-serve');
const serve = serveModule.default || serveModule;

// Configure electron-serve to serve the exported Expo web bundle
// When running in production (packaged), the 'dist' folder will be located in resources
const isDev = process.env.NODE_ENV === 'development';
const loadURL = serve({ directory: 'dist' });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Disables CORS for the desktop app
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Completely remove the menu bar
  mainWindow.setMenu(null);

  // Maximize the window automatically when opened
  mainWindow.maximize();

  if (isDev) {
    // In development mode, load the Expo local development server if needed,
    // or just load the dist folder if it's already exported.
    // For simplicity, we just load the exported web app.
    loadURL(mainWindow);
  } else {
    // In production mode, load the exported Expo bundle
    loadURL(mainWindow);
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// When electron is ready, create the window
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers for Offline Support ---

// Config for custom data directory
const configPath = path.join(app.getPath('userData'), 'app-config.json');

function getBaseDataPath() {
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.customDataPath && fs.existsSync(config.customDataPath)) {
        return config.customDataPath;
      }
    } catch(e) {}
  }
  return app.getPath('userData');
}

ipcMain.handle('select-data-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Folder for Offline Data & Logs'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('set-data-directory', async (event, newPath) => {
  fs.writeFileSync(configPath, JSON.stringify({ customDataPath: newPath }));
  return true;
});

ipcMain.handle('get-data-directory', async () => {
  return getBaseDataPath();
});

// Helper to ensure directory exists. Also guards against path traversal.
function getSecurePath(folder, filename) {
  const base = getBaseDataPath();
  const folderPath = path.resolve(base, folder);
  if (!folderPath.startsWith(path.resolve(base))) {
    throw new Error('Invalid folder path');
  }
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  const safeName = path.basename(filename || '');
  return path.join(folderPath, safeName);
}

/**
 * Atomic write: write to a temp file, fsync it, then rename over the target.
 * A rename on the same volume is atomic, so a crash/power-cut can never leave a
 * half-written (and therefore unreadable / silently discarded) sale on disk.
 */
function writeFileAtomic(filePath, contents) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, contents);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
}

ipcMain.handle('save-offline-data', async (event, folder, filename, data) => {
  try {
    const filePath = getSecurePath(folder, filename);
    writeFileAtomic(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-offline-data', async (event, folder, filename) => {
  try {
    const filePath = getSecurePath(folder, filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('log-error', async (event, message) => {
  try {
    const filePath = getSecurePath('logs', 'error.log');
    const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(filePath, logEntry);
    return true;
  } catch(e) { return false; }
});

// Monotonic sequence so that two sales queued in the same millisecond can never
// collide (the old code used Date.now() as the filename => the second sale
// silently overwrote the first one and was lost forever).
const SEQ_FILE = 'sequence.json';

function nextSequence() {
  const seqPath = getSecurePath('sync_queue_meta', SEQ_FILE);
  let seq = 0;
  try {
    if (fs.existsSync(seqPath)) {
      seq = JSON.parse(fs.readFileSync(seqPath, 'utf8')).seq || 0;
    }
  } catch (e) { seq = 0; }
  seq += 1;
  try { writeFileAtomic(seqPath, JSON.stringify({ seq })); } catch (e) {}
  return seq;
}

ipcMain.handle('queue-sync-action', async (event, endpoint, method, payload, meta = {}) => {
  try {
    const seq = nextSequence();
    // zero-padded so lexical file order == chronological order
    const id = `${String(seq).padStart(12, '0')}-${Date.now()}`;
    const action = {
      id,
      seq,
      endpoint,
      method,
      payload,
      // Idempotency key travels with the request so the backend can reject a
      // replay of a sale it has already recorded.
      idempotencyKey: meta.idempotencyKey || `${id}-${Math.random().toString(36).slice(2)}`,
      attempts: 0,
      lastError: null,
      nextAttemptAt: 0,
      timestamp: new Date().toISOString(),
    };
    const filePath = getSecurePath('sync_queue', `${id}.json`);
    writeFileAtomic(filePath, JSON.stringify(action, null, 2));
    return { success: true, id, idempotencyKey: action.idempotencyKey };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-sync-queue', async () => {
  try {
    const folderPath = path.dirname(getSecurePath('sync_queue', 'x'));
    const files = fs.readdirSync(folderPath);
    const queue = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue; // ignore *.tmp leftovers
      const full = path.join(folderPath, file);
      try {
        const data = fs.readFileSync(full, 'utf8');
        if (!data.trim()) {
          // Empty file: quarantine instead of deleting - it may be a lost sale.
          quarantine(full, file, 'empty file');
          continue;
        }
        queue.push(JSON.parse(data));
      } catch (e) {
        // NEVER delete unreadable data. Move it aside so a human can recover
        // the transaction; deleting it was silently destroying sales.
        quarantine(full, file, e.message);
      }
    }
    // Strict FIFO. Ordering matters: a "create order" must sync before the
    // "update payment status" that refers to it.
    queue.sort((a, b) => (a.seq || 0) - (b.seq || 0) || String(a.id).localeCompare(String(b.id)));
    return { success: true, queue };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function quarantine(fullPath, file, reason) {
  try {
    const dest = getSecurePath('sync_queue_corrupt', `${Date.now()}_${file}`);
    fs.renameSync(fullPath, dest);
    const logPath = getSecurePath('logs', 'error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] QUARANTINED ${file}: ${reason}\n`);
  } catch (err) {
    console.error('Failed to quarantine sync file', file, err);
  }
}

ipcMain.handle('dequeue-sync-action', async (event, id) => {
  try {
    const filePath = getSecurePath('sync_queue', `${id}.json`);
    if (fs.existsSync(filePath)) {
      // Keep a copy of everything we successfully pushed, for reconciliation.
      try {
        const archive = getSecurePath('sync_completed', `${id}.json`);
        fs.copyFileSync(filePath, archive);
      } catch (e) {}
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Record a failed attempt (retry counter + backoff) without losing the action.
ipcMain.handle('mark-sync-attempt', async (event, id, errorMessage, retryAfterMs = 0) => {
  try {
    const filePath = getSecurePath('sync_queue', `${id}.json`);
    if (!fs.existsSync(filePath)) return { success: false, error: 'not found' };
    const action = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    action.attempts = (action.attempts || 0) + 1;
    action.lastError = errorMessage;
    action.nextAttemptAt = Date.now() + retryAfterMs;
    writeFileAtomic(filePath, JSON.stringify(action, null, 2));
    return { success: true, attempts: action.attempts };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Dead-letter: a permanently rejected action is MOVED, never deleted, so the
// sale can be re-entered manually. The old code just deleted 4xx failures.
ipcMain.handle('deadletter-sync-action', async (event, id, reason) => {
  try {
    const filePath = getSecurePath('sync_queue', `${id}.json`);
    if (!fs.existsSync(filePath)) return { success: false, error: 'not found' };
    const action = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    action.deadLetteredAt = new Date().toISOString();
    action.deadLetterReason = reason;
    writeFileAtomic(getSecurePath('sync_failed', `${id}.json`), JSON.stringify(action, null, 2));
    fs.unlinkSync(filePath);
    const logPath = getSecurePath('logs', 'error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] DEAD-LETTER ${id} (${action.endpoint}): ${reason}\n`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-sync-stats', async () => {
  const count = (folder) => {
    try {
      return fs.readdirSync(path.dirname(getSecurePath(folder, 'x')))
        .filter(f => f.endsWith('.json')).length;
    } catch (e) { return 0; }
  };
  return {
    success: true,
    pending: count('sync_queue'),
    failed: count('sync_failed'),
    corrupt: count('sync_queue_corrupt'),
  };
});

// --- Bill number counter ---------------------------------------------------
// Previously the counter lived in the renderer's localStorage and was a plain
// forever-increasing number: it never reset, so a new day simply continued from
// wherever the previous day stopped (hence "today starts at 800"). It also died
// whenever localStorage was cleared, and two rapid checkouts could race.
//
// It now lives in the offline data directory (survives cache clears / reinstalls),
// is scoped to a business date, and is allocated atomically in this process so
// no two bills can ever receive the same number.
const BILL_COUNTER_FILE = 'bill_counter.json';

function readBillCounter() {
  try {
    const p = getSecurePath('counters', BILL_COUNTER_FILE);
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (parsed && typeof parsed.lastAllocated === 'number') return parsed;
    }
  } catch (e) {}
  return { businessDate: null, lastAllocated: 0 };
}

ipcMain.handle('peek-bill-number', async (event, businessDate) => {
  const c = readBillCounter();
  const next = c.businessDate === businessDate ? c.lastAllocated + 1 : 1;
  return { success: true, billNo: next, businessDate };
});

ipcMain.handle('allocate-bill-number', async (event, businessDate) => {
  try {
    const c = readBillCounter();
    const billNo = c.businessDate === businessDate ? c.lastAllocated + 1 : 1;
    writeFileAtomic(
      getSecurePath('counters', BILL_COUNTER_FILE),
      JSON.stringify({ businessDate, lastAllocated: billNo, updatedAt: new Date().toISOString() }, null, 2)
    );
    return { success: true, billNo, businessDate };
  } catch (err) {
    return { success: false, error: err.message };
  }
});


ipcMain.handle('print-silent', async (event, htmlContent) => {
  return new Promise((resolve) => {
    let printWindow = new BrowserWindow({ 
      show: false,
      width: 300,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({ 
        silent: true, 
        printBackground: true,
        color: false,
        margins: { marginType: 'none' },
        pageSize: { width: 72000, height: 297000 } // Typical 80mm roll width
      }, (success, failureReason) => {
        printWindow.close();
        resolve(success);
      });
    });
  });
});

