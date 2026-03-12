import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:https';
import { buildApp } from './adapters/http/app';
import { container, TOKENS } from './infrastructure/di/dependencies';
import { AuthController } from './adapters/http/controllers/AuthController';

const port = Number(process.env.PORT) || 3000;
const httpsEnabled = (process.env.HTTPS_ENABLED ?? '').toLowerCase() === 'true';

const authController = container.resolve<AuthController>(TOKENS.AuthController);
const app = buildApp(authController);

if (httpsEnabled) {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (!keyPath || !certPath) {
    throw new Error('HTTPS_ENABLED=true requires HTTPS_KEY_PATH and HTTPS_CERT_PATH');
  }

  const options = {
    key: readFileSync(resolve(keyPath)),
    cert: readFileSync(resolve(certPath)),
    ...(process.env.HTTPS_PASSPHRASE ? { passphrase: process.env.HTTPS_PASSPHRASE } : {})
  };

  createServer(options, app).listen(port, () => {
    console.log(`HTTPS server running on port ${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
  });
}
