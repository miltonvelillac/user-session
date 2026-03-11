export interface TokenSigner {
  sign(payload: {
    userId: string;
    username: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
  }): string;
}
