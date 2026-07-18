import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const USE_SQLITE = process.env.ENABLE_SQLITE === '1';

const num = (v) => (v ? 1 : 0);
const bool = (v) => v === 1 || v === true;
const safeParse = (json) => { try { return JSON.parse(json) || []; } catch { return []; } };

const fallback = (() => {
  try {
   const cwd = process.cwd();
   const LOCAL_DIR = (process.env.NETLIFY === 'true' || cwd === '/var/task') ? '/tmp' : join(cwd, 'data');
   const DB_PATH = process.env.DB_PATH || join(LOCAL_DIR, 'tradeguard.json');
   const empty = () => ({ users: [], posts: [], orders: [], midman_requests: [], verifications: [], transactions: [], notifications: [] });
   const load = () => { try { if (!existsSync(DB_PATH)) return empty(); return JSON.parse(readFileSync(DB_PATH, 'utf8')); } catch { return empty(); } };
   const save = (d) => { try { mkdirSync(dirname(DB_PATH), { recursive: true }); writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); } catch (e) { console.error('DB save failed (in-memory only):', e.message); } };
  let data = load();
  let seq = Math.max(0, ...Object.values(data).flatMap((arr) => (Array.isArray(arr) ? arr.map((r) => r.id || 0) : [0]))) + 1;
  const nextId = () => seq++;
  const rowToPost = (row) => ({ id: row.id, seller: row.seller, caption: row.caption, price: row.price, rank: row.rank, hero: row.hero, mlId: row.ml_id, serverId: row.server_id, securityLock: row.security_lock, platform: row.platform, premium: bool(row.premium), status: row.status, files: safeParse(row.files_json), createdAt: row.created_at });
  const rowToOrder = (row) => ({ id: row.id, postId: row.post_id, caption: row.caption, price: row.price, seller: row.seller, buyer: row.buyer, rank: row.rank, mlId: row.ml_id, serverId: row.server_id, platform: row.platform, hero: row.hero, premium: bool(row.premium), files: safeParse(row.files_json), paymentMethod: row.payment_method, status: row.status, createdAt: row.created_at });
  const rowToRequest = (row) => ({ id: row.id, postId: row.post_id, caption: row.caption, buyer: row.buyer, seller: row.seller, price: row.price, paymentMethod: row.payment_method, midman: row.midman, premium: bool(row.premium), midmanFee: row.midman_fee, status: row.status, chat: safeParse(row.chat_json), createdAt: row.created_at });
  return {
    dbUsers: {
      findByUsername: (u) => data.users.find((x) => x.username === u.toLowerCase()) || null,
      list: () => data.users.map((u) => ({ id: u.id, username: u.username, role: u.role, is_verified: u.is_verified, verification_status: u.verification_status, created_at: u.created_at })),
      create: (u, h, role = 'user') => { const row = { id: nextId(), username: u.toLowerCase(), password_hash: h, role, is_verified: 0, verification_status: 'not_started', created_at: new Date().toISOString() }; data.users.push(row); save(data); return row; },
      setRole: (u, role) => { const row = data.users.find((x) => x.username === u.toLowerCase()); if (row) { row.role = role; save(data); } },
      remove: (u) => { data.users = data.users.filter((x) => x.username !== u.toLowerCase()); save(data); },
      setVerification: (u, { isVerified, verificationStatus, declineReason = '' }) => { const row = data.users.find((x) => x.username === u.toLowerCase()); if (row) { row.is_verified = num(isVerified); row.verification_status = verificationStatus; row.decline_reason = declineReason; save(data); } }
    },
    dbPosts: {
      list: () => data.posts.map(rowToPost),
      get: (id) => { const r = data.posts.find((p) => p.id === Number(id)); return r ? rowToPost(r) : null; },
      create: (p) => { const r = { id: nextId(), seller: p.seller, caption: p.caption, price: p.price, rank: p.rank || '', hero: p.hero || '', ml_id: p.mlId || '', server_id: p.serverId || '', security_lock: p.securityLock || '', platform: p.platform || 'Mobile Legends', premium: num(p.premium), status: p.status || 'available', files_json: JSON.stringify(p.files || []), created_at: p.createdAt || new Date().toISOString() }; data.posts.push(r); save(data); return rowToPost(r); },
      updateStatus: (id, status) => { const r = data.posts.find((p) => p.id === Number(id)); if (r) { r.status = status; save(data); } },
      update: (id, fields) => { const r = data.posts.find((p) => p.id === Number(id)); if (r) { Object.assign(r, fields, { id: Number(id) }); save(data); return rowToPost(r); } },
      remove: (id) => { data.posts = data.posts.filter((p) => p.id !== Number(id)); save(data); }
    },
    dbOrders: {
      list: () => data.orders.map(rowToOrder),
      get: (id) => { const r = data.orders.find((o) => o.id === Number(id)); return r ? rowToOrder(r) : null; },
      create: (o) => { const r = { id: nextId(), post_id: o.postId, caption: o.caption, price: o.price, seller: o.seller, buyer: o.buyer, rank: o.rank || '', ml_id: o.mlId || '', server_id: o.serverId || '', platform: o.platform || '', hero: o.hero || '', premium: num(o.premium), files_json: JSON.stringify(o.files || []), payment_method: o.paymentMethod, status: o.status || 'pending', created_at: o.createdAt || new Date().toISOString() }; data.orders.push(r); save(data); return rowToOrder(r); },
      updateStatus: (postId, buyer, status) => { const r = data.orders.find((o) => o.post_id === postId && o.buyer === buyer); if (r) { r.status = status; save(data); } }
    },
    dbRequests: {
      list: () => data.midman_requests.map(rowToRequest),
      get: (id) => { const r = data.midman_requests.find((q) => q.id === Number(id)); return r ? rowToRequest(r) : null; },
      create: (q) => { const r = { id: nextId(), post_id: q.postId, caption: q.caption, buyer: q.buyer, seller: q.seller, price: q.price, payment_method: q.paymentMethod, midman: q.midman || 'Pending', premium: num(q.premium), midman_fee: q.midmanFee || 0, status: q.status || 'Pending', chat_json: JSON.stringify(q.chat || []), created_at: q.createdAt || new Date().toISOString() }; data.midman_requests.push(r); save(data); return rowToRequest(r); },
      update: (id, fields) => { const r = data.midman_requests.find((q) => q.id === Number(id)); if (r) { const d = { ...fields }; if (d.chat) d.chat_json = JSON.stringify(d.chat); delete d.chat; Object.assign(r, d, { id: Number(id) }); save(data); return rowToRequest(r); } },
      remove: (id) => { data.midman_requests = data.midman_requests.filter((q) => q.id !== Number(id)); save(data); }
    },
    dbVerifications: {
      list: () => data.verifications,
      create: (v) => { const r = { id: nextId(), username: v.username, id_type: v.idType || '', address: v.address || '', fb_link1: v.fbLink1 || '', fb_link2: v.fbLink2 || '', files_json: JSON.stringify(v.files || []), status: v.status || 'pending', submitted_at: v.submittedAt || new Date().toISOString() }; data.verifications.push(r); save(data); return r; },
      setStatus: (id, status) => { const r = data.verifications.find((v) => v.id === Number(id)); if (r) { r.status = status; save(data); } }
    },
    dbTransactions: {
      list: () => data.transactions,
      create: (t) => { const r = { id: nextId(), caption: t.caption, buyer: t.buyer, seller: t.seller, price: t.price, midman: t.midman, premium: num(t.premium), midman_fee: t.midmanFee || 0, status: t.status || 'Success', closed_by: t.closedBy || '', closed_at: t.closedAt || '' }; data.transactions.push(r); save(data); return r; }
    },
    dbNotifications: {
      list: () => data.notifications,
      forUser: (u) => data.notifications.filter((n) => n.username === u.toLowerCase()),
      create: (u, message, type = 'info') => { const n = { id: nextId(), username: u.toLowerCase(), message, type, read: 0, created_at: new Date().toISOString() }; data.notifications.push(n); save(data); return n; },
      markRead: (id) => { const n = data.notifications.find((x) => x.id === Number(id)); if (n) { n.read = 1; save(data); } },
      markAllRead: (u) => { data.notifications.filter((n) => n.username === u.toLowerCase()).forEach((n) => { n.read = 1; }); save(data); }
    }
  };
 } catch (e) {
   console.error('Fallback DB init failed, using in-memory store:', e.message);
   const mem = { users: [], posts: [], orders: [], midman_requests: [], verifications: [], transactions: [], notifications: [] };
   let mid = 1;
   return {
     dbUsers: { findByUsername: (u) => mem.users.find((x) => x.username === u.toLowerCase()) || null, list: () => mem.users, create: (u, h, role = 'user') => { const r = { id: mid++, username: u.toLowerCase(), password_hash: h, role, is_verified: 0, verification_status: 'not_started', created_at: new Date().toISOString() }; mem.users.push(r); return r; }, setRole: () => {}, remove: () => {}, setVerification: () => {} },
     dbPosts: { list: () => mem.posts, get: () => null, create: (p) => { const r = { id: mid++, ...p }; mem.posts.push(r); return r; }, updateStatus: () => {}, update: () => null, remove: () => {} },
     dbOrders: { list: () => mem.orders, get: () => null, create: (o) => { const r = { id: mid++, ...o }; mem.orders.push(r); return r; }, updateStatus: () => {} },
     dbRequests: { list: () => mem.midman_requests, get: () => null, create: (q) => { const r = { id: mid++, ...q }; mem.midman_requests.push(r); return r; }, update: () => null, remove: () => {} },
     dbVerifications: { list: () => mem.verifications, create: (v) => { const r = { id: mid++, ...v }; mem.verifications.push(r); return r; }, setStatus: () => {} },
     dbTransactions: { list: () => mem.transactions, create: (t) => { const r = { id: mid++, ...t }; mem.transactions.push(r); return r; } },
     dbNotifications: { list: () => mem.notifications, forUser: () => [], create: (u, m) => ({ id: mid++, username: u, message: m }), markRead: () => {}, markAllRead: () => {} }
   };
 }
})();

const impl = fallback;

export const dbUsers = impl.dbUsers;
export const dbPosts = impl.dbPosts;
export const dbOrders = impl.dbOrders;
export const dbRequests = impl.dbRequests;
export const dbVerifications = impl.dbVerifications;
export const dbTransactions = impl.dbTransactions;
export const dbNotifications = impl.dbNotifications;
export default impl;
