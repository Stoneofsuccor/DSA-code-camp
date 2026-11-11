import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Get the exact file path of config.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Use process.env.PORT if it exists, otherwise default to 3000
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Go up one level from src/ and into public/
  publicDir: join(__dirname, '..', 'public')
};