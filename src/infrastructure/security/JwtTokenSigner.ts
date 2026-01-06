import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { TokenSigner } from '../../domain/ports/TokenSigner';

export class JwtTokenSigner implements TokenSigner {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: SignOptions['expiresIn'] = '1h'
  ) {}

  sign(payload: { userId: string; username: string }): string {
    const secret: Secret = this.secret;
    const options: SignOptions = { expiresIn: this.expiresIn };
    return jwt.sign(payload, secret, options);
  }
}
