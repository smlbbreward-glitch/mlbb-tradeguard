import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const USE_SQLITE = process.env.ENABLE_SQLITE === '1';
const KV_KEY = process.env.KV_KEY || 'tradeguard:db';

// Upstash Redis (recommended Vercel storage integration) uses a REST API
// with these two env vars, injected automatically when you add the
// Upstash integration from the Vercel Marketplace.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let remoteStore = null;
if (UPSTASH_URL && UPSTASH_TOKEN) {
  const upstash = async (cmd, ...args) => {
    const res = await fetch(`${UPSTASH_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const json = await res.json();
    return json.result;
  };
  remoteStore = {
    get: async () => { const raw = await upstash('get', KV_KEY); return raw ? JSON.parse(raw) : null; },
    set: async (value) => { await upstash('set', KV_KEY, JSON.stringify(value)); }
  };
  console.log('[db] Using Upstash Redis persistence');
} else {
  const USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (USE_KV) {
    try {
      const mod = await import('@vercel/kv');
      remoteStore = {
        get: async () => { try { return (await mod.kv.get(KV_KEY)) || null; } catch { return null; } },
        set: async (value) => { try { await mod.kv.set(KV_KEY, value); } catch (e) { console.error('KV save failed:', e.message); } }
      };
      console.log('[db] Using Vercel KV persistence');
    } catch (e) {
      console.error('Failed to load @vercel/kv, falling back to file store:', e.message);
    }
  }
}

const num = (v) => (v ? 1 : 0);
const bool = (v) => v === 1 || v === true;
const safeParse = (json) => { try { return JSON.parse(json) || []; } catch { return []; } };

function makeStore(persist) {
  const empty = () => ({ users: [], posts: [], orders: [], midman_requests: [], verifications: [], transactions: [], notifications: [] });
  let data = empty();
  let seq = 1;

  const load = async () => {
    if (persist.load) { try { const d = await persist.load(); if (d) { data = d; } } catch (e) { console.error('DB load failed:', e.message); } }
    seq = Math.max(0, ...Object.values(data).flatMap((arr) => (Array.isArray(arr) ? arr.map((r) => r.id || 0) : [0]))) + 1;
  };

  const save = async () => {
    seq = Math.max(seq, ...Object.values(data).flatMap((arr) => (Array.isArray(arr) ? arr.map((r) => r.id || 0) : [0]))) + 1;
    if (persist.save) { try { await persist.save(data); } catch (e) { console.error('DB save failed:', e.message); } }
  };

  const rowToPost = (row) => ({ id: row.id, seller: row.seller, caption: row.caption, price: row.price, rank: row.rank, hero: row.hero, mlId: row.ml_id, serverId: row.server_id, securityLock: row.security_lock, platform: row.platform, premium: bool(row.premium), status: row.status, files: safeParse(row.files_json), createdAt: row.created_at });
  const rowToOrder = (row) => ({ id: row.id, postId: row.post_id, caption: row.caption, price: row.price, seller: row.seller, buyer: row.buyer, rank: row.rank, mlId: row.ml_id, serverId: row.server_id, platform: row.platform, hero: row.hero, premium: bool(row.premium), files: safeParse(row.files_json), paymentMethod: row.payment_method, status: row.status, createdAt: row.created_at });
  const rowToRequest = (row) => ({ id: row.id, postId: row.post_id, caption: row.caption, buyer: row.buyer, seller: row.seller, price: row.price, paymentMethod: row.payment_method, midman: row.midman, premium: bool(row.premium), midmanFee: row.midman_fee, status: row.status, chat: safeParse(row.chat_json), createdAt: row.created_at });

  const ensure = (fn) => async (...args) => { const r = fn(...args); await save(); return r; };

  const db = {
    dbUsers: {
      findByUsername: (u) => data.users.find((x) => x.username === u.toLowerCase()) || null,
      list: () => data.users.map((u) => ({ id: u.id, username: u.username, role: u.role, is_verified: u.is_verified, verification_status: u.verification_status, password: u.password || '', created_at: u.created_at })),
      create: ensure((u, h, role = 'user', plain = '') => { const row = { id: seq++, username: u.toLowerCase(), password_hash: h, password: plain || '', role, is_verified: 0, verification_status: 'not_started', created_at: new Date().toISOString() }; data.users.push(row); return row; }),
      setRole: ensure((u, role) => { const row = data.users.find((x) => x.username === u.toLowerCase()); if (row) row.role = role; }),
      updatePassword: ensure((u, h) => { const row = data.users.find((x) => x.username === u.toLowerCase()); if (row) row.password_hash = h; }),
      remove: ensure((u) => { data.users = data.users.filter((x) => x.username !== u.toLowerCase()); }),
      setVerification: ensure((u, { isVerified, verificationStatus, declineReason = '' }) => { const row = data.users.find((x) => x.username === u.toLowerCase()); if (row) { row.is_verified = num(isVerified); row.verification_status = verificationStatus; row.decline_reason = declineReason; } })
    },
    dbPosts: {
      list: () => data.posts.map(rowToPost),
      get: (id) => { const r = data.posts.find((p) => p.id === Number(id)); return r ? rowToPost(r) : null; },
      create: ensure((p) => { const r = { id: seq++, seller: p.seller, caption: p.caption, price: p.price, rank: p.rank || '', hero: p.hero || '', ml_id: p.mlId || '', server_id: p.serverId || '', security_lock: p.securityLock || '', platform: p.platform || 'Mobile Legends', premium: num(p.premium), status: p.status || 'available', files_json: JSON.stringify(p.files || []), created_at: p.createdAt || new Date().toISOString() }; data.posts.push(r); return rowToPost(r); }),
      updateStatus: ensure((id, status) => { const r = data.posts.find((p) => p.id === Number(id)); if (r) r.status = status; }),
      update: ensure((id, fields) => { const r = data.posts.find((p) => p.id === Number(id)); if (r) { Object.assign(r, fields, { id: Number(id) }); return rowToPost(r); } }),
      remove: ensure((id) => { data.posts = data.posts.filter((p) => p.id !== Number(id)); })
    },
    dbOrders: {
      list: () => data.orders.map(rowToOrder),
      get: (id) => { const r = data.orders.find((o) => o.id === Number(id)); return r ? rowToOrder(r) : null; },
      create: ensure((o) => { const r = { id: seq++, post_id: o.postId, caption: o.caption, price: o.price, seller: o.seller, buyer: o.buyer, rank: o.rank || '', ml_id: o.mlId || '', server_id: o.serverId || '', platform: o.platform || '', hero: o.hero || '', premium: num(o.premium), files_json: JSON.stringify(o.files || []), payment_method: o.paymentMethod, status: o.status || 'pending', created_at: o.createdAt || new Date().toISOString() }; data.orders.push(r); return rowToOrder(r); }),
      updateStatus: ensure((postId, buyer, status) => { const r = data.orders.find((o) => o.post_id === postId && o.buyer === buyer); if (r) r.status = status; })
    },
    dbRequests: {
      list: () => data.midman_requests.map(rowToRequest),
      get: (id) => { const r = data.midman_requests.find((q) => q.id === Number(id)); return r ? rowToRequest(r) : null; },
      create: ensure((q) => { const r = { id: seq++, post_id: q.postId, caption: q.caption, buyer: q.buyer, seller: q.seller, price: q.price, payment_method: q.paymentMethod, midman: q.midman || 'Pending', premium: num(q.premium), midman_fee: q.midmanFee || 0, status: q.status || 'Pending', chat_json: JSON.stringify(q.chat || []), created_at: q.createdAt || new Date().toISOString() }; data.midman_requests.push(r); return rowToRequest(r); }),
      update: ensure((id, fields) => { const r = data.midman_requests.find((q) => q.id === Number(id)); if (r) { const d = { ...fields }; if (d.chat) d.chat_json = JSON.stringify(d.chat); delete d.chat; Object.assign(r, d, { id: Number(id) }); return rowToRequest(r); } }),
      remove: ensure((id) => { data.midman_requests = data.midman_requests.filter((q) => q.id !== Number(id)); })
    },
    dbVerifications: {
      list: () => data.verifications,
      create: ensure((v) => { const r = { id: seq++, username: v.username, id_type: v.idType || '', address: v.address || '', fb_link1: v.fbLink1 || '', fb_link2: v.fbLink2 || '', files_json: JSON.stringify(v.files || []), status: v.status || 'pending', submitted_at: v.submittedAt || new Date().toISOString() }; data.verifications.push(r); return r; }),
      setStatus: ensure((id, status) => { const r = data.verifications.find((v) => v.id === Number(id)); if (r) r.status = status; })
    },
    dbTransactions: {
      list: () => data.transactions,
      create: ensure((t) => { const r = { id: seq++, caption: t.caption, buyer: t.buyer, seller: t.seller, price: t.price, midman: t.midman, premium: num(t.premium), midman_fee: t.midmanFee || 0, status: t.status || 'Success', closed_by: t.closedBy || '', closed_at: t.closedAt || '' }; data.transactions.push(r); return r; })
    },
    dbNotifications: {
      list: () => data.notifications,
      forUser: (u) => data.notifications.filter((n) => n.username === u.toLowerCase()),
      create: ensure((u, message, type = 'info') => { const n = { id: seq++, username: u.toLowerCase(), message, type, read: 0, created_at: new Date().toISOString() }; data.notifications.push(n); return n; }),
      markRead: ensure((id) => { const n = data.notifications.find((x) => x.id === Number(id)); if (n) n.read = 1; }),
      markAllRead: ensure((u) => { data.notifications.filter((n) => n.username === u.toLowerCase()).forEach((n) => { n.read = 1; }); })
    },
    resetAll: ensure(() => {
      data.users = data.users.filter((u) => u.role === 'developer' || u.role === 'admin');
      data.posts = [];
      data.orders = [];
      data.midman_requests = [];
      data.verifications = [];
      data.transactions = [];
      data.notifications = [];
    })
  };

  return { db, load, save };
}

let persist;
if (remoteStore) {
  persist = {
    load: async () => { try { return (await remoteStore.get()) || null; } catch { return null; } },
    save: async (d) => { try { await remoteStore.set(d); } catch (e) { console.error('Remote DB save failed:', e.message); } }
  };
} else {
  const cwd = process.cwd();
  const LOCAL_DIR = (cwd === '/var/task' || cwd === '/home/site/wwwroot') ? '/tmp' : join(cwd, 'data');
  const DB_PATH = process.env.DB_PATH || join(LOCAL_DIR, 'tradeguard.json');
  persist = {
    load: async () => { try { if (!existsSync(DB_PATH)) return null; return JSON.parse(readFileSync(DB_PATH, 'utf8')); } catch { return null; } },
    save: async (d) => { try { mkdirSync(dirname(DB_PATH), { recursive: true }); writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); } catch (e) { console.error('DB save failed (in-memory only):', e.message); } }
  };
}

const { db, load, save } = makeStore(persist);
await load();
console.log('[db] persistence mode:', remoteStore ? 'remote (Upstash/KV)' : 'local file');

export const dbUsers = db.dbUsers;
export const dbPosts = db.dbPosts;
export const dbOrders = db.dbOrders;
export const dbRequests = db.dbRequests;
export const dbVerifications = db.dbVerifications;
export const dbTransactions = db.dbTransactions;
export const dbNotifications = db.dbNotifications;
export const resetAll = db.resetAll;
export default db;
