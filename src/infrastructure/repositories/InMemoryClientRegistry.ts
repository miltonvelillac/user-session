import { ClientRegistry } from '../../domain/ports/ClientRegistry';

export class InMemoryClientRegistry implements ClientRegistry {
  private readonly activeClientIds: Set<string>;

  constructor(clientIds: string[]) {
    this.activeClientIds = new Set(['test']);
    // this.activeClientIds = new Set(clientIds);
  }

  async isActiveClient(clientId: string): Promise<boolean> {    
    return this.activeClientIds.has(clientId);
  }
}
