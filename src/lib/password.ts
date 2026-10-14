import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** Devuelve "scrypt$<salt hex>$<hash hex>" (salt aleatorio de 16 bytes, clave de 64 bytes). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(plain, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

/** true si `plain` corresponde a `stored`. Formato inválido → false (nunca lanza). */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const key = await scryptAsync(plain, salt, KEY_LENGTH);
  return timingSafeEqual(key, expected);
}
