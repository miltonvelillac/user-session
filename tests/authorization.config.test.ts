import { getAssignClientAccessAllowedRoles, getRegisterAllowedRoles } from '../src/infrastructure/config/authorization';

describe('authorization config', () => {
  describe('#getRegisterAllowedRoles', () => {
    it('should return default roles when env var is missing', () => {
      // Arrange
      delete process.env.AUTH_REGISTER_ALLOWED_ROLES;

      // Act
      const roles = getRegisterAllowedRoles();

      // Assert
      expect(roles).toEqual(['admin']);
    });

    it('should parse and normalize roles from env', () => {
      // Arrange
      process.env.AUTH_REGISTER_ALLOWED_ROLES = 'admin, super-admin,admin';

      // Act
      const roles = getRegisterAllowedRoles();

      // Assert
      expect(roles).toEqual(['admin', 'super-admin']);
    });
  });

  describe('#getAssignClientAccessAllowedRoles', () => {
    it('should return default roles when env var is missing', () => {
      // Arrange
      delete process.env.AUTH_ASSIGN_CLIENT_ACCESS_ALLOWED_ROLES;

      // Act
      const roles = getAssignClientAccessAllowedRoles();

      // Assert
      expect(roles).toEqual(['admin']);
    });

    it('should fallback to defaults when env has empty values only', () => {
      // Arrange
      process.env.AUTH_ASSIGN_CLIENT_ACCESS_ALLOWED_ROLES = ' , ';

      // Act
      const roles = getAssignClientAccessAllowedRoles();

      // Assert
      expect(roles).toEqual(['admin']);
    });
  });
});
