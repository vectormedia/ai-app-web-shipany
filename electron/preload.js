const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Get platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Check if running in Electron environment
  isElectron: true,

  // Send message to main process
  send: (channel, data) => {
    const validChannels = ['app-event', 'window-control'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // Receive messages from main process
  receive: (channel, func) => {
    const validChannels = ['app-update', 'app-notification'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
