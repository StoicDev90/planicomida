import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser, insertRecipe } from '../helpers/fixtures';
import { GET, POST } from '@/pages/api/recipes/index';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

const TARTA_INPUT = {
  title: 'Tarta de verdura',
  category: 'cena',
  ingredients: [
    { name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' },
    { name: 'Tapas de tarta', qty: 1, unit: 'unidad', aisle: 'Almacén' },
    { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' },
  ],
};

function seed() {
  const user = createUser(db);
  insertRecipe(db, { title: 'Tarta de verdura', category: 'cena' });
  insertRecipe(db, { ownerId: user.id, title: 'Arroz', category: 'almuerzo' });
  return user;
}

describe('GET /api/recipes', () => {
  it('lista catálogo y propias, ordenadas por título, con el resumen completo', async () => {
    const user = seed();
    const { context } = apiContext({ path: '/api/recipes', user });

    const res = await GET(context);
    expect(res.status).toBe(200);
    const { recipes } = await res.json();
    expect(recipes.map((r: { title: string }) => r.title)).toEqual(['Arroz', 'Tarta de verdura']);
    for (const r of recipes) {
      expect(Object.keys(r).sort()).toEqual([
        'category',
        'id',
        'ingredientCount',
        'isCatalog',
        'title',
      ]);
    }
  });

  it('filtra por categoría', async () => {
    const user = seed();
    const { context } = apiContext({ path: '/api/recipes?category=cena', user });

    const res = await GET(context);
    const { recipes } = await res.json();
    expect(recipes.map((r: { title: string }) => r.title)).toEqual(['Tarta de verdura']);
  });

  it('filtra con mine=1 y con q (sin tildes ni mayúsculas)', async () => {
    const user = seed();

    const mine = await GET(apiContext({ path: '/api/recipes?mine=1', user }).context);
    expect((await mine.json()).recipes.map((r: { title: string }) => r.title)).toEqual(['Arroz']);

    const q = await GET(apiContext({ path: '/api/recipes?q=tarta', user }).context);
    expect((await q.json()).recipes.map((r: { title: string }) => r.title)).toEqual([
      'Tarta de verdura',
    ]);
  });

  it('responde 400 VALIDATION con el campo inválido', async () => {
    const user = seed();
    const { context } = apiContext({ path: '/api/recipes?category=merienda', user });

    const res = await GET(context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION');
    expect(body.error.fields.category).toBeDefined();
  });
});

describe('POST /api/recipes', () => {
  it('crea la receta y responde 201 con el input más id e isCatalog', async () => {
    const user = createUser(db);
    const { context } = apiContext({
      path: '/api/recipes',
      method: 'POST',
      body: TARTA_INPUT,
      user,
    });

    const res = await POST(context);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ...TARTA_INPUT,
      id: expect.any(Number),
      isCatalog: false,
    });
  });

  it('rechaza un ingrediente sin cantidad con el mensaje de la spec', async () => {
    const user = createUser(db);
    const { context } = apiContext({
      path: '/api/recipes',
      method: 'POST',
      body: {
        title: 'Ensalada',
        category: 'almuerzo',
        ingredients: [{ name: 'Acelga', qty: null, unit: 'kg', aisle: 'Verdulería' }],
      },
      user,
    });

    const res = await POST(context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION');
    expect(body.error.fields['ingredients.0.qty']).toBe('Poné una cantidad, o elegí "a gusto"');
  });

  it('rechaza una lista de ingredientes vacía', async () => {
    const user = createUser(db);
    const { context } = apiContext({
      path: '/api/recipes',
      method: 'POST',
      body: { ...TARTA_INPUT, ingredients: [] },
      user,
    });

    const res = await POST(context);
    expect(res.status).toBe(400);
  });

  it('rechaza un cuerpo JSON roto', async () => {
    const user = createUser(db);
    const { context } = apiContext({
      path: '/api/recipes',
      method: 'POST',
      rawBody: '{x',
      contentType: 'application/json',
      user,
    });

    const res = await POST(context);
    expect(res.status).toBe(400);
  });
});
