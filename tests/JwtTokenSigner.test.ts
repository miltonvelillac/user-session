import jwt from 'jsonwebtoken';
import { JwtTokenSigner } from '../src/infrastructure/security/JwtTokenSigner';

describe('JwtTokenSigner', () => {
  describe('#sign', () => {
    it('should sign token with identity, audience, jti, sid and roles', () => {
      // Arrange
      const signer = new JwtTokenSigner('secret', '1h');

      // Act
      const token = signer.sign({
        userId: 'user-1',
        username: 'john',
        roles: ['admin', 'seller'],
        clientId: 'web-app',
        sessionId: 'session-1',
        tokenId: 'token-1'
      });
      const decoded = jwt.verify(token, 'secret', { audience: 'web-app' }) as jwt.JwtPayload & { username: string; sid: string; roles: string[] };

      // Assert
      expect(decoded.sub).toBe('user-1');
      expect(decoded.jti).toBe('token-1');
      expect(decoded.username).toBe('john');
      expect(decoded.sid).toBe('session-1');
      expect(decoded.roles).toEqual(['admin', 'seller']);
    });
  });
});
