const API_BASE = import.meta.env.VITE_API_URL || '/api';

const authHeader = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const safeFetch = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (e) {
    const err = new Error('Network error: failed to reach the server. Please check your connection or try again later.');
    err.isNetworkError = true;
    throw err;
  }
};

const parseResponse = async (res) => {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error('API server not reachable (received an HTML page instead of JSON). Make sure the backend is running and you are using the dev server.');
  }
  if (!res.ok) {
    let msg = 'Request failed';
    try { const err = JSON.parse(text); if (err?.error) msg = err.error; } catch {}
    throw new Error(msg);
  }
  try { return JSON.parse(text); } catch { throw new Error('Invalid JSON response from server'); }
};

const post = (path, body, withAuth = false) =>
  safeFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(withAuth ? authHeader() : {}) },
    body: JSON.stringify(body)
  });

const put = (path, body, withAuth = false) =>
  safeFetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(withAuth ? authHeader() : {}) },
    body: JSON.stringify(body)
  });

const del = (path, withAuth = false) =>
  safeFetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: withAuth ? authHeader() : {}
  });

const get = (path, withAuth = false) =>
  safeFetch(`${API_BASE}${path}`, { headers: withAuth ? authHeader() : {} });

export async function apiLogin(username, password) {
  return parseResponse(await post('/auth/login', { username, password }));
}

export async function apiRegister(username, password) {
  return parseResponse(await post('/auth/register', { username, password }));
}

export async function apiMe() {
  return parseResponse(await get('/me', true));
}

export async function apiGetUsers() {
  return parseResponse(await get('/admin/users', true));
}

export async function apiPromoteUser(username) {
  return parseResponse(await post(`/admin/users/${encodeURIComponent(username)}/promote`, {}, true));
}

export async function apiDeleteUser(username) {
  return parseResponse(await del(`/admin/users/${encodeURIComponent(username)}`, true));
}

export async function apiSubmitVerification(data) {
  return parseResponse(await post('/verification/submit', data, true));
}

export async function apiGetVerifications() {
  return parseResponse(await get('/admin/verifications', true));
}

export async function apiApproveVerification(id) {
  return parseResponse(await post(`/admin/verifications/${id}/approve`, {}, true));
}

export async function apiDeclineVerification(id, reason) {
  return parseResponse(await post(`/admin/verifications/${id}/decline`, { reason }, true));
}

export async function apiGetMarketplacePosts() {
  return parseResponse(await get('/marketplace/posts'));
}

export async function apiCreatePost(postData) {
  return parseResponse(await post('/marketplace/posts', postData, true));
}

export async function apiUpdatePost(id, postData) {
  return parseResponse(await put(`/marketplace/posts/${id}`, postData, true));
}

export async function apiDeletePost(id) {
  return parseResponse(await del(`/marketplace/posts/${id}`, true));
}

export async function apiGetOrders() {
  return parseResponse(await get('/orders', true));
}

export async function apiCreateOrder(orderData) {
  return parseResponse(await post('/orders', orderData, true));
}

export async function apiGetTransactions() {
  return parseResponse(await get('/transactions', true));
}

export async function apiCreateTransaction(transactionData) {
  return parseResponse(await post('/transactions', transactionData, true));
}

export async function apiGetMiddlemanRequests() {
  return parseResponse(await get('/middleman/requests', true));
}

export async function apiCreateMiddlemanRequest(requestData) {
  return parseResponse(await post('/middleman/requests', requestData, true));
}

export async function apiAcceptRequest(id) {
  return parseResponse(await post(`/middleman/requests/${id}/accept`, {}, true));
}

export async function apiSendRequestMessage(id, message) {
  return parseResponse(await post(`/middleman/requests/${id}/message`, { message }, true));
}

export async function apiCloseRequest(id, outcome) {
  return parseResponse(await post(`/middleman/requests/${id}/close`, { outcome }, true));
}

export async function apiDeleteRequest(id) {
  return parseResponse(await del(`/middleman/requests/${id}`, true));
}

export async function apiGetNotifications() {
  return parseResponse(await get('/notifications', true));
}

export async function apiCreateNotification(notificationData) {
  return parseResponse(await post('/notifications', notificationData, true));
}
