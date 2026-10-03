import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Render runs behind a proxy: needed for secure cookies and per-IP rate limiting
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(','), credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/v1/auth', authRouter);

// Must stay last: anything unmatched becomes a 404, every error goes through one handler
app.use(notFound);
app.use(errorHandler);
