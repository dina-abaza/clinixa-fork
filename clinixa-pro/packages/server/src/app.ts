import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler.middleware';
import { arabicNormalizeMiddleware } from './middlewares/arabic-normalize.middleware';

const app = express();

// Middlewares الأساسية
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(arabicNormalizeMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    data: {
      status: 'online',
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    warning: null,
  });
});

// Middleware الأخطاء في النهاية
app.use(errorHandler);

export default app;
