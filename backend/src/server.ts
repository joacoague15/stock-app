import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import { createServer } from 'http';
import { env } from './lib/env';
import { stream } from './lib/finnhub';
import { initFirebase } from './lib/firebase';
import { attachSocketServer } from './lib/socket';
import { alertsRouter } from './modules/alerts';
import { authRouter } from './modules/auth';
import { startAlertMonitor } from './modules/monitor';
import { stocksRouter } from './modules/stocks';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/alerts', alertsRouter);

// Global error handler.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

async function main() {
  initFirebase();
  stream.start();
  await startAlertMonitor();

  const httpServer = createServer(app);
  attachSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
