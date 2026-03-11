const DEFAULT_CLIENT_IDS = ['web-app', 'mobile-app', 'admin-portal'];

export const getAuthClientIds = (): string[] => {
  const rawClientIds = process.env.AUTH_CLIENT_IDS;
  if (!rawClientIds) {
    return DEFAULT_CLIENT_IDS;
  }

  const parsedClientIds = rawClientIds
    .split(',')
    .map(clientId => clientId.trim())
    .filter(clientId => clientId.length > 0);

  return parsedClientIds.length > 0 ? parsedClientIds : DEFAULT_CLIENT_IDS;
};
