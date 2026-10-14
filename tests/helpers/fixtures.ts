import type { Db } from '@/lib/db';
import type { TestUser } from './api';

/** Inserta un usuario directo en la base (con un hash falso). */
export function createUser(db: Db, email = 'ana@mail.com', name = 'Ana'): TestUser {
  const result = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'scrypt$00$00')")
    .run(email, name);
  return { id: Number(result.lastInsertRowid), email, name };
}
