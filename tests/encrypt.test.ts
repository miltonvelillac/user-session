import crypto from 'crypto';
import { getSqlPassword } from '../src/shared/utils/encrypt/encrypt';

const encryptForEnv = (plainText: string, masterKeyBase64: string): string => {
  const key = Buffer.from(masterKeyBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${cipherText.toString('base64')}:${tag.toString('base64')}`;
};

describe('encrypt utils', () => {
  describe('#getSqlPassword', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      jest.restoreAllMocks();
    });

    it('should decrypt DB_PASSWORD when MASTER_KEY and encrypted payload are valid', () => {
      // Arrange
      const masterKey = crypto.randomBytes(32).toString('base64');
      const plainPassword = 'MySqlPassword!2026';
      const encrypted = encryptForEnv(plainPassword, masterKey);
      process.env.MASTER_KEY = masterKey;
      process.env.DB_PASSWORD = encrypted;

      // Act
      const result = getSqlPassword();

      // Assert
      expect(result).toBe(plainPassword);
    });

    it('should throw wrapped error when DB_PASSWORD is missing', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      delete process.env.DB_PASSWORD;
      process.env.MASTER_KEY = crypto.randomBytes(32).toString('base64');

      // Act
      const execution = () => getSqlPassword();

      // Assert
      expect(execution).toThrow('Error getting DB_PASSWORD en .env');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should throw wrapped error when MASTER_KEY is missing', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      process.env.DB_PASSWORD = 'invalid:payload:format';
      delete process.env.MASTER_KEY;

      // Act
      const execution = () => getSqlPassword();

      // Assert
      expect(execution).toThrow('Error getting DB_PASSWORD en .env');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should throw wrapped error when MASTER_KEY does not decode to 32 bytes', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      process.env.MASTER_KEY = Buffer.from('short-key').toString('base64');
      process.env.DB_PASSWORD = 'a:b:c';

      // Act
      const execution = () => getSqlPassword();

      // Assert
      expect(execution).toThrow('Error getting DB_PASSWORD en .env');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should throw wrapped error when encrypted payload format is invalid', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      process.env.MASTER_KEY = crypto.randomBytes(32).toString('base64');
      process.env.DB_PASSWORD = 'invalid-format';

      // Act
      const execution = () => getSqlPassword();

      // Assert
      expect(execution).toThrow('Error getting DB_PASSWORD en .env');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
