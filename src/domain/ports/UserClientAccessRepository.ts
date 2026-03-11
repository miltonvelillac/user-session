export interface UserClientAccessRepository {
  setAllowedClientIds(userId: string, clientIds: string[]): Promise<string[]>;
  hasAccessToClientId(userId: string, clientId: string): Promise<boolean>;
}
