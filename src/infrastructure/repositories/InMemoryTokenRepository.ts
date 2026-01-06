import { TokenRepository } from '../../domain/ports/TokenRepository';

export class InMemoryTokenRepository implements TokenRepository {
  private readonly tokensByUserId = new Map<string, string[]>();

  async saveToken({ userId, token }: { userId: string; token: string }): Promise<{ userId: string; token: string }> {
    const list = this.tokensByUserId.get(userId) || [];
    list.push(token);
    this.tokensByUserId.set(userId, list);
    return { userId, token };
  }
}