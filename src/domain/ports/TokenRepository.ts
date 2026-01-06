export interface TokenRepository {
  saveToken(data: { userId: string; token: string }): Promise<{ userId: string; token: string }>;
}