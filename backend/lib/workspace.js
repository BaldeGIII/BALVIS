// The one folder the agent may read from and write to. Everything it creates lands here, and only bare
// file names are ever accepted, so nothing can be written or opened outside it.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = () => process.env.BALVIS_WORKSPACE || path.join(os.homedir(), 'Documents', 'BALVIS');

function ensure(sub = '') {
  const dir = path.join(root(), sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeName(name, defaultExt) {
  let base =
    path
      .basename(String(name || 'untitled'))
      .replace(/[^\w.\- ()]+/g, '_')
      .replace(/^\.+/, '')
      .trim()
      .slice(0, 100) || 'untitled';
  if (defaultExt && !path.extname(base)) base += `.${defaultExt}`;
  return base;
}

// Never overwrite: "deck.pptx" becomes "deck-2.pptx" if it exists.
function uniquePath(dir, name) {
  const { name: stem, ext } = path.parse(name);
  let candidate = path.join(dir, name);
  for (let i = 2; fs.existsSync(candidate); i++) candidate = path.join(dir, `${stem}-${i}${ext}`);
  return candidate;
}

function listFiles() {
  const dir = ensure();
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => {
      const stat = fs.statSync(path.join(dir, entry.name));
      return { name: entry.name, size: stat.size, modified: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, 200);
}

function resolveExisting(name) {
  const file = path.join(root(), path.basename(String(name || '')));
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function openWithDefaultApp(file) {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [file]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', file]]
        : ['xdg-open', [file]];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {}); // no opener installed: the file is still saved
  child.unref();
}

module.exports = { root, ensure, safeName, uniquePath, listFiles, resolveExisting, openWithDefaultApp };
