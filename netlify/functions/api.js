import { app } from '../../server.js';

export const handler = async (event, context) => {
  const { path, httpMethod, headers, body, queryStringParameters } = event;

  const query = new URLSearchParams(queryStringParameters || {}).toString();
  const clean = path
    .replace(/^\/\.netlify\/functions\/api\/?/, '')
    .replace(/^\/+/, '');
  const url = `/api/${clean}${query ? `?${query}` : ''}`;

  const req = {
    method: httpMethod,
    url,
    headers: headers || {},
    body: body || ''
  };

  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
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
    app(req, res);
  });
};
