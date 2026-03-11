import { Request, Response, NextFunction } from 'express';
import { CreateUser } from '../../../application/use-cases/CreateUser';
import { LoginUser } from '../../../application/use-cases/LoginUser';
import { AssignUserClientAccess } from '../../../application/use-cases/AssignUserClientAccess';

export class AuthController {
  constructor(
    private readonly createUser: CreateUser,
    private readonly loginUser: LoginUser,
    private readonly assignUserClientAccess: AssignUserClientAccess
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password, roles } = req.body as { username: string; password: string; roles: string[] };
      const result = await this.createUser.execute({ username, password, roles });
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password, clientId } = req.body as { username: string; password: string; clientId: string };
      const result = await this.loginUser.execute({ username, password, clientId });
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  assignClientAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { users } = req.body as { users: Array<{ username: string; clientIds: string[] }> };
      const result = await this.assignUserClientAccess.execute({ users });
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}
