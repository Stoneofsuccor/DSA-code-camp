import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/token.js';
import { DomainError } from '../domain/errors.js';
import { randomUUID } from 'node:crypto';

export function createAuthService(repository) {
  return {
    async signup(email, password, role = 'attendee') {
      if (!email || !password || password.length < 8) {
        throw new DomainError('VALIDATION', 'Email and password (8+ chars) required');
      }
      
      const existing = await repository.getUserByEmail(email);
      if (existing) throw new DomainError('EMAIL_TAKEN', 'Email already registered');

      const user = {
        id: randomUUID(),
        email,
        passwordHash: hashPassword(password),
        role
      };
      
      await repository.saveUser(user);
      
      const token = signToken({ userId: user.id, role: user.role });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    },

    async login(email, password) {
      const user = await repository.getUserByEmail(email);
      
      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw new DomainError('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const token = signToken({ userId: user.id, role: user.role });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    }
  };
}