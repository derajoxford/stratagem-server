import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
const log = pino({ transport: { target: 'pino-pretty' } });
const app = express();
const PORT = Number(process.env.PORT || 8080);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// routes (stubs for now)
import { admin } from './routes/admin';
import { wars } from './routes/wars';
app.use('/api/admin', admin);
app.use('/api/wars', wars);

app.listen(PORT, () => log.info(`API listening on :${PORT}`));
