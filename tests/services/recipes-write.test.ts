import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  updateRecipe,
  type RecipeInputData,
} from '@/services/recipes';
import type { TestUser } from '../helpers/api';
import { createUser, insertRecipe } from '../helpers/fixtures';

let db: Db;
let ana: TestUser;
let beto: TestUser;

beforeEach(() => {
  db = createTestDb();
  ana = createUser(db);
  beto = createUser(db, 'beto@mail.com', 'Beto');
});

const input = {
  title: 'Arroz con pollo',
  category: 'almuerzo' as const,
  ingredients: [
    { name: 'Arroz', qty: 80, unit: 'g' as const, aisle: 'Almacén' as const },
    { name: 'Pollo', qty: 250, unit: 'g' as const, aisle: 'Carnicería' as const },
    { name: 'Sal', qty: null, unit: 'a gusto' as const, aisle: 'Almacén' as const },
  ],
};

const oneIngredient: RecipeInputData = {
  title: 'Arroz hervido',
  category: 'cena',
  ingredients: [{ name: 'Arroz', qty: 1, unit: 'taza', aisle: 'Almacén' }],
};

function positionsOf(recipeId: number): number[] {
  return db
    .prepare<[number], { position: number }>(
      'SELECT position FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position',
    )
    .all(recipeId)
    .map((r) => r.position);
}

function ingredientNamesOf(recipeId: number): string[] {
  return db
    .prepare<[number], { name: string }>(
      'SELECT name FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position',
    )
    .all(recipeId)
    .map((r) => r.name);
}

describe('createRecipe', () => {
  it('crea la receta con sus ingredientes y la devuelve', () => {
    const recipe = createRecipe(db, ana.id, input);

    expect(recipe).toEqual({
      id: 1,
      title: 'Arroz con pollo',
      category: 'almuerzo',
      isCatalog: false,
      ingredients: input.ingredients,
    });
  });

  it('guarda las posiciones 0, 1, 2 de los ingredientes', () => {
    const recipe = createRecipe(db, ana.id, input);

    expect(positionsOf(recipe.id)).toEqual([0, 1, 2]);
  });
});

describe('updateRecipe', () => {
  it('reemplaza todos los ingredientes por el nuevo', () => {
    const recipe = createRecipe(db, ana.id, input);

    const result = updateRecipe(db, ana.id, recipe.id, oneIngredient);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ingredients).toHaveLength(1);
    expect(ingredientNamesOf(recipe.id)).toEqual(['Arroz']);
  });

  it('no permite editar una receta de otro usuario (NOT_FOUND), ni un id inexistente', () => {
    const betoRecipeId = insertRecipe(db, { ownerId: beto.id, title: 'Bife' });

    expect(updateRecipe(db, ana.id, betoRecipeId, oneIngredient)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(updateRecipe(db, ana.id, 9999, oneIngredient)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });

  it('no permite editar una receta del catálogo (FORBIDDEN)', () => {
    const catalogId = insertRecipe(db);

    expect(updateRecipe(db, ana.id, catalogId, oneIngredient)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
  });

  it('si la edición falla en la transacción, la receta conserva sus ingredientes', () => {
    const recipe = createRecipe(db, ana.id, input);
    const invalid: RecipeInputData = {
      title: 'Rota',
      category: 'cena',
      ingredients: [{ name: 'X', qty: null, unit: 'kg', aisle: 'Almacén' } as never],
    };

    expect(() => updateRecipe(db, ana.id, recipe.id, invalid)).toThrow();

    expect(getRecipe(db, ana.id, recipe.id)?.ingredients).toEqual(input.ingredients);
    expect(ingredientNamesOf(recipe.id)).toEqual(['Arroz', 'Pollo', 'Sal']);
  });
});

describe('deleteRecipe', () => {
  it('borra lógicamente una receta propia', () => {
    const recipe = createRecipe(db, ana.id, input);

    expect(deleteRecipe(db, ana.id, recipe.id)).toEqual({ ok: true, value: null });
    expect(getRecipe(db, ana.id, recipe.id)).toBeNull();
    expect(getRecipe(db, ana.id, recipe.id, { includeDeleted: true })).not.toBeNull();
  });

  it('borrar dos veces da NOT_FOUND; catálogo da FORBIDDEN; ajena da NOT_FOUND', () => {
    const recipe = createRecipe(db, ana.id, input);
    const catalogId = insertRecipe(db);
    const betoRecipeId = insertRecipe(db, { ownerId: beto.id, title: 'Bife' });

    deleteRecipe(db, ana.id, recipe.id);

    expect(deleteRecipe(db, ana.id, recipe.id)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(deleteRecipe(db, ana.id, catalogId)).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(deleteRecipe(db, ana.id, betoRecipeId)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('no permite editar una receta ya borrada (NOT_FOUND)', () => {
    const recipe = createRecipe(db, ana.id, input);
    deleteRecipe(db, ana.id, recipe.id);

    expect(updateRecipe(db, ana.id, recipe.id, oneIngredient)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });
});
