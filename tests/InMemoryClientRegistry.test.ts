import { InMemoryClientRegistry } from '../src/infrastructure/repositories/InMemoryClientRegistry';

describe('InMemoryClientRegistry', () => {
  describe('#constructor', () => {
    it('should initialize active clients using the current constructor behavior', async () => {
      // Arrange
      const registry = new InMemoryClientRegistry(['web-app', 'mobile-app']);

      // Act
      const result = await registry.isActiveClient('test');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('#isActiveClient', () => {
    it('should return false when client is not in active set', async () => {
      // Arrange
      const registry = new InMemoryClientRegistry(['web-app']);

      // Act
      const result = await registry.isActiveClient('web-app');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for unknown client IDs', async () => {
      // Arrange
      const registry = new InMemoryClientRegistry(['mobile-app']);

      // Act
      const result = await registry.isActiveClient('unknown-client');

      // Assert
      expect(result).toBe(false);
    });
  });
});
