import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser, insertRecipe } from '../helpers/fixtures';
import { DELETE, GET, PUT } from '@/pages/api/recipes/[id]';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

const ARROZ_INPUT = {
  title: 'Arroz con pollo',
  category: 'almuerzo',
  ingredients: [{ name: 'Arroz', qty: 200, unit: 'g', aisle: 'Almacén' }],
};

function setup() {
  const ana = createUser(db);
  const beto = createUser(db, 'beto@mail.com', 'Beto');
  const catalogId = insertRecipe(db);
  const anaId = insertRecipe(db, { ownerId: ana.id, title: 'Arroz' });
  return { ana, beto, catalogId, anaId };
}

describe('GET /api/recipes/:id', () => {
  it('devuelve una receta propia con isCatalog false', async () => {
    const { ana, anaId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${anaId}`,
      user: ana,
      params: { id: String(anaId) },
    });

    const res = await GET(context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Arroz');
    expect(body.isCatalog).toBe(false);
  });

  it('devuelve una receta del catálogo con isCatalog true', async () => {
    const { ana, catalogId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${catalogId}`,
      user: ana,
      params: { id: String(catalogId) },
    });

    const res = await GET(context);
    expect(res.status).toBe(200);
    expect((await res.json()).isCatalog).toBe(true);
  });

  it('responde 404 si la receta es de otro usuario', async () => {
    const { beto, anaId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${anaId}`,
      user: beto,
      params: { id: String(anaId) },
    });

    const res = await GET(context);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No existe la receta' },
    });
  });

  it('responde 404 si el id no es un entero positivo', async () => {
    const { ana } = setup();
    for (const id of ['abc', '0']) {
      const { context } = apiContext({ path: `/api/recipes/${id}`, user: ana, params: { id } });
      const res = await GET(context);
      expect(res.status).toBe(404);
    }
  });
});

describe('PUT /api/recipes/:id', () => {
  it('actualiza una receta propia y devuelve los datos nuevos', async () => {
    const { ana, anaId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${anaId}`,
      method: 'PUT',
      body: ARROZ_INPUT,
      user: ana,
      params: { id: String(anaId) },
    });

    const res = await PUT(context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Arroz con pollo');
    expect(body.category).toBe('almuerzo');
    expect(body.ingredients).toEqual(ARROZ_INPUT.ingredients);
  });

  it('responde 403 FORBIDDEN al intentar editar una receta del catálogo', async () => {
    const { ana, catalogId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${catalogId}`,
      method: 'PUT',
      body: ARROZ_INPUT,
      user: ana,
      params: { id: String(catalogId) },
    });

    const res = await PUT(context);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('FORBIDDEN');
  });

  it('responde 404 si otro usuario intenta editar una receta propia de Ana', async () => {
    const { beto, anaId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${anaId}`,
      method: 'PUT',
      body: ARROZ_INPUT,
      user: beto,
      params: { id: String(anaId) },
    });

    const res = await PUT(context);
    expect(res.status).toBe(404);
  });

  it('responde 400 VALIDATION si el body no es válido', async () => {
    const { ana, anaId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${anaId}`,
      method: 'PUT',
      body: { ...ARROZ_INPUT, title: '' },
      user: ana,
      params: { id: String(anaId) },
    });

    const res = await PUT(context);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION');
  });
});

describe('DELETE /api/recipes/:id', () => {
  it('borra una receta propia (204) y después GET responde 404', async () => {
    const { ana, anaId } = setup();
    const del = apiContext({
      path: `/api/recipes/${anaId}`,
      method: 'DELETE',
      user: ana,
      params: { id: String(anaId) },
    });

    const res = await DELETE(del.context);
    expect(res.status).toBe(204);

    const get = apiContext({
      path: `/api/recipes/${anaId}`,
      user: ana,
      params: { id: String(anaId) },
    });
    expect((await GET(get.context)).status).toBe(404);
  });

  it('responde 403 al intentar borrar una receta del catálogo', async () => {
    const { ana, catalogId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${catalogId}`,
      method: 'DELETE',
      user: ana,
      params: { id: String(catalogId) },
    });

    const res = await DELETE(context);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('FORBIDDEN');
  });

  it('responde 404 si otro usuario intenta borrar una receta propia de Ana', async () => {
    const { beto, anaId } = setup();
    const { context } = apiContext({
      path: `/api/recipes/${anaId}`,
      method: 'DELETE',
      user: beto,
      params: { id: String(anaId) },
    });

    const res = await DELETE(context);
    expect(res.status).toBe(404);
  });
});
