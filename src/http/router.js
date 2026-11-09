/**
 * A minimal HTTP router.
 * Routes are stored as an array of objects: { method, pathRegex, paramNames, handler }
 */
export function createRouter() {
  const routes = [];

  function addRoute(method, path, handler) {
    // Convert '/api/events/:id' to a Regex: /^\/api\/events\/([^\/]+)$/
    const paramNames = [];
    const regexPath = path.replace(/:([^\/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^\\/]+)';
    });

    routes.push({
      method,
      pathRegex: new RegExp(`^${regexPath}$`),
      paramNames,
      handler
    });
  }

  return {
    get: (path, handler) => addRoute('GET', path, handler),
    post: (path, handler) => addRoute('POST', path, handler),
    put: (path, handler) => addRoute('PUT', path, handler),
    delete: (path, handler) => addRoute('DELETE', path, handler),

    /**
     * Finds a matching route and executes it.
     */
    async handle(req, res) {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const method = req.method;
      const pathname = url.pathname;

      for (const route of routes) {
        if (route.method !== method) continue;

        const match = pathname.match(route.pathRegex);
        if (match) {
          // Extract params (e.g., { id: '123' })
          const params = {};
          route.paramNames.forEach((name, index) => {
            params[name] = match[index + 1];
          });

          // Attach params and query to the request for the handler to use
          req.params = params;
          req.query = Object.fromEntries(url.searchParams);
          
          return route.handler(req, res);
        }
      }

      // If no route matched, and it was an API path, return a JSON 404
      if (pathname.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: { code: 'NOT_FOUND', message: 'API route not found' } 
        }));
        return true; // Signal that we handled the request;
      }

      return false; // Signal to the server that it should try serving a static file
    }
  };
}