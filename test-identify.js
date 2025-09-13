// Calls the dev identify endpoint (requires an authenticated browser session to be useful)
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://siteproc-9kd7f61ry-123s-projects-c0b14341.vercel.app';

function post(path, data = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = JSON.stringify(data);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('Testing /api/dev/identify ...');
  const res = await post('/api/dev/identify');
  console.log('Status:', res.status);
  console.log('Body:', res.data);
})();
