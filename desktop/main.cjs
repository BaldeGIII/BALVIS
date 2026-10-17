// BALVIS desktop shell: runs the Express backend inside the app, serves the built frontend from it,
// and keeps user data and the Kimi API key in the OS app-data folder.
const { app, BrowserWindow, Menu, ipcMain, safeStorage, session, shell } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const userData = app.getPath('userData');
const configPath = path.join(userData, 'config.json');
let origin = '';

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
}

// API keys the user can paste in Settings. Stored encrypted when the OS keyring allows it.
const KEYS = {
  kimi: { env: 'KIMI_API_KEY', field: 'kimiKey' },
  elevenlabs: { env: 'ELEVENLABS_API_KEY', field: 'elevenLabsKey' },
};

function loadKey({ field }) {
  const config = readConfig();
  const stored = config[field];
  if (!stored) return '';
  try {
    return config[`${field}Encrypted`] ? safeStorage.decryptString(Buffer.from(stored, 'base64')) : stored;
  } catch {
    return '';
  }
}

function saveKey({ env, field }, key) {
  const config = readConfig();
  delete config[field];
  delete config[`${field}Encrypted`];
  if (key) {
    // ponytail: some Linux setups have no keyring, so fall back to a 0600 plain file there.
    const encrypted = safeStorage.isEncryptionAvailable();
    config[field] = encrypted ? safeStorage.encryptString(key).toString('base64') : key;
    config[`${field}Encrypted`] = encrypted;
  }
  writeConfig(config);
  process.env[env] = key; // the backend reads these on every request
}

// Chromium's own speechSynthesis finds no voices on many Linux setups, so speak through the system
// speech service (speech-dispatcher) instead. Resolves false when it is unavailable so the UI can fall back.
let speaker = null;

function stopSpeaking() {
  if (!speaker) return;
  speaker.cancelled = true;
  speaker.kill();
  speaker = null;
  spawn('spd-say', ['-C']).on('error', () => {}); // the dispatcher keeps talking after the client dies
}

function speakAloud(text) {
  stopSpeaking();
  const clean = text.slice(0, 1500).replace(/^[-\s]+/, ''); // a leading "-" would be read as an option
  if (!clean) return Promise.resolve(true);

  return new Promise((resolve) => {
    const child = spawn('spd-say', ['-w', '-l', 'en-GB', '-t', 'male1', '-r', '-10', '-p', '-20', clean]);
    speaker = child;
    child.on('error', () => resolve(false)); // spd-say not installed
    child.on('close', (code) => {
      if (speaker === child) speaker = null;
      resolve(code === 0 || Boolean(child.cancelled));
    });
  });
}

function startBackend() {
  require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') }); // dev checkout
  require('dotenv').config({ path: path.join(userData, '.env') }); // optional power-user override

  const config = readConfig();
  if (!config.sessionSecret) {
    config.sessionSecret = crypto.randomBytes(32).toString('hex');
    writeConfig(config);
  }

  process.env.SESSION_SECRET ||= config.sessionSecret;
  process.env.BALVIS_DATA_DIR ||= path.join(userData, 'data');
  process.env.BALVIS_WORKSPACE ||= path.join(app.getPath('documents'), 'BALVIS'); // where the agent saves files
  process.env.BALVIS_UPLOAD_DIR ||= path.join(app.getPath('temp'), 'balvis-uploads');
  process.env.BALVIS_DIST_DIR ||= path.join(__dirname, '..', 'dist');
  process.env.PORT ||= '38417'; // fixed so the app's saved settings stay on one origin

  Object.values(KEYS).forEach((definition) => {
    const key = loadKey(definition);
    if (key) process.env[definition.env] = key;
  });

  const server = require('../backend/server.js');
  return new Promise((resolve) => {
    if (server.listening) return resolve(server.address().port);
    server.once('listening', () => resolve(server.address().port));
    server.once('error', (error) => {
      if (error.code !== 'EADDRINUSE') throw error;
      server.listen(0); // port taken: let the OS pick one
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'BALVIS',
    backgroundColor: '#02070d',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(origin);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    // Only the microphone is ever needed.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) =>
      callback(permission === 'media')
    );
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

    ipcMain.handle('balvis:key-status', () =>
      Object.fromEntries(Object.entries(KEYS).map(([name, { env }]) => [name, Boolean(process.env[env])]))
    );
    ipcMain.handle('balvis:speak', (event, text) =>
      event.senderFrame.url.startsWith(origin) && typeof text === 'string' ? speakAloud(text) : false
    );
    ipcMain.handle('balvis:stop-speech', (event) => {
      if (event.senderFrame.url.startsWith(origin)) stopSpeaking();
    });
    ipcMain.handle('balvis:set-key', (event, name, key) => {
      const definition = KEYS[name];
      if (!definition || !event.senderFrame.url.startsWith(origin)) return false;
      saveKey(definition, typeof key === 'string' ? key.trim() : '');
      return Boolean(process.env[definition.env]);
    });
    if (app.isPackaged) Menu.setApplicationMenu(null);
    origin = `http://127.0.0.1:${await startBackend()}`;
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', stopSpeaking);
}
