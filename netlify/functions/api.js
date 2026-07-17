import { app } from '../../server.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export const handler = async (event, context) => {
  const { path, httpMethod, headers, body, queryStringParameters } = event;

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const query = new URLSearchParams(queryStringParameters || {}).toString();
  const clean = path
    .replace(/^\/\.netlify\/functions\/api\/?/, '')
    .replace(/^\/+/, '');
  const url = `/api/${clean}${query ? `?${query}` : ''}`;

  let parsedBody = body || '';
  const contentType = (headers && (headers['content-type'] || headers['Content-Type'])) || '';
  if (contentType.includes('application/json') && typeof parsedBody === 'string' && parsedBody) {
    try { parsedBody = JSON.parse(parsedBody); } catch {}
  }

  const req = {
    method: httpMethod,
    url,
    headers: headers || {},
    body: parsedBody,
    _body: typeof parsedBody === 'object' && parsedBody !== null
  };

  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
      body: '',
      setHeader(key, value) { this.headers[key] = value; },
      getHeader(key) { return this.headers[key]; },
      json(payload) { this.body = JSON.stringify(payload); this.end(this.body); },
      end(chunk) {
        this.body = typeof chunk === 'string' ? chunk : chunk ? chunk.toString() : '';
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
          isBase64Encoded: false
        });
      },
      status(code) { this.statusCode = code; return this; },
      send(chunk) { this.end(chunk); }
    };
    try {
      app(req, res);
    } catch (err) {
      console.error('FUNCTION RUNTIME ERROR:', err && err.stack ? err.stack : err);
      res.statusCode = 500;
      res.body = JSON.stringify({ error: 'function_error', detail: err && err.message ? err.message : String(err) });
      res.end(res.body);
    }
  });
};

