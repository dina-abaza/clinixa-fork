import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler.middleware';
import { arabicNormalizeMiddleware } from './middlewares/arabic-normalize.middleware';
import setupRoutes from './modules/setup/setup.routes';
import authRoutes from './modules/auth/auth.routes';


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

//  Routes الأساسية
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);

// Middleware الأخطاء في النهاية
app.use(errorHandler);

export default app;
