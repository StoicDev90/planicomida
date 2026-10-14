import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('password', () => {
  it('genera un hash con el formato scrypt$salt$clave', async () => {
    const hash = await hashPassword('secreta123');
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('dos hashes de la misma contraseña son distintos', async () => {
    const a = await hashPassword('secreta123');
    const b = await hashPassword('secreta123');
    expect(a).not.toBe(b);
  });

  it('verifica la contraseña correcta', async () => {
    const hash = await hashPassword('secreta123');
    expect(await verifyPassword('secreta123', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('secreta123');
    expect(await verifyPassword('otra-cosa', hash)).toBe(false);
  });

  it('formatos inválidos devuelven false sin lanzar', async () => {
    for (const stored of ['', 'texto-plano', 'bcrypt$aa$bb', 'scrypt$00$00']) {
      expect(await verifyPassword('secreta123', stored)).toBe(false);
    }
  });

  it('el hash no contiene la contraseña', async () => {
    const hash = await hashPassword('secreta123');
    expect(hash).not.toContain('secreta123');
  });
});
