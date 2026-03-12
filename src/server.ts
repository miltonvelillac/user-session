import 'dotenv/config';
import { buildApp } from './adapters/http/app';
import { container, TOKENS } from './infrastructure/di/dependencies';
import { AuthController } from './adapters/http/controllers/AuthController';

const port = Number(process.env.PORT) || 3000;

const authController = container.resolve<AuthController>(TOKENS.AuthController);
const app = buildApp(authController);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
