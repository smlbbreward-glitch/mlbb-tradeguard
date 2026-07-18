import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

import {
  dbUsers,
  dbPosts,
  dbOrders,
  dbRequests,
  dbVerifications,
  dbTransactions,
  dbNotifications,
  dbSetLastSeen,
  resetAll
} from './server/db.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'mlbb-tradeguard-secret-2026';
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'chrisford').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chrisford';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'chrisfordgutierrez23@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ALERT_FROM = process.env.ALERT_FROM || 'TradeGuard Alerts <onboarding@resend.dev>';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const clientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

const generateSecurityCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const safeParseJson = (json) => {
  try { return JSON.parse(json) || []; } catch { return []; }
};

const sendDevLoginAlert = async (username, req) => {
  const code = generateSecurityCode();
  const time = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  const ip = clientIp(req);

  const subject = `🔐 Dev Login Alert — ${username}`;
  const text =
    `Someone just logged into your developer account "${username}".\n\n` +
    `Time: ${time}\n` +
    `IP: ${ip}\n` +
    `Security code: ${code}\n\n` +
    `If this was not you, secure your account immediately.`;

  const tasks = [];
  if (resend) {
    tasks.push(
      resend.emails
        .send({ from: ALERT_FROM, to: ALERT_EMAIL, subject, text })
        .catch((e) => console.error('Login alert email failed:', e))
    );
  }
  await Promise.all(tasks);
};

const sendDiscordVerificationAlert = async (submission) => {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    const files = Array.isArray(submission.files) ? submission.files : [];
    const embeds = [
      {
        title: '🔔 New Verification Submission',
        color: 0x00d4ff,
        fields: [
          { name: 'Username', value: submission.username || 'Unknown', inline: true },
          { name: 'ID Type', value: submission.idType || 'N/A', inline: true },
          { name: 'Status', value: submission.status || 'pending', inline: true },
          { name: 'Address', value: submission.address || 'N/A' },
          { name: 'FB Link 1', value: submission.fbLink1 || 'N/A' },
          { name: 'FB Link 2', value: submission.fbLink2 || 'N/A' },
          { name: 'Attachments', value: files.length ? `${files.length} file(s)` : 'None' }
        ],
        timestamp: new Date().toISOString()
      }
    ];
    const payload = { username: 'TradeGuard Verifications', embeds };
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error('Discord alert failed:', res.status);
  } catch (e) {
    console.error('Discord alert error:', e.message);
  }
};

app.use(cors());
app.use(express.json({ limit: '12mb' }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const possibleDirs = [
  join(__dirname, 'public'),
  join(__dirname, 'dist'),
  join(process.cwd(), 'public'),
  join(process.cwd(), 'dist'),
  '/vercel/path0/public',
  '/vercel/path0/dist',
  '/vercel/output/public',
  '/vercel/output/dist',
  '/var/task/public',
  '/var/task/dist'
];
const DIST_DIR = possibleDirs.find((d) => existsSync(join(d, 'index.html'))) || join(__dirname, 'public');

app.use((req, res, next) => {
  console.log('[server]', req.method, req.url, '->', req.path);
  next();
});

app.use(express.static(DIST_DIR));

app.get('/', (req, res) => {
  try {
    const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
    res.type('html').send(html);
  } catch (e) {
    console.error('Failed to serve index.html:', e);
    res.status(500).json({ error: 'Failed to load app' });
  }
});

app.head('/', (req, res) => {
  res.status(200).end();
});

app.get('/api/health', (req, res) => {
  const storage = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)
    ? 'persistent'
    : 'ephemeral';
  res.json({ status: 'ok', time: new Date().toISOString(), storage });
});

// Seed admin account
const adminRow = dbUsers.findByUsername(ADMIN_USERNAME);
if (!adminRow) {
  dbUsers.create(ADMIN_USERNAME, bcrypt.hashSync(ADMIN_PASSWORD, 10), 'developer', ADMIN_PASSWORD);
  dbUsers.setVerification(ADMIN_USERNAME, { isVerified: true, verificationStatus: 'approved' });
} else {
  dbUsers.updatePassword(ADMIN_USERNAME, bcrypt.hashSync(ADMIN_PASSWORD, 10));
  if (adminRow.role !== 'developer') dbUsers.setRole(ADMIN_USERNAME, 'developer');
  dbUsers.setVerification(ADMIN_USERNAME, { isVerified: true, verificationStatus: 'approved' });
}

const hashPassword = (password) => bcrypt.hash(password, 10);
const comparePassword = (password, hash) => bcrypt.compare(password, hash);

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'developer' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const serializeUser = (row) => ({
  username: row.username,
  role: row.role,
  isVerified: !!row.is_verified,
  verificationStatus: row.verification_status,
  lastSeen: row.last_seen || null,
  password: row.password || ''
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalized = username?.trim().toLowerCase();
    if (!normalized || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const row = dbUsers.findByUsername(normalized);
    if (!row || !(await comparePassword(password, row.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = row.role;
    const token = jwt.sign({ username: row.username, role }, JWT_SECRET, { expiresIn: '24h' });
    const user = { username: row.username, role, isVerified: !!row.is_verified };

    if (role === 'developer' || role === 'admin') {
      await sendDevLoginAlert(row.username, req);
    }

    await dbSetLastSeen(row.username);

    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalized = username?.trim().toLowerCase();
    if (!normalized || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (normalized.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (dbUsers.findByUsername(normalized)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    await dbUsers.create(normalized, await hashPassword(password), 'user', password);
    res.status(201).json({ message: 'Account created successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users (admin)
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  res.json(dbUsers.list());
});

app.post('/api/admin/users/:username/promote', authenticate, requireAdmin, async (req, res) => {
  const username = req.params.username.toLowerCase();
  if (!dbUsers.findByUsername(username)) return res.status(404).json({ error: 'User not found' });
  await dbUsers.setRole(username, 'middleman');
  res.json({ message: 'User promoted to middleman' });
});

app.delete('/api/admin/users/:username', authenticate, requireAdmin, async (req, res) => {
  const username = req.params.username.toLowerCase();
  if (username === ADMIN_USERNAME) return res.status(400).json({ error: 'Cannot delete admin' });
  await dbUsers.remove(username);
  res.json({ message: 'User deleted' });
});

app.post('/api/admin/reset', authenticate, requireAdmin, (req, res) => {
  resetAll();
  res.json({ message: 'All data reset successfully. Admin accounts preserved.' });
});

// Verifications
app.post('/api/verification/submit', authenticate, async (req, res) => {
  const rawFiles = Array.isArray(req.body.uploadedFiles) ? req.body.uploadedFiles : [];
  const files = rawFiles.map((f, i) => ({
    name: f?.name && f.name !== 'image.png' ? f.name : `upload_${i + 1}`,
    type: f?.type || 'unknown',
    dataUrl: typeof f?.dataUrl === 'string' ? f.dataUrl : ''
  }));
  const submission = await dbVerifications.create({
    username: req.user.username,
    idType: req.body.idType,
    address: req.body.address,
    fbLink1: req.body.fbLink1,
    fbLink2: req.body.fbLink2,
    files: files,
    status: 'pending'
  });
  sendDiscordVerificationAlert({
    username: submission.username,
    idType: req.body.idType,
    address: submission.address,
    fbLink1: req.body.fbLink1,
    fbLink2: req.body.fbLink2,
    files: files,
    status: submission.status
  });
  res.status(201).json({ message: 'Verification submitted', id: submission.id });
});

app.get('/api/admin/verifications', authenticate, requireAdmin, (req, res) => {
  const list = dbVerifications.list().map((v) => ({
    id: v.id,
    username: v.username,
    idType: v.id_type,
    address: v.address,
    fbLink1: v.fb_link1,
    fbLink2: v.fb_link2,
    files: safeParseJson(v.files_json),
    status: v.status,
    submittedAt: v.submitted_at
  }));
  res.json(list);
});

app.post('/api/admin/verifications/:id/approve', authenticate, requireAdmin, async (req, res) => {
  const v = dbVerifications.list().find((x) => String(x.id) === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  await dbVerifications.setStatus(v.id, 'approved');
  await dbUsers.setVerification(v.username, { isVerified: true, verificationStatus: 'approved' });
  res.json({ message: 'Verification approved' });
});

app.post('/api/admin/verifications/:id/decline', authenticate, requireAdmin, async (req, res) => {
  const v = dbVerifications.list().find((x) => String(x.id) === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  const reason = req.body.reason || 'No further details provided.';
  await dbVerifications.setStatus(v.id, 'declined');
  await dbUsers.setVerification(v.username, { isVerified: false, verificationStatus: 'declined', declineReason: reason });
  res.json({ message: 'Verification declined' });
});

// Marketplace posts
app.get('/api/marketplace/posts', (req, res) => {
  res.json(dbPosts.list());
});

app.post('/api/marketplace/posts', authenticate, async (req, res) => {
  const user = dbUsers.findByUsername(req.user.username);
  if (!user?.is_verified) {
    return res.status(403).json({ error: 'You must be verified before you can sell.' });
  }
  const post = await dbPosts.create({
    seller: req.user.username,
    caption: req.body.caption,
    price: req.body.price,
    rank: req.body.rank,
    hero: req.body.hero,
    mlId: req.body.mlId,
    serverId: req.body.serverId,
    securityLock: req.body.securityLock,
    platform: req.body.platform || 'Mobile Legends',
    premium: req.body.premium || false,
    status: 'available',
    files: req.body.files || [],
    createdAt: new Date().toISOString()
  });
  res.status(201).json(post);
});

app.put('/api/marketplace/posts/:id', authenticate, async (req, res) => {
  const post = dbPosts.get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.seller !== req.user.username && req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const updated = await dbPosts.update(post.id, {
    caption: req.body.caption,
    price: req.body.price,
    rank: req.body.rank,
    hero: req.body.hero,
    mlId: req.body.mlId,
    serverId: req.body.serverId,
    securityLock: req.body.securityLock
  });
  res.json(updated);
});

app.delete('/api/marketplace/posts/:id', authenticate, async (req, res) => {
  console.log('DELETE post', { id: req.params.id, user: req.user?.username, role: req.user?.role });
  const post = dbPosts.get(req.params.id);
  if (!post) { console.log('DELETE post: not found', req.params.id); return res.status(404).json({ error: 'Not found' }); }
  if (post.seller !== req.user.username && req.user.role !== 'developer') {
    console.log('DELETE post: forbidden', { seller: post.seller, user: req.user.username });
    return res.status(403).json({ error: 'Forbidden' });
  }
  await dbPosts.remove(post.id);
  console.log('DELETE post: removed', post.id);
  res.json({ message: 'Post deleted' });
});

// Orders
app.get('/api/orders', authenticate, (req, res) => {
  const all = dbOrders.list();
  const username = req.user.username.toLowerCase();
  if (req.user.role === 'developer') return res.json(all);
  res.json(all.filter((o) => o.buyer?.toLowerCase() === username || o.seller?.toLowerCase() === username));
});

app.post('/api/orders', authenticate, async (req, res) => {
  const order = await dbOrders.create({
    ...req.body,
    platform: req.body.platform || 'Mobile Legends',
    buyer: req.user.username,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  res.status(201).json(order);
});

// Middleman requests
app.get('/api/middleman/requests', authenticate, (req, res) => {
  const all = dbRequests.list();
  const username = req.user.username.toLowerCase();
  if (req.user.role === 'developer' || req.user.role === 'middleman') return res.json(all);
  res.json(all.filter((r) =>
    r.buyer?.toLowerCase() === username ||
    r.seller?.toLowerCase() === username ||
    r.midman?.toLowerCase() === username
  ));
});

app.post('/api/middleman/requests', authenticate, async (req, res) => {
  const request = await dbRequests.create({
    ...req.body,
    status: 'Pending',
    chat: [
      { sender: 'System', message: 'Order placed. Waiting for midman assignment.' },
      { sender: 'Admin', message: 'A midman will review this order shortly.' }
    ],
    createdAt: new Date().toISOString()
  });
  if (req.body.postId) await dbPosts.updateStatus(req.body.postId, 'pending');
  res.status(201).json(request);
});

app.post('/api/middleman/requests/:id/accept', authenticate, async (req, res) => {
  const request = dbRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  const updated = await dbRequests.update(request.id, {
    status: 'Accepted',
    midman: req.user.username
  });
  res.json(updated);
});

app.post('/api/middleman/requests/:id/message', authenticate, async (req, res) => {
  const request = dbRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  const chat = [...(request.chat || []), req.body.message];
  const updated = await dbRequests.update(request.id, { chat });
  res.json(updated);
});

app.post('/api/middleman/requests/:id/close', authenticate, async (req, res) => {
  const request = dbRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  const outcome = req.body.outcome || 'Success';
  const transaction = await dbTransactions.create({
    caption: request.caption,
    buyer: request.buyer,
    seller: request.seller,
    price: request.price,
    midman: request.midman,
    premium: request.premium,
    midmanFee: request.midmanFee,
    status: outcome,
    closedBy: req.user.username,
    closedAt: new Date().toLocaleString()
  });
  await dbRequests.remove(request.id);
  if (request.postId) {
    await dbPosts.updateStatus(request.postId, outcome === 'Success' ? 'sold' : 'available');
  }
  await dbOrders.updateStatus(request.postId, request.buyer, outcome.toLowerCase());
  res.json(transaction);
});

app.delete('/api/middleman/requests/:id', authenticate, async (req, res) => {
  const request = dbRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  await dbRequests.remove(request.id);
  res.json({ message: 'Request deleted' });
});

// Transactions
app.get('/api/transactions', authenticate, (req, res) => {
  const all = dbTransactions.list();
  const username = req.user.username.toLowerCase();
  if (req.user.role === 'developer') return res.json(all);
  res.json(all.filter((t) =>
    t.buyer?.toLowerCase() === username ||
    t.seller?.toLowerCase() === username ||
    t.midman?.toLowerCase() === username
  ));
});

// Notifications
app.get('/api/notifications', authenticate, (req, res) => {
  res.json(dbNotifications.forUser(req.user.username));
});

app.post('/api/notifications', authenticate, async (req, res) => {
  const n = await dbNotifications.create(req.user.username, req.body.message, req.body.type || 'info');
  res.status(201).json(n);
});

app.post('/api/notifications/:id/read', authenticate, async (req, res) => {
  await dbNotifications.markRead(req.params.id);
  res.json({ message: 'Read' });
});

app.post('/api/notifications/read-all', authenticate, async (req, res) => {
  await dbNotifications.markAllRead(req.user.username);
  res.json({ message: 'All read' });
});

app.get('/api/me', authenticate, (req, res) => {
  const row = dbUsers.findByUsername(req.user.username);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUser(row));
});

app.post('/api/me/heartbeat', authenticate, async (req, res) => {
  await dbSetLastSeen(req.user.username);
  res.json({ ok: true });
});

app.get('/api/users/online', authenticate, (req, res) => {
  const all = dbUsers.list();
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  const online = all
    .filter((u) => u.last_seen && new Date(u.last_seen).getTime() > twoMinutesAgo)
    .map((u) => ({ username: u.username, role: u.role, last_seen: u.last_seen }));
  res.json(online);
});

app.get('*', (req, res) => {
  try {
    const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
    res.type('html').send(html);
  } catch (e) {
    console.error('Failed to load app (catch-all):', e);
    res.status(500).json({ error: 'Failed to load app' });
  }
});

const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isServerless) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
