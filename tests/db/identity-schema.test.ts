import { describe, expect, it } from 'vitest';
import { createTestDb, schemaVersion } from '@/lib/db';
import { createUser } from '../helpers/fixtures';

describe('esquema de identity', () => {
  it('la versión del esquema es >= 1', () => {
    const db = createTestDb();
    expect(schemaVersion(db)).toBeGreaterThanOrEqual(1);
  });

  it('createUser devuelve el usuario insertado', () => {
    const db = createTestDb();
    expect(createUser(db)).toEqual({ id: 1, email: 'ana@mail.com', name: 'Ana' });
  });

  it('el email es único sin distinguir mayúsculas', () => {
    const db = createTestDb();
    createUser(db, 'ana@mail.com');
    expect(() => createUser(db, 'ANA@mail.com')).toThrow(/UNIQUE/);
  });

  it('rechaza un nombre vacío', () => {
    const db = createTestDb();
    expect(() => createUser(db, 'b@mail.com', '')).toThrow(/CHECK/);
  });

  it('rechaza una sesión con usuario inexistente', () => {
    const db = createTestDb();
    expect(() =>
      db
        .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES ('x', 99, '2030-01-01')")
        .run(),
    ).toThrow(/FOREIGN KEY/);
  });

  it('borrar el usuario borra sus sesiones', () => {
    const db = createTestDb();
    const user = createUser(db);
    db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES ('x', ?, '2030-01-01')").run(
      user.id,
    );
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    const row = db.prepare('SELECT count(*) AS n FROM sessions').get() as { n: number };
    expect(row.n).toBe(0);
  });
});
