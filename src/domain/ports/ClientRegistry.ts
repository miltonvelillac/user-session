export interface ClientRegistry {
  isActiveClient(clientId: string): Promise<boolean>;
}
