import { UserClientAccessRepository } from '../../domain/ports/UserClientAccessRepository';

export class InMemoryUserClientAccessRepository implements UserClientAccessRepository {
  private readonly allowedClientIdsByUserId = new Map<string, Set<string>>();

  async setAllowedClientIds(userId: string, clientIds: string[]): Promise<string[]> {
    const uniqueClientIds = Array.from(new Set(clientIds));
    this.allowedClientIdsByUserId.set(userId, new Set(uniqueClientIds));
    return uniqueClientIds;
  }

  async hasAccessToClientId(userId: string, clientId: string): Promise<boolean> {
    const allowedClientIds = this.allowedClientIdsByUserId.get(userId);
    if (!allowedClientIds) {
      return false;
    }

    return allowedClientIds.has(clientId);
  }
}
