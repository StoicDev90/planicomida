import type { Db } from '@/lib/db';
import type { TestUser } from './api';

/** Inserta un usuario directo en la base (con un hash falso). */
export function createUser(db: Db, email = 'ana@mail.com', name = 'Ana'): TestUser {
  const result = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'scrypt$00$00')")
    .run(email, name);
  return { id: Number(result.lastInsertRowid), email, name };
}

interface FixtureIngredient {
  name: string;
  qty: number | null;
  unit: string;
  aisle: string;
}

/** Inserta una receta directo en la base. ownerId null = catálogo. Devuelve el id. */
export function insertRecipe(
  db: Db,
  {
    ownerId = null,
    title = 'Tarta de verdura',
    category = 'cena',
    deleted = false,
    ingredients = [{ name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' }],
  }: {
    ownerId?: number | null;
    title?: string;
    category?: string;
    deleted?: boolean;
    ingredients?: FixtureIngredient[];
  } = {},
): number {
  const id = Number(
    db
      .prepare('INSERT INTO recipes (owner_id, title, category, deleted_at) VALUES (?, ?, ?, ?)')
      .run(ownerId, title, category, deleted ? '2026-01-01T00:00:00Z' : null).lastInsertRowid,
  );
  const insert = db.prepare(
    'INSERT INTO recipe_ingredients (recipe_id, position, name, qty, unit, aisle) VALUES (?, ?, ?, ?, ?, ?)',
  );
  ingredients.forEach((i, position) => insert.run(id, position, i.name, i.qty, i.unit, i.aisle));
  return id;
}
