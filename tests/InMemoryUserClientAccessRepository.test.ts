import { InMemoryUserClientAccessRepository } from '../src/infrastructure/repositories/InMemoryUserClientAccessRepository';

describe('InMemoryUserClientAccessRepository', () => {
  describe('#setAllowedClientIds', () => {
    it('should store only unique client IDs for a user', async () => {
      // Arrange
      const repository = new InMemoryUserClientAccessRepository();

      // Act
      const result = await repository.setAllowedClientIds('u1', ['web-app', 'web-app', 'mobile-app']);

      // Assert
      expect(result).toEqual(['web-app', 'mobile-app']);
    });

    it('should overwrite existing client IDs for the same user', async () => {
      // Arrange
      const repository = new InMemoryUserClientAccessRepository();
      await repository.setAllowedClientIds('u1', ['web-app']);

      // Act
      const result = await repository.setAllowedClientIds('u1', ['admin-portal']);

      // Assert
      expect(result).toEqual(['admin-portal']);
      await expect(repository.hasAccessToClientId('u1', 'web-app')).resolves.toBe(false);
      await expect(repository.hasAccessToClientId('u1', 'admin-portal')).resolves.toBe(true);
    });
  });

  describe('#hasAccessToClientId', () => {
    it('should return true when the user has access to the client', async () => {
      // Arrange
      const repository = new InMemoryUserClientAccessRepository();
      await repository.setAllowedClientIds('u1', ['web-app']);

      // Act
      const result = await repository.hasAccessToClientId('u1', 'web-app');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have access to the client', async () => {
      // Arrange
      const repository = new InMemoryUserClientAccessRepository();
      await repository.setAllowedClientIds('u1', ['web-app']);

      // Act
      const result = await repository.hasAccessToClientId('u1', 'mobile-app');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user has no assigned clients', async () => {
      // Arrange
      const repository = new InMemoryUserClientAccessRepository();

      // Act
      const result = await repository.hasAccessToClientId('u2', 'web-app');

      // Assert
      expect(result).toBe(false);
    });
  });
});
