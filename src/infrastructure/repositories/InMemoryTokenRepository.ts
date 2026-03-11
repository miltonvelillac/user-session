import { TokenRepository } from '../../domain/ports/TokenRepository';

export class InMemoryTokenRepository implements TokenRepository {
  private readonly sessionsByUserId = new Map<string, Array<{
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }>>();

  async saveToken({
    userId,
    clientId,
    sessionId,
    tokenId,
    token
  }: {
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }): Promise<{
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }> {
    const sessions = this.sessionsByUserId.get(userId) || [];
    sessions.push({ clientId, sessionId, tokenId, token });
    this.sessionsByUserId.set(userId, sessions);
    return { userId, clientId, sessionId, tokenId, token };
  }
}
