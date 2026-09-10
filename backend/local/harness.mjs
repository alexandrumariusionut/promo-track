/**
 * Local dev harness: serves the REAL Lambda handlers over Express.
 *
 * - Identity: the Midway authorizer is not run locally. The caller's alias is
 *   taken from the `X-Dev-Alias` header (default "localdev"), mirroring what
 *   the authorizer would inject into requestContext.authorizer.lambda.alias.
 * - Storage: @aws-sdk/lib-dynamodb is replaced with ./fake-dynamo.mjs through
 *   the module hook registered in ./register-fake-dynamo.mjs.
 *
 * Usage (from a backend dir): node --import ../local/register-fake-dynamo.mjs local-server.mjs
 */
import { createRequire } from 'node:module';

// express/cors live in each backend's own node_modules, so resolve from the caller's cwd.
const require = createRequire(`${process.cwd()}/`);
const express = require('express');
const cors = require('cors');

export function createLocalApp({ name, routes }) {
  const app = express();
  app.use(cors({ exposedHeaders: ['ETag'] }));
  app.use(express.text({ type: '*/*', limit: '5mb' }));
  app.use((req, _res, next) => { console.log(`[${name}] ${req.method} ${req.url}`); next(); });

  for (const { method, path, handler } of routes) {
    app[method](path, async (req, res) => {
      const alias = (req.header('x-dev-alias') || 'localdev').toLowerCase();
      const event = {
        requestContext: { authorizer: { lambda: { alias } } },
        pathParameters: req.params,
        headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), String(v)])),
        body: typeof req.body === 'string' && req.body.length ? req.body : null,
      };
      try {
        const result = await handler(event);
        res.status(result.statusCode).set(result.headers || {}).send(result.body);
      } catch (e) {
        console.error(`[${name}] handler threw`, e);
        res.status(500).json({ error: 'local harness failure' });
      }
    });
  }
  return app;
}
