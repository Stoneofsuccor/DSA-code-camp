import { createHmac } from 'node:crypto';
import { DomainError } from '../domain/errors.js';

const SECRET = process.env.JWT_SECRET || 'fallback-secret';

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

export function signToken(payload, expiresInSeconds = 3600) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ 
    ...payload, 
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds 
  }));
  
  const signature = createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  if (!token) throw new DomainError('UNAUTHENTICATED', 'No token provided');
  
  const parts = token.split('.');
  if (parts.length !== 3) throw new DomainError('UNAUTHENTICATED', 'Malformed token');
  
  const [headerB64, bodyB64, signature] = parts;
  
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  if (header.alg !== 'HS256') throw new DomainError('UNAUTHENTICATED', 'Invalid algorithm');

  const expectedSig = createHmac('sha256', SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64url');
    
  if (signature !== expectedSig) throw new DomainError('UNAUTHENTICATED', 'Invalid signature');

  const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new DomainError('UNAUTHENTICATED', 'Token expired');
  }
  
  return payload;
}