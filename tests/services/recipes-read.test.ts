import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { canAssignRecipe, getRecipe, listRecipes } from '@/services/recipes';
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

describe('listRecipes', () => {
  it('muestra el catálogo y las propias, ordenadas por título, sin las ajenas', () => {
    insertRecipe(db, { title: 'Tarta' });
    insertRecipe(db, { ownerId: ana.id, title: 'Arroz' });
    insertRecipe(db, { ownerId: beto.id, title: 'Bife' });

    const recipes = listRecipes(db, ana.id);

    expect(recipes.map((r) => r.title)).toEqual(['Arroz', 'Tarta']);
    expect(recipes.map((r) => r.isCatalog)).toEqual([false, true]);
  });

  it('devuelve ingredientCount con la cantidad de ingredientes', () => {
    insertRecipe(db, {
      title: 'Ensalada',
      ingredients: [
        { name: 'Lechuga', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
        { name: 'Tomate', qty: 2, unit: 'unidad', aisle: 'Verdulería' },
        { name: 'Aceite', qty: 1, unit: 'cda', aisle: 'Almacén' },
      ],
    });

    const [recipe] = listRecipes(db, ana.id);

    expect(recipe.ingredientCount).toBe(3);
  });

  it('filtra por categoría y por mine', () => {
    insertRecipe(db, { title: 'Tarta', category: 'cena' });
    insertRecipe(db, { title: 'Avena', category: 'desayuno' });
    insertRecipe(db, { ownerId: ana.id, title: 'Arroz', category: 'almuerzo' });
    insertRecipe(db, { ownerId: ana.id, title: 'Sopa', category: 'cena' });
    insertRecipe(db, { ownerId: beto.id, title: 'Bife', category: 'cena' });

    expect(listRecipes(db, ana.id, { category: 'cena' }).map((r) => r.title)).toEqual([
      'Sopa',
      'Tarta',
    ]);
    expect(listRecipes(db, ana.id, { mine: true }).map((r) => r.title)).toEqual(['Arroz', 'Sopa']);
  });

  it('busca por texto sin distinguir mayúsculas ni tildes', () => {
    insertRecipe(db, { title: 'Tarta de verdura' });
    insertRecipe(db, { title: 'Guiso de lentejas' });

    expect(listRecipes(db, ana.id, { q: 'TARTÁ' }).map((r) => r.title)).toEqual([
      'Tarta de verdura',
    ]);
    expect(listRecipes(db, ana.id, { q: 'pollo' })).toEqual([]);
  });

  it('no muestra recetas borradas', () => {
    insertRecipe(db, { title: 'Vieja', deleted: true });
    insertRecipe(db, { title: 'Vigente' });

    expect(listRecipes(db, ana.id).map((r) => r.title)).toEqual(['Vigente']);
  });
});

describe('getRecipe', () => {
  it('devuelve la receta propia con sus ingredientes en orden de position', () => {
    const id = insertRecipe(db, {
      ownerId: ana.id,
      title: 'Sopa',
      category: 'cena',
      ingredients: [
        { name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' },
        { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' },
      ],
    });

    expect(getRecipe(db, ana.id, id)).toEqual({
      id,
      title: 'Sopa',
      category: 'cena',
      isCatalog: false,
      ingredients: [
        { name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' },
        { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' },
      ],
    });
  });

  it('devuelve null si es de otro usuario o si no existe', () => {
    const betoId = insertRecipe(db, { ownerId: beto.id, title: 'Bife' });

    expect(getRecipe(db, ana.id, betoId)).toBeNull();
    expect(getRecipe(db, ana.id, 99999)).toBeNull();
  });

  it('devuelve null si está borrada, y la receta si se pide includeDeleted', () => {
    const id = insertRecipe(db, { ownerId: ana.id, title: 'Vieja', deleted: true });

    expect(getRecipe(db, ana.id, id)).toBeNull();
    expect(getRecipe(db, ana.id, id, { includeDeleted: true })?.title).toBe('Vieja');
  });
});

describe('canAssignRecipe', () => {
  it('permite catálogo y propias, y rechaza ajenas y borradas', () => {
    const catalogId = insertRecipe(db, { title: 'Tarta' });
    const ownId = insertRecipe(db, { ownerId: ana.id, title: 'Arroz' });
    const otherId = insertRecipe(db, { ownerId: beto.id, title: 'Bife' });
    const deletedId = insertRecipe(db, { ownerId: ana.id, title: 'Vieja', deleted: true });

    expect(canAssignRecipe(db, ana.id, catalogId)).toBe(true);
    expect(canAssignRecipe(db, ana.id, ownId)).toBe(true);
    expect(canAssignRecipe(db, ana.id, otherId)).toBe(false);
    expect(canAssignRecipe(db, ana.id, deletedId)).toBe(false);
  });
});
