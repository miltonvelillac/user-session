import { Container } from './Container';
import { SqlServerUserRepository } from '../repositories/SqlServerUserRepository';
import { SqlServerTokenRepository } from '../repositories/SqlServerTokenRepository';
import { SqlServerClientRegistry } from '../repositories/SqlServerClientRegistry';
import { SqlServerUserClientAccessRepository } from '../repositories/SqlServerUserClientAccessRepository';
import { SqlServerUserRoleRepository } from '../repositories/SqlServerUserRoleRepository';
import { SimplePasswordHasher } from '../security/SimplePasswordHasher';
import { JwtTokenSigner } from '../security/JwtTokenSigner';
import { CreateUser } from '../../application/use-cases/CreateUser';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { AssignUserClientAccess } from '../../application/use-cases/AssignUserClientAccess';
import { AddUserRoles } from '../../application/use-cases/AddUserRoles';
import { RemoveUserRoles } from '../../application/use-cases/RemoveUserRoles';
import { GetUserRoles } from '../../application/use-cases/GetUserRoles';
import { AuthController } from '../../adapters/http/controllers/AuthController';

export const TOKENS = {
  UserRepository: 'UserRepository',
  TokenRepository: 'TokenRepository',
  ClientRegistry: 'ClientRegistry',
  UserClientAccessRepository: 'UserClientAccessRepository',
  UserRoleRepository: 'UserRoleRepository',
  PasswordHasher: 'PasswordHasher',
  TokenSigner: 'TokenSigner',
  CreateUser: 'CreateUser',
  AssignUserClientAccess: 'AssignUserClientAccess',
  AddUserRoles: 'AddUserRoles',
  RemoveUserRoles: 'RemoveUserRoles',
  GetUserRoles: 'GetUserRoles',
  LoginUser: 'LoginUser',
  AuthController: 'AuthController'
} as const;

export const container = new Container();

container.register(TOKENS.UserRepository, () => new SqlServerUserRepository());
container.register(TOKENS.TokenRepository, () => new SqlServerTokenRepository());
container.register(TOKENS.ClientRegistry, () => new SqlServerClientRegistry());
container.register(TOKENS.UserClientAccessRepository, () => new SqlServerUserClientAccessRepository());
container.register(TOKENS.UserRoleRepository, () => new SqlServerUserRoleRepository());
container.register(TOKENS.PasswordHasher, () => new SimplePasswordHasher());
container.register(TOKENS.TokenSigner, () => new JwtTokenSigner(process.env.JWT_SECRET || 'dev-secret'));

container.register(TOKENS.CreateUser, c => new CreateUser(c.resolve(TOKENS.UserRepository), c.resolve(TOKENS.PasswordHasher)));
container.register(TOKENS.AssignUserClientAccess, c => new AssignUserClientAccess(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.ClientRegistry),
  c.resolve(TOKENS.UserClientAccessRepository)
));
container.register(TOKENS.AddUserRoles, c => new AddUserRoles(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.UserRoleRepository)
));
container.register(TOKENS.RemoveUserRoles, c => new RemoveUserRoles(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.UserRoleRepository)
));
container.register(TOKENS.GetUserRoles, c => new GetUserRoles(
  c.resolve(TOKENS.UserRepository),
  c.resolve(TOKENS.UserRoleRepository)
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
  c.resolve(TOKENS.AssignUserClientAccess),
  c.resolve(TOKENS.AddUserRoles),
  c.resolve(TOKENS.RemoveUserRoles),
  c.resolve(TOKENS.GetUserRoles)
));
