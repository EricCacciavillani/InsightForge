const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Platform info
  platform: process.platform,

  // Backend status events
  onBackendReady: (callback) => ipcRenderer.on('backend-ready', callback),
  onBackendError: (callback) => ipcRenderer.on('backend-error', (_event, message) => callback(message)),
  
  // Remove listeners (for cleanup)
  removeBackendListeners: () => {
    ipcRenderer.removeAllListeners('backend-ready');
    ipcRenderer.removeAllListeners('backend-error');
  },

  // Backend controls
  getPythonInfo: () => ipcRenderer.invoke('get-python-info'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  setupCondaEnv: () => ipcRenderer.invoke('setup-conda-env'),
});
