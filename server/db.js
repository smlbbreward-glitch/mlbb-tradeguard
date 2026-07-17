import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || (process.env.NETLIFY ? '/tmp/tradeguard.db' : join(__dirname, '..', 'data', 'tradeguard.db'));
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_verified INTEGER NOT NULL DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'not_started',
    decline_reason TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller TEXT NOT NULL,
    caption TEXT NOT NULL,
    price TEXT NOT NULL,
    rank TEXT DEFAULT '',
    hero TEXT DEFAULT '',
    ml_id TEXT DEFAULT '',
    server_id TEXT DEFAULT '',
    security_lock TEXT DEFAULT '',
    platform TEXT DEFAULT 'Mobile Legends',
    premium INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available',
    files_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    caption TEXT DEFAULT '',
    price TEXT DEFAULT '',
    seller TEXT DEFAULT '',
    buyer TEXT DEFAULT '',
    rank TEXT DEFAULT '',
    ml_id TEXT DEFAULT '',
    server_id TEXT DEFAULT '',
    platform TEXT DEFAULT '',
    hero TEXT DEFAULT '',
    premium INTEGER NOT NULL DEFAULT 0,
    files_json TEXT DEFAULT '[]',
    payment_method TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS midman_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    caption TEXT DEFAULT '',
    buyer TEXT DEFAULT '',
    seller TEXT DEFAULT '',
    price TEXT DEFAULT '',
    payment_method TEXT DEFAULT '',
    midman TEXT DEFAULT 'Pending',
    premium INTEGER NOT NULL DEFAULT 0,
    midman_fee INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    chat_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    id_type TEXT DEFAULT '',
    address TEXT DEFAULT '',
    fb_link1 TEXT DEFAULT '',
    fb_link2 TEXT DEFAULT '',
    files_json TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caption TEXT DEFAULT '',
    buyer TEXT DEFAULT '',
    seller TEXT DEFAULT '',
    price TEXT DEFAULT '',
    midman TEXT DEFAULT '',
    premium INTEGER NOT NULL DEFAULT 0,
    midman_fee INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Success',
    closed_by TEXT DEFAULT '',
    closed_at TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

const num = (v) => (v ? 1 : 0);
const bool = (v) => v === 1 || v === true;

export const dbUsers = {
  findByUsername: (username) =>
    db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase()),
  list: () => db.prepare('SELECT id, username, role, is_verified, verification_status, created_at FROM users ORDER BY id DESC').all(),
  create: (username, passwordHash, role = 'user') =>
    db.prepare(
      'INSERT INTO users (username, password_hash, role, is_verified, verification_status, created_at) VALUES (?, ?, ?, 0, ?, ?)'
    ).run(username.toLowerCase(), passwordHash, role, 'not_started', new Date().toISOString()),
  setRole: (username, role) =>
    db.prepare('UPDATE users SET role = ? WHERE username = ?').run(role, username.toLowerCase()),
  remove: (username) =>
    db.prepare('DELETE FROM users WHERE username = ?').run(username.toLowerCase()),
  setVerification: (username, { isVerified, verificationStatus, declineReason = '' }) =>
    db.prepare(
      'UPDATE users SET is_verified = ?, verification_status = ?, decline_reason = ? WHERE username = ?'
    ).run(num(isVerified), verificationStatus, declineReason, username.toLowerCase())
};

export const dbPosts = {
  list: () => db.prepare('SELECT * FROM posts ORDER BY id DESC').all().map(rowToPost),
  create: (post) => {
    const info = db.prepare(
      `INSERT INTO posts (seller, caption, price, rank, hero, ml_id, server_id, security_lock, platform, premium, status, files_json, created_at)
       VALUES (@seller, @caption, @price, @rank, @hero, @mlId, @serverId, @securityLock, @platform, @premium, @status, @filesJson, @createdAt)`
    ).run({ ...post, premium: num(post.premium), filesJson: JSON.stringify(post.files || []) });
    return dbPosts.get(info.lastInsertRowid);
  },
  get: (id) => {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(id));
    return row ? rowToPost(row) : null;
  },
  updateStatus: (id, status) =>
    db.prepare('UPDATE posts SET status = ? WHERE id = ?').run(status, id),
  update: (id, fields) => {
    const sets = Object.keys(fields).map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE posts SET ${sets} WHERE id = @id`).run({ id, ...fields });
    return dbPosts.get(id);
  },
  remove: (id) => db.prepare('DELETE FROM posts WHERE id = ?').run(id)
};

export const dbOrders = {
  list: () => db.prepare('SELECT * FROM orders ORDER BY id DESC').all().map(rowToOrder),
  get: (id) => {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    return row ? rowToOrder(row) : null;
  },
  create: (order) => {
    const info = db.prepare(
      `INSERT INTO orders (post_id, caption, price, seller, buyer, rank, ml_id, server_id, platform, hero, premium, files_json, payment_method, status, created_at)
       VALUES (@postId, @caption, @price, @seller, @buyer, @rank, @mlId, @serverId, @platform, @hero, @premium, @filesJson, @paymentMethod, @status, @createdAt)`
    ).run({
      ...order,
      hero: order.hero || '',
      premium: num(order.premium),
      filesJson: JSON.stringify(order.files || [])
    });
    return dbOrders.get(info.lastInsertRowid);
  },
  updateStatus: (postId, buyer, status) =>
    db.prepare('UPDATE orders SET status = ? WHERE post_id = ? AND buyer = ?').run(status, postId, buyer)
};

export const dbRequests = {
  list: () => db.prepare('SELECT * FROM midman_requests ORDER BY id DESC').all().map(rowToRequest),
  create: (req) => {
    const info = db.prepare(
      `INSERT INTO midman_requests (post_id, caption, buyer, seller, price, payment_method, midman, premium, midman_fee, status, chat_json, created_at)
       VALUES (@postId, @caption, @buyer, @seller, @price, @paymentMethod, @midman, @premium, @midmanFee, @status, @chatJson, @createdAt)`
    ).run({ ...req, premium: num(req.premium), chatJson: JSON.stringify(req.chat || []) });
    return dbRequests.get(info.lastInsertRowid);
  },
  get: (id) => {
    const row = db.prepare('SELECT * FROM midman_requests WHERE id = ?').get(Number(id));
    return row ? rowToRequest(row) : null;
  },
  update: (id, fields) => {
    const data = { ...fields };
    if (data.chat) data.chatJson = JSON.stringify(data.chat);
    delete data.chat;
    const sets = Object.keys(data).map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE midman_requests SET ${sets} WHERE id = @id`).run({ id, ...data });
    return dbRequests.get(id);
  },
  remove: (id) => db.prepare('DELETE FROM midman_requests WHERE id = ?').run(id)
};

export const dbVerifications = {
  list: () => db.prepare('SELECT * FROM verifications ORDER BY id DESC').all(),
  create: (v) => {
    const info = db.prepare(
      `INSERT INTO verifications (username, id_type, address, fb_link1, fb_link2, files_json, status, submitted_at)
       VALUES (@username, @idType, @address, @fbLink1, @fbLink2, @filesJson, @status, @submittedAt)`
    ).run({
      ...v,
      filesJson: JSON.stringify(v.files || []),
      status: v.status || 'pending',
      submittedAt: v.submittedAt || new Date().toISOString()
    });
    return db.prepare('SELECT * FROM verifications WHERE id = ?').get(info.lastInsertRowid);
  },
  setStatus: (id, status) =>
    db.prepare('UPDATE verifications SET status = ? WHERE id = ?').run(status, id)
};

export const dbTransactions = {
  list: () => db.prepare('SELECT * FROM transactions ORDER BY id DESC').all(),
  create: (t) => {
    const info = db.prepare(
      `INSERT INTO transactions (caption, buyer, seller, price, midman, premium, midman_fee, status, closed_by, closed_at)
       VALUES (@caption, @buyer, @seller, @price, @midman, @premium, @midmanFee, @status, @closedBy, @closedAt)`
    ).run({ ...t, premium: num(t.premium) });
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
  }
};

export const dbNotifications = {
  list: () => db.prepare('SELECT * FROM notifications ORDER BY id DESC').all(),
  forUser: (username) =>
    db.prepare('SELECT * FROM notifications WHERE username = ? ORDER BY id DESC').all(username.toLowerCase()),
  create: (username, message, type = 'info') =>
    db.prepare(
      'INSERT INTO notifications (username, message, type, read, created_at) VALUES (?, ?, ?, 0, ?)'
    ).run(username.toLowerCase(), message, type, new Date().toISOString()),
  markRead: (id) => db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id),
  markAllRead: (username) =>
    db.prepare('UPDATE notifications SET read = 1 WHERE username = ?').run(username.toLowerCase())
};

function rowToPost(row) {
  return {
    id: row.id,
    seller: row.seller,
    caption: row.caption,
    price: row.price,
    rank: row.rank,
    hero: row.hero,
    mlId: row.ml_id,
    serverId: row.server_id,
    securityLock: row.security_lock,
    platform: row.platform,
    premium: bool(row.premium),
    status: row.status,
    files: safeParse(row.files_json),
    createdAt: row.created_at
  };
}

function rowToOrder(row) {
  return {
    id: row.id,
    postId: row.post_id,
    caption: row.caption,
    price: row.price,
    seller: row.seller,
    buyer: row.buyer,
    rank: row.rank,
    mlId: row.ml_id,
    serverId: row.server_id,
    platform: row.platform,
    hero: row.hero,
    premium: bool(row.premium),
    files: safeParse(row.files_json),
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at
  };
}

function rowToRequest(row) {
  return {
    id: row.id,
    postId: row.post_id,
    caption: row.caption,
    buyer: row.buyer,
    seller: row.seller,
    price: row.price,
    paymentMethod: row.payment_method,
    midman: row.midman,
    premium: bool(row.premium),
    midmanFee: row.midman_fee,
    status: row.status,
    chat: safeParse(row.chat_json),
    createdAt: row.created_at
  };
}

function safeParse(json) {
  try {
    const v = JSON.parse(json);
    return v || [];
  } catch {
    return [];
  }
}

export default db;
