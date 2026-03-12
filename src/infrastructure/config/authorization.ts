const parseAllowedRoles = (rawValue: string | undefined, defaults: string[]): string[] => {
  if (!rawValue) {
    return defaults;
  }

  const parsed = rawValue
    .split(',')
    .map(role => role.trim())
    .filter(role => role.length > 0);

  return parsed.length > 0 ? Array.from(new Set(parsed)) : defaults;
};

export const getRegisterAllowedRoles = (): string[] => {
  return parseAllowedRoles(process.env.AUTH_REGISTER_ALLOWED_ROLES, ['admin']);
};

export const getAssignClientAccessAllowedRoles = (): string[] => {
  return parseAllowedRoles(process.env.AUTH_ASSIGN_CLIENT_ACCESS_ALLOWED_ROLES, ['admin']);
};

export const getManageUserRolesAllowedRoles = (): string[] => {
  return parseAllowedRoles(process.env.AUTH_MANAGE_USER_ROLES_ALLOWED_ROLES, ['admin']);
};
