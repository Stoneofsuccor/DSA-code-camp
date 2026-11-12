import { verifyToken } from '../lib/token.js';
import { DomainError } from '../domain/errors.js';

export function requireUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new DomainError('UNAUTHENTICATED', 'Missing or invalid Authorization header');
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  req.user = { id: payload.userId, role: payload.role };
  return req.user;
}

export function requireRole(req, allowedRoles) {
  const user = requireUser(req);
  if (!allowedRoles.includes(user.role)) {
    throw new DomainError('FORBIDDEN', 'You do not have permission for this action');
  }
  return user;
}