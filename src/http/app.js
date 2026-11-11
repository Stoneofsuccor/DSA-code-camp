import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, normalize } from 'node:path';
import { DomainError } from '../domain/errors.js';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

export function sendError(res, status, code, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code, message } }));
}

export function serveStatic(req, res, publicDir) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = url.pathname;
  
  if (filePath === '/') filePath = '/index.html';

  // Normalize fixes Windows backslash issues
  const safePublicDir = normalize(resolve(publicDir));
  const safePath = normalize(resolve(join(safePublicDir, filePath)));

  // SECURITY: Prevent path traversal
  if (!safePath.startsWith(safePublicDir)) {
    sendError(res, 403, 'FORBIDDEN', 'Access denied.');
    return true;
  }

  // Debugging log
  console.log(`Serving static file: ${safePath}`);

  if (!existsSync(safePath) || !statSync(safePath).isFile()) {
    console.log(`❌ File NOT found: ${safePath}`);
    return false; 
  }

  const ext = extname(safePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mimeType });
  createReadStream(safePath).pipe(res);
  return true;
}

// --- RESTORED THIS FUNCTION ---
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({}); // Empty body is okay
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new DomainError('VALIDATION', 'Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}