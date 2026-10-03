import { app } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';

async function start() {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});