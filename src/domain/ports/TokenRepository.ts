export interface TokenRepository {
  saveToken(data: {
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
  }>;
}
