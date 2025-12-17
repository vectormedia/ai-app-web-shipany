const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Environment detection
const isDev = !app.isPackaged;
const PORT = process.env.PORT || 3000;

let mainWindow = null;
let serverProcess = null;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'ShipAny',
    titleBarStyle: 'hiddenInset', // macOS specific title bar style
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icons/icon.png'),
    show: false, // Hide initially, show after loading
  });

  // Load the application
  const url = `http://localhost:${PORT}`;
  mainWindow.loadURL(url);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start Next.js server (production mode)
async function startNextServer() {
  if (isDev) {
    // In development mode, assume Next.js is already running
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const serverPath = path.join(
      process.resourcesPath,
      'standalone',
      'server.js'
    );

    // Set environment variables
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString(),
    };

    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(process.resourcesPath, 'standalone'),
      env,
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
      if (data.toString().includes('Ready')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    // Timeout handling
    setTimeout(() => {
      resolve(); // Continue even if Ready signal not received
    }, 10000);
  });
}

// Stop Next.js server
function stopNextServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// Application startup
app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (err) {
    console.error('Failed to start application:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// When all windows are closed
app.on('window-all-closed', () => {
  stopNextServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before app quits
app.on('before-quit', () => {
  stopNextServer();
});

// IPC communication handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});
