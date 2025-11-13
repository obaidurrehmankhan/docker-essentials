import express, { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';

const port = Number(process.env.PORT_API || 4000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/ping', (_req, res) => {
  res.json({ ok: true });
});

app.get('/visits', async (_req, res, next) => {
  try {
    const count = await getCount();
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

app.post('/visits', async (_req, res, next) => {
  try {
    await pool.query('INSERT INTO visits DEFAULT VALUES');
    const count = await getCount();
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function getCount() {
  const result = await pool.query<{ count: string }>('SELECT COUNT(*)::text as count FROM visits');
  return Number(result.rows[0].count);
}

app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
