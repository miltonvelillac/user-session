import crypto from 'crypto';
import { promisify } from 'util';
import { PasswordHasher } from '../../domain/ports/PasswordHasher';

const scryptAsync = promisify(crypto.scrypt);

export class SimplePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':');
    if (!salt || !key) {
      return false;
    }
    const derivedKey = (await scryptAsync(plain, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }
}