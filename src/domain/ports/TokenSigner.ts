export interface TokenSigner {
  sign(payload: { userId: string; username: string }): string;
}