import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { TokenSigner } from '../../domain/ports/TokenSigner';

export class JwtTokenSigner implements TokenSigner {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: SignOptions['expiresIn'] = '1h'
  ) {}

  sign(payload: {
    userId: string;
    username: string;
    roles: string[];
    clientId: string;
    sessionId: string;
    tokenId: string;
  }): string {
    const secret: Secret = this.secret;
    const options: SignOptions = {
      expiresIn: this.expiresIn,
      subject: payload.userId,
      audience: payload.clientId,
      jwtid: payload.tokenId
    };

    return jwt.sign({
      username: payload.username,
      roles: payload.roles,
      sid: payload.sessionId
    }, secret, options);
  }
}
