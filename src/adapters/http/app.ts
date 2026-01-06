import express, { Express } from 'express';
import { AuthController } from './controllers/AuthController';
import { buildAuthRouter } from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

export const buildApp = (authController: AuthController): Express => {
  const app = express();

  app.use(express.json());
  app.use('/api', buildAuthRouter(authController));
  app.use(notFound);
  app.use(errorHandler);

  return app;
};