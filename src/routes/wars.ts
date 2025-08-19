import { Router } from 'express';
export const wars = Router();
wars.post('/:id/attack', async (req, res) => {
  // we'll call your Base44 attack logic later
  res.json({ ok: true });
});
