import { randomUUID, randomInt } from 'node:crypto';

/**
 * Generates a standard, collision-resistant unique ID using Node's crypto module.
 * NEVER use Math.random() for IDs as it is not cryptographically secure.
 */
export function newId() {
  return randomUUID();
}

/**
 * Generates a short, readable booking reference (e.g., "A7K9P2").
 * We exclude characters that look similar when read aloud or written down:
 * Removed: O, 0, I, 1, L, S, 5 to prevent mistakes at the door.
 */
export function newReference() {
  // We use a safe alphabet (32 characters). 
  // 32^6 = ~1 billion combinations, which is enough for this capstone.
  const alphabet = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
  let reference = '';
  
  for (let i = 0; i < 6; i++) {
    // randomInt is cryptographically secure, unlike Math.floor(Math.random() * max)
    const randomIndex = randomInt(0, alphabet.length);
    reference += alphabet[randomIndex];
  }
  
  return reference;
}