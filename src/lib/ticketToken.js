import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '../domain/errors.js';

const SECRET = process.env.TICKET_SECRET || 'fallback-ticket-secret';

export function signTicket(bookingReference) {
  // Make sure we are only signing the reference string
  const payload = JSON.stringify({ ref: bookingReference, iat: Date.now() });
  const signature = createHmac('sha256', SECRET).update(payload).digest('hex');
  
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

export function verifyTicket(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { payload, signature } = decoded;

    const expectedSignature = createHmac('sha256', SECRET).update(payload).digest('hex');
    
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new DomainError('INVALID_TICKET', 'This ticket is forged.');
    }

    // Return just the reference string
    return JSON.parse(payload).ref; 
  } catch (err) {
    console.error("Token verification error:", err);
    throw new DomainError('INVALID_TICKET', 'Invalid ticket format.');
  }
}