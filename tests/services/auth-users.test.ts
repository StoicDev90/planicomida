import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { authenticate, EmailTakenError, normalizeEmail, registerUser } from '@/services/auth';

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

describe('usuarios', () => {
  it('normalizeEmail hace trim y pasa a minúsculas', () => {
    expect(normalizeEmail('  Ana@Mail.COM ')).toBe('ana@mail.com');
  });

  it('registerUser normaliza email y nombre, y devuelve el usuario', async () => {
    const user = await registerUser(db, {
      email: ' Ana@Mail.com ',
      name: ' Ana ',
      password: 'secreta123',
    });
    expect(user).toEqual({ id: 1, email: 'ana@mail.com', name: 'Ana' });
  });

  it('guarda un hash scrypt y no la contraseña en claro', async () => {
    await registerUser(db, { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' });
    const row = db.prepare('SELECT password_hash FROM users WHERE id = 1').get() as {
      password_hash: string;
    };
    expect(row.password_hash.startsWith('scrypt$')).toBe(true);
    expect(row.password_hash).not.toContain('secreta123');
  });

  it('rechaza un email repetido sin distinguir mayúsculas con EmailTakenError', async () => {
    await registerUser(db, { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' });
    await expect(
      registerUser(db, { email: 'ANA@mail.com', name: 'Ana', password: 'secreta123' }),
    ).rejects.toBeInstanceOf(EmailTakenError);
  });

  it('authenticate devuelve el usuario sin password_hash si los datos coinciden', async () => {
    await registerUser(db, { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' });
    const user = await authenticate(db, 'ANA@MAIL.COM', 'secreta123');
    expect(user).not.toBeNull();
    expect(user).toEqual({ id: 1, email: 'ana@mail.com', name: 'Ana' });
    expect(Object.keys(user!).sort()).toEqual(['email', 'id', 'name']);
  });

  it('authenticate devuelve null con contraseña incorrecta', async () => {
    await registerUser(db, { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' });
    expect(await authenticate(db, 'ana@mail.com', 'mala')).toBeNull();
  });

  it('authenticate devuelve null si el email no existe', async () => {
    await registerUser(db, { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' });
    expect(await authenticate(db, 'nadie@mail.com', 'secreta123')).toBeNull();
  });
});
