export class User {
  public readonly id: string;
  public readonly username: string;
  public readonly passwordHash: string;
  public readonly roles: string[];

  constructor({
    id,
    username,
    passwordHash,
    roles
  }: {
    id: string;
    username: string;
    passwordHash: string;
    roles: string[];
  }) {
    this.id = id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.roles = roles;
  }
}
