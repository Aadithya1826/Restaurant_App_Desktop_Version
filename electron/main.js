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

// Helper to ensure directory exists
function getSecurePath(folder, filename) {
  const base = getBaseDataPath();
  const folderPath = path.join(base, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return path.join(folderPath, filename);
}

ipcMain.handle('save-offline-data', async (event, folder, filename, data) => {
  try {
    const filePath = getSecurePath(folder, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

ipcMain.handle('queue-sync-action', async (event, endpoint, method, payload) => {
  try {
    const folderPath = getSecurePath('sync_queue', '');
    const id = Date.now().toString();
    const action = { id, endpoint, method, payload, timestamp: new Date().toISOString() };
    fs.writeFileSync(path.join(folderPath, `${id}.json`), JSON.stringify(action));
    return { success: true, id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-sync-queue', async () => {
  try {
    const folderPath = getSecurePath('sync_queue', '');
    const files = fs.readdirSync(folderPath);
    const queue = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = fs.readFileSync(path.join(folderPath, file), 'utf8');
        queue.push(JSON.parse(data));
      }
    }
    return { success: true, queue: queue.sort((a, b) => a.id - b.id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dequeue-sync-action', async (event, id) => {
  try {
    const filePath = getSecurePath('sync_queue', `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
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

