const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATABASE_PATH = path.join(DATA_DIR, 'balvis.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DATABASE_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation_snapshots (
    user_id TEXT PRIMARY KEY,
    active_tab_id TEXT NOT NULL,
    tabs_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createDefaultConversationState() {
  return {
    tabs: [
      {
        id: '1',
        title: 'New session',
        type: 'chat',
        messages: [],
      },
    ],
    activeTabId: '1',
  };
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const type = message.type === 'user' ? 'user' : 'ai';
  const content = typeof message.content === 'string' ? message.content.trim() : '';

  if (!content) {
    return null;
  }

  const sanitized = {
    type,
    content: content.slice(0, 20000),
  };

  if (typeof message.originalText === 'string' && message.originalText.trim()) {
    sanitized.originalText = message.originalText.trim().slice(0, 20000);
  }

  return sanitized;
}

function sanitizeTab(tab, index) {
  if (!tab || typeof tab !== 'object') {
    return null;
  }

  const fallbackId = String(index + 1);
  const id = typeof tab.id === 'string' && tab.id.trim() ? tab.id.trim() : fallbackId;
  const title =
    typeof tab.title === 'string' && tab.title.trim()
      ? tab.title.trim().slice(0, 120)
      : 'New session';
  const type = tab.type === 'whiteboard' ? 'whiteboard' : 'chat';
  const rawMessages = Array.isArray(tab.messages) ? tab.messages : [];
  const messages = rawMessages
    .map(sanitizeMessage)
    .filter(Boolean)
    .slice(-200);

  return {
    id,
    title,
    type,
    messages,
  };
}

function normalizeConversationState(payload) {
  const fallback = createDefaultConversationState();
  const rawTabs = Array.isArray(payload?.tabs) ? payload.tabs : fallback.tabs;
  const tabs = rawTabs
    .map(sanitizeTab)
    .filter(Boolean)
    .slice(0, 40);

  const safeTabs = tabs.length > 0 ? tabs : fallback.tabs;
  const requestedActiveTabId =
    typeof payload?.activeTabId === 'string' ? payload.activeTabId : '';
  const activeTabId = safeTabs.some((tab) => tab.id === requestedActiveTabId)
    ? requestedActiveTabId
    : safeTabs[0].id;

  return {
    tabs: safeTabs,
    activeTabId,
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');

  if (!salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');

  if (candidate.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, expected);
}

function sanitizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getUserByEmail(email) {
  const statement = db.prepare(
    'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?'
  );
  return statement.get(normalizeEmail(email)) || null;
}

function getUserById(userId) {
  const statement = db.prepare(
    'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?'
  );
  return sanitizeUser(statement.get(userId));
}

function createUser({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const timestamp = nowIso();
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    userId,
    String(name).trim().slice(0, 120),
    normalizedEmail,
    passwordHash,
    timestamp,
    timestamp
  );

  saveConversationSnapshot(userId, createDefaultConversationState());
  return getUserById(userId);
}

function verifyUserCredentials(email, password) {
  const user = getUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return sanitizeUser(user);
}

function getConversationSnapshot(userId) {
  const statement = db.prepare(`
    SELECT active_tab_id, tabs_json, updated_at
    FROM conversation_snapshots
    WHERE user_id = ?
  `);

  const row = statement.get(userId);

  if (!row) {
    const fallback = createDefaultConversationState();
    return {
      ...fallback,
      updatedAt: null,
    };
  }

  try {
    const parsedTabs = JSON.parse(row.tabs_json);
    const normalized = normalizeConversationState({
      tabs: parsedTabs,
      activeTabId: row.active_tab_id,
    });

    return {
      ...normalized,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    const fallback = createDefaultConversationState();
    return {
      ...fallback,
      updatedAt: row.updated_at,
    };
  }
}

function saveConversationSnapshot(userId, payload) {
  const normalized = normalizeConversationState(payload);
  const timestamp = nowIso();

  const statement = db.prepare(`
    INSERT INTO conversation_snapshots (user_id, active_tab_id, tabs_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      active_tab_id = excluded.active_tab_id,
      tabs_json = excluded.tabs_json,
      updated_at = excluded.updated_at
  `);

  statement.run(
    userId,
    normalized.activeTabId,
    JSON.stringify(normalized.tabs),
    timestamp
  );

  return {
    ...normalized,
    updatedAt: timestamp,
  };
}

module.exports = {
  createDefaultConversationState,
  createUser,
  getConversationSnapshot,
  getUserByEmail,
  getUserById,
  saveConversationSnapshot,
  verifyUserCredentials,
};
