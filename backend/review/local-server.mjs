// Local test server — run with: node local-server.mjs
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const db = new Map();

app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

app.post('/reviews', (req, res) => {
  const { entries, employeeName, targetLevel } = req.body;
  const reviewEntries = entries.map(({ id, title, situation, task, action, results, principles, reviewComments }) =>
    ({ id, title, situation, task, action, results, principles, reviewComments: reviewComments || [] }));
  const sessionId = randomUUID();
  db.set(sessionId, { sessionId, entries: reviewEntries, employeeName, targetLevel, status: 'pending', comments: {}, createdAt: Date.now() });
  const reviewUrl = `http://localhost:5180/review/${sessionId}`;
  console.log(`  → Created session: ${sessionId}`);
  res.status(201).json({ sessionId, reviewUrl });
});

app.get('/reviews/:sessionId', (req, res) => {
  const session = db.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

app.post('/reviews/:sessionId/comments', (req, res) => {
  const session = db.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  session.comments = req.body.comments;
  session.status = 'reviewed';
  console.log(`  → Comments submitted for: ${req.params.sessionId}`);
  res.json({ success: true });
});

app.get('/reviews/:sessionId/status', (req, res) => {
  const session = db.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json({ status: session.status, ...(session.status === 'reviewed' ? { comments: session.comments } : {}) });
});

app.listen(3001, () => console.log('Review API running on http://localhost:3001'));
