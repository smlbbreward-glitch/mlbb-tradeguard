const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const LOCAL_DIR = process.env.NETLIFY ? '/tmp' : join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || join(LOCAL_DIR, 'tradeguard.json');
mkdirSync(LOCAL_DIR, { recursive: true });

const empty = () => ({ users: [], posts: [], orders: [], midman_requests: [], verifications: [], transactions: [], notifications: [] });
const load = () => { if (!existsSync(DB_PATH)) return empty(); try { return JSON.parse(readFileSync(DB_PATH, 'utf8')); } catch { return empty(); } };
const save = (data) => writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

let data = load();
let seq = Math.max(0, ...Object.values(data).flatMap((arr) => (Array.isArray(arr) ? arr.map((r) => r.id || 0) : [0]))) + 1;
const nextId = () => seq++;
const num = (v) => (v ? 1 : 0);
const bool = (v) => v === 1 || v === true;
const safeParse = (json) => { try { return JSON.parse(json) || []; } catch { return []; } };

const dbUsers = {
  findByUsername: (username) => data.users.find((u) => u.username === username.toLowerCase()) || null,
  list: () => data.users.map((u) => ({ id: u.id, username: u.username, role: u.role, is_verified: u.is_verified, verification_status: u.verification_status, created_at: u.created_at })),
  create: (username, passwordHash, role = 'user') => { const u = { id: nextId(), username: username.toLowerCase(), password_hash: passwordHash, role, is_verified: 0, verification_status: 'not_started', created_at: new Date().toISOString() }; data.users.push(u); save(data); return u; },
  setRole: (username, role) => { const u = dbUsers.findByUsername(username); if (u) { u.role = role; save(data); } },
  remove: (username) => { data.users = data.users.filter((u) => u.username !== username.toLowerCase()); save(data); },
  setVerification: (username, { isVerified, verificationStatus, declineReason = '' }) => { const u = dbUsers.findByUsername(username); if (u) { u.is_verified = num(isVerified); u.verification_status = verificationStatus; u.decline_reason = declineReason; save(data); } }
};

const rowToPost = (row) => ({ id: row.id, seller: row.seller, caption: row.caption, price: row.price, rank: row.rank, hero: row.hero, mlId: row.ml_id, serverId: row.server_id, securityLock: row.security_lock, platform: row.platform, premium: bool(row.premium), status: row.status, files: safeParse(row.files_json), createdAt: row.created_at });
const rowToOrder = (row) => ({ id: row.id, postId: row.post_id, caption: row.caption, price: row.price, seller: row.seller, buyer: row.buyer, rank: row.rank, mlId: row.ml_id, serverId: row.server_id, platform: row.platform, hero: row.hero, premium: bool(row.premium), files: safeParse(row.files_json), paymentMethod: row.payment_method, status: row.status, createdAt: row.created_at });
const rowToRequest = (row) => ({ id: row.id, postId: row.post_id, caption: row.caption, buyer: row.buyer, seller: row.seller, price: row.price, paymentMethod: row.payment_method, midman: row.midman, premium: bool(row.premium), midmanFee: row.midman_fee, status: row.status, chat: safeParse(row.chat_json), createdAt: row.created_at });

const dbPosts = {
  list: () => data.posts.map(rowToPost),
  get: (id) => { const r = data.posts.find((p) => p.id === Number(id)); return r ? rowToPost(r) : null; },
  create: (post) => { const r = { id: nextId(), seller: post.seller, caption: post.caption, price: post.price, rank: post.rank || '', hero: post.hero || '', ml_id: post.mlId || '', server_id: post.serverId || '', security_lock: post.securityLock || '', platform: post.platform || 'Mobile Legends', premium: num(post.premium), status: post.status || 'available', files_json: JSON.stringify(post.files || []), created_at: post.createdAt || new Date().toISOString() }; data.posts.push(r); save(data); return rowToPost(r); },
  updateStatus: (id, status) => { const r = data.posts.find((p) => p.id === Number(id)); if (r) { r.status = status; save(data); } },
  update: (id, fields) => { const r = data.posts.find((p) => p.id === Number(id)); if (r) { Object.assign(r, fields, { id: Number(id) }); save(data); return rowToPost(r); } },
  remove: (id) => { data.posts = data.posts.filter((p) => p.id !== Number(id)); save(data); }
};

const dbOrders = {
  list: () => data.orders.map(rowToOrder),
  get: (id) => { const r = data.orders.find((o) => o.id === Number(id)); return r ? rowToOrder(r) : null; },
  create: (order) => { const r = { id: nextId(), post_id: order.postId, caption: order.caption, price: order.price, seller: order.seller, buyer: order.buyer, rank: order.rank || '', ml_id: order.mlId || '', server_id: order.serverId || '', platform: order.platform || '', hero: order.hero || '', premium: num(order.premium), files_json: JSON.stringify(order.files || []), payment_method: order.paymentMethod, status: order.status || 'pending', created_at: order.createdAt || new Date().toISOString() }; data.orders.push(r); save(data); return rowToOrder(r); },
  updateStatus: (postId, buyer, status) => { const r = data.orders.find((o) => o.post_id === postId && o.buyer === buyer); if (r) { r.status = status; save(data); } }
};

const dbRequests = {
  list: () => data.midman_requests.map(rowToRequest),
  get: (id) => { const r = data.midman_requests.find((q) => q.id === Number(id)); return r ? rowToRequest(r) : null; },
  create: (req) => { const r = { id: nextId(), post_id: req.postId, caption: req.caption, buyer: req.buyer, seller: req.seller, price: req.price, payment_method: req.paymentMethod, midman: req.midman || 'Pending', premium: num(req.premium), midman_fee: req.midmanFee || 0, status: req.status || 'Pending', chat_json: JSON.stringify(req.chat || []), created_at: req.createdAt || new Date().toISOString() }; data.midman_requests.push(r); save(data); return rowToRequest(r); },
  update: (id, fields) => { const r = data.midman_requests.find((q) => q.id === Number(id)); if (r) { const d = { ...fields }; if (d.chat) d.chat_json = JSON.stringify(d.chat); delete d.chat; Object.assign(r, d, { id: Number(id) }); save(data); return rowToRequest(r); } },
  remove: (id) => { data.midman_requests = data.midman_requests.filter((q) => q.id !== Number(id)); save(data); }
};

const dbVerifications = {
  list: () => data.verifications,
  create: (v) => { const r = { id: nextId(), username: v.username, id_type: v.idType || '', address: v.address || '', fb_link1: v.fbLink1 || '', fb_link2: v.fbLink2 || '', files_json: JSON.stringify(v.files || []), status: v.status || 'pending', submitted_at: v.submittedAt || new Date().toISOString() }; data.verifications.push(r); save(data); return r; },
  setStatus: (id, status) => { const r = data.verifications.find((v) => v.id === Number(id)); if (r) { r.status = status; save(data); } }
};

const dbTransactions = {
  list: () => data.transactions,
  create: (t) => { const r = { id: nextId(), caption: t.caption, buyer: t.buyer, seller: t.seller, price: t.price, midman: t.midman, premium: num(t.premium), midman_fee: t.midmanFee || 0, status: t.status || 'Success', closed_by: t.closedBy || '', closed_at: t.closedAt || '' }; data.transactions.push(r); save(data); return r; }
};

const dbNotifications = {
  list: () => data.notifications,
  forUser: (username) => data.notifications.filter((n) => n.username === username.toLowerCase()),
  create: (username, message, type = 'info') => { const n = { id: nextId(), username: username.toLowerCase(), message, type, read: 0, created_at: new Date().toISOString() }; data.notifications.push(n); save(data); return n; },
  markRead: (id) => { const n = data.notifications.find((x) => x.id === Number(id)); if (n) { n.read = 1; save(data); } },
  markAllRead: (username) => { data.notifications.filter((n) => n.username === username.toLowerCase()).forEach((n) => { n.read = 1; }); save(data); }
};

module.exports = { dbUsers, dbPosts, dbOrders, dbRequests, dbVerifications, dbTransactions, dbNotifications, default: data };
