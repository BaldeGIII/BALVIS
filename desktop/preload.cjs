const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('balvis', {
  isDesktop: true,
  keyStatus: () => ipcRenderer.invoke('balvis:key-status'),
  setKey: (name, key) => ipcRenderer.invoke('balvis:set-key', name, key),
  speak: (text) => ipcRenderer.invoke('balvis:speak', text),
  stopSpeech: () => ipcRenderer.invoke('balvis:stop-speech'),
});
