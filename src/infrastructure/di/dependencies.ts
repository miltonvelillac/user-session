import { Container } from './Container';
import { SqlServerUserRepository } from '../repositories/SqlServerUserRepository';
import { SqlServerTokenRepository } from '../repositories/SqlServerTokenRepository';
import { SqlServerClientRegistry } from '../repositories/SqlServerClientRegistry';
import { SqlServerUserClientAccessRepository } from '../repositories/SqlServerUserClientAccessRepository';
import { SimplePasswordHasher } from '../security/SimplePasswordHasher';
import { JwtTokenSigner } from '../security/JwtTokenSigner';
import { CreateUser } from '../../application/use-cases/CreateUser';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { AssignUserClientAccess } from '../../application/use-cases/AssignUserClientAccess';
import { AuthController } from '../../adapters/http/controllers/AuthController';

export const TOKENS = {
  UserRepository: 'UserRepository',
  TokenRepository: 'TokenRepository',
  ClientRegistry: 'ClientRegistry',
  UserClientAccessRepository: 'UserClientAccessRepository',
  PasswordHasher: 'PasswordHasher',
  TokenSigner: 'TokenSigner',
  CreateUser: 'CreateUser',
  AssignUserClientAccess: 'AssignUserClientAccess',
  LoginUser: 'LoginUser',
  AuthController: 'AuthController'
} as const;

export const container = new Container();

container.register(TOKENS.UserRepository, () => new SqlServerUserRepository());
container.register(TOKENS.TokenRepository, () => new SqlServerTokenRepository());
container.register(TOKENS.ClientRegistry, () => new SqlServerClientRegistry());
container.register(TOKENS.UserClientAccessRepository, () => new SqlServerUserClientAccessRepository());
container.register(TOKENS.PasswordHasher, () => new SimplePasswordHasher());
container.register(TOKENS.TokenSigner, () => new JwtTokenSigner(process.env.JWT_SECRET || 'dev-secret'));

container.register(TOKENS.CreateUser, c => new CreateUser(c.resolve(TOKENS.UserRepository), c.resolve(TOKENS.PasswordHasher)));
container.register(TOKENS.AssignUserClientAccess, c => new AssignUserClientAccess(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.ClientRegistry),
  c.resolve(TOKENS.UserClientAccessRepository)
));
container.register(TOKENS.LoginUser, c => new LoginUser(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.PasswordHasher),
  c.resolve(TOKENS.ClientRegistry),
  c.resolve(TOKENS.UserClientAccessRepository),
  c.resolve(TOKENS.TokenSigner),
  c.resolve(TOKENS.TokenRepository)
));

container.register(TOKENS.AuthController, c => new AuthController(
  c.resolve(TOKENS.CreateUser),
  c.resolve(TOKENS.LoginUser),
  c.resolve(TOKENS.AssignUserClientAccess)
));
