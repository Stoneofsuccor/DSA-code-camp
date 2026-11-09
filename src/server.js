import { createServer } from 'node:http';
import { createRouter } from './http/router.js';
import { sendError, serveStatic } from './http/app.js';
import { config } from './config.js';
import { DomainError } from './domain/errors.js'; // <-- ADDED THIS IMPORT

const router = createRouter();

// 1. Define API Routes
router.get('/health', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

// 2. Create the HTTP Server
const server = createServer(async (req, res) => {
  try {
    // Try to match an API route first
    const handledByApi = await router.handle(req, res);
    if (handledByApi !== false) return; // Request was handled by the router

    // If no API matched, try serving a static file from /public
    const handledByStatic = serveStatic(req, res, config.publicDir);
    if (handledByStatic) return;

    // If nothing matched, send a 404 (only if headers haven't been sent yet)
    if (!res.headersSent) {
      sendError(res, 404, 'NOT_FOUND', 'Page not found');
    }

  } catch (error) {
    // GLOBAL ERROR HANDLER: Never leak stack traces to the client!
    console.error(error); // Log it locally for the developer

    // Only send an error response if we haven't already started sending one
    if (!res.headersSent) {
      if (error instanceof DomainError) {
        sendError(res, 400, error.code, error.message);
      } else {
        sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong.');
      }
    }
  }
});

// 3. Start the server
server.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});