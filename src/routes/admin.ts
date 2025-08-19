import { Router } from 'express';
export const admin = Router();
admin.post('/tick', async (_req, res) => {
  // we'll wire your Base44 tick later
  res.json({ ok: true, at: new Date().toISOString() });
});
