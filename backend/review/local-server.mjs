// Local dev server running the real Lambda handlers against an in-memory store.
// Run: npm start   (uses node --import ../local/register-fake-dynamo.mjs)
import { createLocalApp } from '../local/harness.mjs';
import { handler as create } from './src/create.mjs';
import { handler as get } from './src/get.mjs';
import { handler as comments } from './src/comments.mjs';
import { handler as status } from './src/status.mjs';
import { handler as revoke } from './src/revoke.mjs';

process.env.TABLE_NAME ||= 'promo-track-reviews';

const app = createLocalApp({
  name: 'review',
  routes: [
    { method: 'post', path: '/reviews', handler: create },
    { method: 'get', path: '/reviews/:sessionId', handler: get },
    { method: 'delete', path: '/reviews/:sessionId', handler: revoke },
    { method: 'post', path: '/reviews/:sessionId/comments', handler: comments },
    { method: 'get', path: '/reviews/:sessionId/status', handler: status },
  ],
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, '127.0.0.1', () => console.log(`Review API (real handlers, in-memory DB) on http://127.0.0.1:${PORT}`));
