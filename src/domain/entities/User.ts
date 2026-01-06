export class User {
  public readonly id: string;
  public readonly username: string;
  public readonly passwordHash: string;

  constructor({ id, username, passwordHash }: { id: string; username: string; passwordHash: string }) {
    this.id = id;
    this.username = username;
    this.passwordHash = passwordHash;
  }
}