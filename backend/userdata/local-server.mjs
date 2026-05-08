// Local test server — run with: node local-server.mjs
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const db = new Map();

app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

app.get('/userdata/:userId', (req, res) => {
  const item = db.get(req.params.userId);
  res.json({ data: item?.data || null });
});

app.put('/userdata/:userId', (req, res) => {
  db.set(req.params.userId, { data: req.body, updatedAt: Date.now() });
  console.log(`  → Saved data for: ${req.params.userId}`);
  res.json({ success: true });
});

app.listen(3002, () => console.log('UserData API running on http://localhost:3002'));
