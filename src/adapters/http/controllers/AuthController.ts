import { Request, Response, NextFunction } from 'express';
import { CreateUser } from '../../../application/use-cases/CreateUser';
import { LoginUser } from '../../../application/use-cases/LoginUser';

export class AuthController {
  constructor(private readonly createUser: CreateUser, private readonly loginUser: LoginUser) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body as { username: string; password: string };
      const result = await this.createUser.execute({ username, password });
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
}
