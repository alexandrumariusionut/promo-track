// Local dev server: real Lambda handlers for all route groups against an in-memory store
// (DynamoDB and Bedrock are faked; LOCAL_BEDROCK=real uses your AWS credentials).
// Run: npm start   (uses node --import ./local/register-fake-dynamo.mjs)
import { createLocalApp } from './local/harness.mjs';
import { handler as createReview } from './src/review/create.mjs';
import { handler as getReview } from './src/review/get.mjs';
import { handler as comments } from './src/review/comments.mjs';
import { handler as status } from './src/review/status.mjs';
import { handler as revoke } from './src/review/revoke.mjs';
import { handler as getUserData } from './src/userdata/get.mjs';
import { handler as saveUserData } from './src/userdata/save.mjs';
import { handler as aiChat } from './src/ai/chat.mjs';
import { handler as aiTags } from './src/ai/tags.mjs';

process.env.REVIEWS_TABLE ||= 'promo-track-reviews';
process.env.USERS_TABLE ||= 'promo-track-users';
process.env.DEFAULT_MODEL ||= 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';
process.env.ALLOWED_MODELS ||= process.env.DEFAULT_MODEL;

const app = createLocalApp({
  name: 'api',
  routes: [
    { method: 'post', path: '/reviews', handler: createReview },
    { method: 'get', path: '/reviews/:sessionId', handler: getReview },
    { method: 'delete', path: '/reviews/:sessionId', handler: revoke },
    { method: 'post', path: '/reviews/:sessionId/comments', handler: comments },
    { method: 'get', path: '/reviews/:sessionId/status', handler: status },
    { method: 'get', path: '/userdata/:userId', handler: getUserData },
    { method: 'put', path: '/userdata/:userId', handler: saveUserData },
    { method: 'post', path: '/ai/chat', handler: aiChat },
    { method: 'get', path: '/ai/tags', handler: aiTags },
  ],
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, '127.0.0.1', () => console.log(`PromoTrack API (real handlers, in-memory DB) on http://127.0.0.1:${PORT}`));
