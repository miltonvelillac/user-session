import { Container } from './Container';
import { InMemoryUserRepository } from '../repositories/InMemoryUserRepository';
import { InMemoryTokenRepository } from '../repositories/InMemoryTokenRepository';
import { SimplePasswordHasher } from '../security/SimplePasswordHasher';
import { JwtTokenSigner } from '../security/JwtTokenSigner';
import { CreateUser } from '../../application/use-cases/CreateUser';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { AuthController } from '../../adapters/http/controllers/AuthController';

export const TOKENS = {
  UserRepository: 'UserRepository',
  TokenRepository: 'TokenRepository',
  PasswordHasher: 'PasswordHasher',
  TokenSigner: 'TokenSigner',
  CreateUser: 'CreateUser',
  LoginUser: 'LoginUser',
  AuthController: 'AuthController'
} as const;

export const container = new Container();

container.register(TOKENS.UserRepository, () => new InMemoryUserRepository());
container.register(TOKENS.TokenRepository, () => new InMemoryTokenRepository());
container.register(TOKENS.PasswordHasher, () => new SimplePasswordHasher());
container.register(TOKENS.TokenSigner, () => new JwtTokenSigner(process.env.JWT_SECRET || 'dev-secret'));

container.register(TOKENS.CreateUser, c => new CreateUser(c.resolve(TOKENS.UserRepository), c.resolve(TOKENS.PasswordHasher)));
container.register(TOKENS.LoginUser, c => new LoginUser(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.PasswordHasher),
  c.resolve(TOKENS.TokenSigner),
  c.resolve(TOKENS.TokenRepository)
));

container.register(TOKENS.AuthController, c => new AuthController(
  c.resolve(TOKENS.CreateUser),
  c.resolve(TOKENS.LoginUser)
));