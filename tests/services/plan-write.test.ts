import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { clearMeal, getEntry, setMeal } from '@/services/plan';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';

let db: Db;
let ana: { id: number };
let beto: { id: number };
let tarta: number;
const slot = { week: '2026-10-12', day: 1, meal: 'almuerzo' as const };

const count = (userId: number) =>
  db
    .prepare<[number, string, number, string], number>(
      'SELECT count(*) FROM meal_plan_entries WHERE user_id = ? AND week_start = ? AND day = ? AND meal_type = ?',
    )
    .pluck()
    .get(userId, slot.week, slot.day, slot.meal)!;

beforeEach(() => {
  db = createTestDb();
  ana = createUser(db);
  beto = createUser(db, 'beto@mail.com', 'Beto');
  tarta = insertRecipe(db, { title: 'Tarta de verdura' });
});

describe('setMeal', () => {
  it('asigna una receta propia o del catálogo', () => {
    const result = setMeal(db, ana.id, slot, { recipeId: tarta });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.recipe?.id).toBe(tarta);
  });

  it('reemplaza lo que había en el turno (upsert) y deja una sola fila', () => {
    setMeal(db, ana.id, slot, { recipeId: tarta });
    const result = setMeal(db, ana.id, slot, { customMealName: 'Sobras' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.customMealName).toBe('Sobras');
      expect(result.entry.recipe).toBeNull();
    }
    expect(count(ana.id)).toBe(1);
  });

  it('es idempotente: la misma asignación dos veces deja una fila', () => {
    setMeal(db, ana.id, slot, { recipeId: tarta });
    setMeal(db, ana.id, slot, { recipeId: tarta });
    expect(count(ana.id)).toBe(1);
  });

  it('receta de otro usuario → RECIPE_NOT_FOUND y no inserta nada', () => {
    const ajena = insertRecipe(db, { ownerId: beto.id });
    expect(setMeal(db, ana.id, slot, { recipeId: ajena })).toEqual({
      ok: false,
      error: 'RECIPE_NOT_FOUND',
    });
    expect(count(ana.id)).toBe(0);
  });

  it('receta borrada o inexistente → RECIPE_NOT_FOUND', () => {
    const borrada = insertRecipe(db, { deleted: true });
    expect(setMeal(db, ana.id, slot, { recipeId: borrada })).toEqual({
      ok: false,
      error: 'RECIPE_NOT_FOUND',
    });
    expect(setMeal(db, ana.id, slot, { recipeId: 999 })).toEqual({
      ok: false,
      error: 'RECIPE_NOT_FOUND',
    });
    expect(count(ana.id)).toBe(0);
  });

  it('receta propia → ok', () => {
    const propia = insertRecipe(db, { ownerId: ana.id, title: 'Mi receta' });
    const result = setMeal(db, ana.id, slot, { recipeId: propia });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.entry.recipe).toEqual({ id: propia, title: 'Mi receta', deleted: false });
  });
});

describe('clearMeal', () => {
  it('vacía el turno', () => {
    setMeal(db, ana.id, slot, { recipeId: tarta });
    clearMeal(db, ana.id, slot);
    expect(getEntry(db, ana.id, slot)).toBeNull();
  });

  it('sobre un turno vacío no lanza', () => {
    expect(() => clearMeal(db, ana.id, slot)).not.toThrow();
    expect(count(ana.id)).toBe(0);
  });

  it('no borra el mismo turno de otro usuario', () => {
    insertEntry(db, beto.id, slot.week, slot.day, slot.meal, 'Pizza de Beto');
    setMeal(db, ana.id, slot, { customMealName: 'Sobras' });

    clearMeal(db, ana.id, slot);

    expect(getEntry(db, ana.id, slot)).toBeNull();
    expect(getEntry(db, beto.id, slot)?.customMealName).toBe('Pizza de Beto');
  });
});
