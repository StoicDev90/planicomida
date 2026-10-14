import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  hashToken,
  validateSession,
} from '@/services/auth';
import { createUser } from '../helpers/fixtures';
import type { TestUser } from '../helpers/api';

let db: Db;
let user: TestUser;
const now = new Date('2026-10-13T12:00:00.000Z');

beforeEach(() => {
  db = createTestDb();
  user = createUser(db);
});

const countSessions = () =>
  (db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n;

describe('sesiones', () => {
  it('createSession devuelve un token base64url de 43 caracteres que vence en 30 días', () => {
    const { token, expiresAt } = createSession(db, user.id, now);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(expiresAt.toISOString()).toBe('2026-11-12T12:00:00.000Z');
  });

  it('la tabla guarda el hash del token y no el token', () => {
    const { token } = createSession(db, user.id, now);
    const rows = db.prepare('SELECT id FROM sessions').all() as { id: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(hashToken(token));
    expect(rows[0].id).not.toBe(token);
  });

  it('hashToken devuelve el SHA-256 en hex', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('validateSession devuelve el usuario sin renovar si la sesión está vigente', () => {
    const { token, expiresAt } = createSession(db, user.id, now);
    const result = validateSession(db, token, now);
    expect(result).toEqual({
      user: { id: user.id, email: 'ana@mail.com', name: 'Ana' },
      expiresAt,
      renewed: false,
    });
  });

  it('un token desconocido no valida', () => {
    createSession(db, user.id, now);
    expect(validateSession(db, 'token-que-no-existe', now)).toBeNull();
  });

  it('una sesión vencida no valida y su fila se borra', () => {
    const { token } = createSession(db, user.id, now);
    expect(validateSession(db, token, new Date('2026-11-12T12:00:00.000Z'))).toBeNull();
    expect(countSessions()).toBe(0);
  });

  it('se renueva a 30 días desde ahora cuando quedan menos de 15', () => {
    const { token } = createSession(db, user.id, now);
    const renewAt = new Date('2026-11-02T12:00:00.000Z');
    const result = validateSession(db, token, renewAt);
    expect(result?.renewed).toBe(true);
    expect(result?.expiresAt.toISOString()).toBe('2026-12-02T12:00:00.000Z');
    const row = db.prepare('SELECT expires_at FROM sessions').get() as { expires_at: string };
    expect(row.expires_at).toBe('2026-12-02T12:00:00.000Z');
  });

  it('no se renueva cuando quedan 15 días o más', () => {
    const { token } = createSession(db, user.id, now);
    const result = validateSession(db, token, new Date('2026-10-23T12:00:00.000Z'));
    expect(result?.renewed).toBe(false);
  });

  it('deleteSession invalida el token', () => {
    const { token } = createSession(db, user.id, now);
    deleteSession(db, token);
    expect(validateSession(db, token, now)).toBeNull();
  });

  it('deleteExpiredSessions borra solo las sesiones vencidas', () => {
    createSession(db, user.id, now);
    createSession(db, user.id, new Date('2026-12-01T00:00:00.000Z'));
    expect(deleteExpiredSessions(db, new Date('2026-11-20T00:00:00.000Z'))).toBe(1);
    expect(countSessions()).toBe(1);
  });
});
