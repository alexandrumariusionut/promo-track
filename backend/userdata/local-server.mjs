// Local dev server running the real Lambda handlers against an in-memory store.
// Run: npm start   (uses node --import ../local/register-fake-dynamo.mjs)
import { createLocalApp } from '../local/harness.mjs';
import { handler as get } from './src/get.mjs';
import { handler as save } from './src/save.mjs';

process.env.TABLE_NAME ||= 'promo-track-users';

const app = createLocalApp({
  name: 'userdata',
  routes: [
    { method: 'get', path: '/userdata/:userId', handler: get },
    { method: 'put', path: '/userdata/:userId', handler: save },
  ],
});

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, '127.0.0.1', () => console.log(`UserData API (real handlers, in-memory DB) on http://127.0.0.1:${PORT}`));
