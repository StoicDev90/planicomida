import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';

export interface User {
  id: number;
  email: string;
  name: string;
}

export class EmailTakenError extends Error {
  constructor() {
    super('Ya hay una cuenta con ese email');
    this.name = 'EmailTakenError';
  }
}

/** trim + minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Crea el usuario. Lanza EmailTakenError si el email ya existe (sin distinguir mayúsculas). */
export async function registerUser(
  db: Db,
  input: { email: string; name: string; password: string },
): Promise<User> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const passwordHash = await hashPassword(input.password);
  try {
    const result = db
      .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
      .run(email, name, passwordHash);
    return { id: Number(result.lastInsertRowid), email, name };
  } catch (error) {
    if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new EmailTakenError();
    }
    throw error;
  }
}

/** Usuario si email y contraseña coinciden; si no, null. */
export async function authenticate(db: Db, email: string, password: string): Promise<User | null> {
  const row = db
    .prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
    .get(normalizeEmail(email)) as
    { id: number; email: string; name: string; password_hash: string } | undefined;
  if (!row) return null;
  if (!(await verifyPassword(password, row.password_hash))) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export const SESSION_TTL_DAYS = 30;
export const SESSION_RENEW_BELOW_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/** SHA-256 en hex. En la base solo se guarda esto, nunca el token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Crea la sesión. `token` = 32 bytes aleatorios en base64url. Vence en 30 días desde `now`. */
export function createSession(
  db: Db,
  userId: number,
  now = new Date(),
): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * DAY_MS);
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

/**
 * Valida el token.
 * - No existe → null.
 * - Vencida (expires_at <= now) → borra la fila y devuelve null.
 * - Le quedan menos de 15 días → extiende a now + 30 días y devuelve renewed: true.
 */
export function validateSession(
  db: Db,
  token: string,
  now = new Date(),
): { user: User; expiresAt: Date; renewed: boolean } | null {
  const id = hashToken(token);
  const row = db
    .prepare(
      'SELECT s.expires_at, u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?',
    )
    .get(id) as { expires_at: string; id: number; email: string; name: string } | undefined;
  if (!row) return null;

  const nowIso = now.toISOString();
  if (row.expires_at <= nowIso) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }

  const user: User = { id: row.id, email: row.email, name: row.name };
  const renewBelowIso = new Date(now.getTime() + SESSION_RENEW_BELOW_DAYS * DAY_MS).toISOString();
  if (row.expires_at < renewBelowIso) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * DAY_MS);
    db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expiresAt.toISOString(), id);
    return { user, expiresAt, renewed: true };
  }
  return { user, expiresAt: new Date(row.expires_at), renewed: false };
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
}

/** Borra todas las sesiones vencidas (expires_at <= now). Devuelve cuántas borró. */
export function deleteExpiredSessions(db: Db, now = new Date()): number {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes;
}
