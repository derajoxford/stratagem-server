import { Router } from 'express';
export const wars = Router();
wars.post('/:id/attack', async (req, res) => {
  // later we'll call your Base44 attack logic here
  res.json({ ok: true });
});
