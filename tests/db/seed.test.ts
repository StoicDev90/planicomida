import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { listRecipes } from '@/services/recipes';
import { createUser } from '../helpers/fixtures';

const SEED = readFileSync('db/seed.sql', 'utf8');

let db: Db;

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

describe('db/seed.sql', () => {
  it('siembra 14 recetas, todas del catálogo (owner_id NULL)', () => {
    const rows = db.prepare('SELECT owner_id FROM recipes').all() as { owner_id: number | null }[];
    expect(rows).toHaveLength(14);
    expect(rows.every((r) => r.owner_id === null)).toBe(true);
  });

  it('tiene al menos 2 recetas por categoría (desayuno 3, almuerzo 4, cena 4, snack 3)', () => {
    const rows = db
      .prepare('SELECT category, count(*) AS n FROM recipes GROUP BY category ORDER BY category')
      .all();
    expect(rows).toEqual([
      { category: 'almuerzo', n: 4 },
      { category: 'cena', n: 4 },
      { category: 'desayuno', n: 3 },
      { category: 'snack', n: 3 },
    ]);
  });

  it('toda receta tiene al menos 1 ingrediente', () => {
    const row = db
      .prepare(
        `SELECT count(*) AS n FROM recipes r
          WHERE NOT EXISTS (SELECT 1 FROM recipe_ingredients i WHERE i.recipe_id = r.id)`,
      )
      .get() as { n: number };
    expect(row.n).toBe(0);
  });

  it('es idempotente: volver a ejecutarlo no duplica nada', () => {
    const count = () =>
      db
        .prepare(
          'SELECT (SELECT count(*) FROM recipes) AS recipes, (SELECT count(*) FROM recipe_ingredients) AS ingredients',
        )
        .get();
    const before = count();

    db.exec(SEED);

    expect(count()).toEqual(before);
    expect(before).toMatchObject({ recipes: 14 });
  });

  it('tiene ingredientes repetidos entre recetas (al menos 8 nombres en 2 o más recetas)', () => {
    const rows = db
      .prepare(
        'SELECT name FROM recipe_ingredients GROUP BY name HAVING COUNT(DISTINCT recipe_id) >= 2',
      )
      .all();
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it('el service lista las 14 recetas del catálogo con isCatalog true', () => {
    const user = createUser(db);
    const recipes = listRecipes(db, user.id);
    expect(recipes).toHaveLength(14);
    expect(recipes.every((r) => r.isCatalog)).toBe(true);
  });
});
