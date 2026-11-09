/**
 * A custom error class for business logic violations.
 * We use this instead of generic Errors so the calling code can check `err.code` 
 * (e.g., if (err.code === 'SOLD_OUT')) rather than parsing error message strings.
 */
export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}