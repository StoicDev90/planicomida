import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, schemaVersion, type Db } from '@/lib/db';
import { createUser, insertRecipe } from '../helpers/fixtures';

let db: Db;
let user: { id: number };
let recipeId: number;

beforeEach(() => {
  db = createTestDb();
  user = createUser(db);
  recipeId = insertRecipe(db);
});

const add = (
  week: string,
  day: number,
  meal: string,
  recipe: number | null,
  custom: string | null,
) =>
  db
    .prepare(
      'INSERT INTO meal_plan_entries (user_id, week_start, day, meal_type, recipe_id, custom_meal_name) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(user.id, week, day, meal, recipe, custom);

describe('esquema de meal_plan_entries', () => {
  it('la versión del esquema es >= 3', () => {
    expect(schemaVersion(db)).toBeGreaterThanOrEqual(3);
  });

  it('acepta una comida con receta y otra con texto libre', () => {
    expect(() => add('2026-10-12', 0, 'almuerzo', recipeId, null)).not.toThrow();
    expect(() => add('2026-10-12', 0, 'cena', null, 'Delivery')).not.toThrow();
  });

  it('rechaza un week_start que no es lunes o una fecha inexistente', () => {
    expect(() => add('2026-10-13', 0, 'almuerzo', recipeId, null)).toThrow(/CHECK/);
    expect(() => add('2026-02-30', 0, 'almuerzo', recipeId, null)).toThrow(/CHECK/);
  });

  it('rechaza un day fuera de 0-6 o un meal_type inválido', () => {
    expect(() => add('2026-10-12', 7, 'almuerzo', recipeId, null)).toThrow(/CHECK/);
    expect(() => add('2026-10-12', 0, 'merienda', recipeId, null)).toThrow(/CHECK/);
  });

  it('rechaza receta y texto a la vez, o ninguno de los dos', () => {
    expect(() => add('2026-10-12', 0, 'almuerzo', recipeId, 'Sopa')).toThrow(/CHECK/);
    expect(() => add('2026-10-12', 0, 'almuerzo', null, null)).toThrow(/CHECK/);
  });

  it('rechaza dos comidas en el mismo turno', () => {
    add('2026-10-12', 0, 'almuerzo', recipeId, null);
    expect(() => add('2026-10-12', 0, 'almuerzo', recipeId, null)).toThrow(/UNIQUE/);
  });

  it('rechaza una receta inexistente', () => {
    expect(() => add('2026-10-12', 0, 'almuerzo', 999, null)).toThrow(/FOREIGN KEY/);
  });
});
