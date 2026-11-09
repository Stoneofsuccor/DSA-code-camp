import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { DomainError } from '../domain/errors.js';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

/**
 * A helper to enforce the exact error shape: {"error":{"code","message"}}
 */
export function sendError(res, status, code, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code, message } }));
}

/**
 * Serves static files securely from the /public folder.
 */
export function serveStatic(req, res, publicDir) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = url.pathname;
  
  if (filePath === '/') filePath = '/index.html';

  // SECURITY: Prevent path traversal attacks (e.g., /../../etc/passwd)
  const safePath = join(publicDir, filePath);
  if (!safePath.startsWith(publicDir)) {
    sendError(res, 403, 'FORBIDDEN', 'Access denied.');
    return;
  }

  if (!existsSync(safePath) || !statSync(safePath).isFile()) {
    return false; // Let the caller decide how to handle a missing static file
  }

  const ext = extname(safePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mimeType });
  createReadStream(safePath).pipe(res);
  return true;
}

/**
 * A helper to safely read JSON body from a request.
 */
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