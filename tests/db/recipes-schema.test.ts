import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, schemaVersion, type Db } from '@/lib/db';
import { createUser } from '../helpers/fixtures';

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

const addRecipe = (ownerId: number | null = null) =>
  Number(
    db
      .prepare("INSERT INTO recipes (owner_id, title, category) VALUES (?, 'Tarta', 'cena')")
      .run(ownerId).lastInsertRowid,
  );

const addIngredient = (recipeId: number, qty: number | null, unit: string, aisle = 'Verdulería') =>
  db
    .prepare(
      'INSERT INTO recipe_ingredients (recipe_id, position, name, qty, unit, aisle) VALUES (?, 0, ?, ?, ?, ?)',
    )
    .run(recipeId, 'Acelga', qty, unit, aisle);

describe('esquema de recipes', () => {
  it('la versión del esquema es >= 2', () => {
    expect(schemaVersion(db)).toBeGreaterThanOrEqual(2);
  });

  it('acepta una receta de catálogo (owner_id NULL)', () => {
    const id = addRecipe(null);
    const row = db.prepare('SELECT owner_id, title, category FROM recipes WHERE id = ?').get(id);
    expect(row).toEqual({ owner_id: null, title: 'Tarta', category: 'cena' });
  });

  it('rechaza una categoría inválida', () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO recipes (owner_id, title, category) VALUES (NULL, 'Tarta', 'merienda')",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('acepta ingredientes con cantidad, o sin cantidad solo si es "a gusto"', () => {
    const id = addRecipe();
    expect(() => addIngredient(id, 1, 'kg')).not.toThrow();
    expect(() => addIngredient(id, null, 'a gusto')).not.toThrow();
  });

  it('rechaza cantidad NULL con unidad distinta de "a gusto", cantidad con "a gusto" y cantidad no positiva', () => {
    const id = addRecipe();
    expect(() => addIngredient(id, null, 'kg')).toThrow(/CHECK/);
    expect(() => addIngredient(id, 2, 'a gusto')).toThrow(/CHECK/);
    expect(() => addIngredient(id, 0, 'g')).toThrow(/CHECK/);
  });

  it('rechaza una unidad fuera de la lista y una góndola fuera de la lista', () => {
    const id = addRecipe();
    expect(() => addIngredient(id, 1, 'kilo')).toThrow(/CHECK/);
    expect(() => addIngredient(id, 1, 'kg', 'Ferretería')).toThrow(/CHECK/);
  });

  it('borrar la receta borra sus ingredientes', () => {
    const id = addRecipe();
    addIngredient(id, 1, 'kg');
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
    const row = db.prepare('SELECT count(*) AS n FROM recipe_ingredients').get() as { n: number };
    expect(row.n).toBe(0);
  });

  it('borrar el usuario dueño borra sus recetas', () => {
    const user = createUser(db);
    addRecipe(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    const row = db.prepare('SELECT count(*) AS n FROM recipes').get() as { n: number };
    expect(row.n).toBe(0);
  });
});
