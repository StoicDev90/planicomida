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
