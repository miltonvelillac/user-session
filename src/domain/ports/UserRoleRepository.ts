export interface UserRoleRepository {
  getRoles(userId: string): Promise<string[]>;
  addRoles(userId: string, roles: string[]): Promise<string[]>;
  removeRoles(userId: string, roles: string[]): Promise<string[]>;
}
