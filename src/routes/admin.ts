import { Router } from 'express';
export const admin = Router();
admin.post('/tick', async (_req, res) => {
  // later we'll call your Base44 tick logic here
  res.json({ ok: true, at: new Date().toISOString() });
});
