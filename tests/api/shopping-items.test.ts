import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser } from '../helpers/fixtures';
import { POST } from '@/pages/api/shopping-list/[week]/items';
import { DELETE } from '@/pages/api/shopping-list/items/[id]';
import { addManualItem, getShoppingList } from '@/services/shopping-list';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

describe('POST /api/shopping-list/:week/items', () => {
  it('agrega un ítem con cantidad y unidad y aparece en Otros', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const { context } = apiContext({
      path: '/api/shopping-list/2026-10-12/items',
      method: 'POST',
      params: { week: '2026-10-12' },
      body: { name: 'Detergente', qty: 1, unit: 'unidad' },
      user: ana,
    });

    const res = await POST(context);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      key: 'manual|1',
      id: 1,
      name: 'Detergente',
      qty: 1,
      unit: 'unidad',
      manual: true,
    });

    const list = getShoppingList(db, ana.id, '2026-10-12');
    const otros = list.aisles.find((a) => a.aisle === 'Otros');
    expect(otros?.items).toContainEqual(
      expect.objectContaining({ key: 'manual|1', name: 'Detergente', manual: true }),
    );
  });

  it('acepta un ítem sin cantidad ni unidad (quedan en null)', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const { context } = apiContext({
      path: '/api/shopping-list/2026-10-12/items',
      method: 'POST',
      params: { week: '2026-10-12' },
      body: { name: 'Papel' },
      user: ana,
    });

    const res = await POST(context);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: 'Papel', qty: null, unit: null, manual: true });
  });

  it('qty sin unit → 400 con el error del campo qty', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const { context } = apiContext({
      path: '/api/shopping-list/2026-10-12/items',
      method: 'POST',
      params: { week: '2026-10-12' },
      body: { name: 'X', qty: 1 },
      user: ana,
    });

    const res = await POST(context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fields.qty).toBe('La cantidad y la unidad van juntas');
  });

  it('semana que no es lunes → 400', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const { context } = apiContext({
      path: '/api/shopping-list/2026-10-13/items',
      method: 'POST',
      params: { week: '2026-10-13' },
      body: { name: 'Papel' },
      user: ana,
    });

    const res = await POST(context);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/shopping-list/items/:id', () => {
  it('borra el ítem propio (204) y repetir da 404', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    addManualItem(db, ana.id, '2026-10-12', { name: 'Detergente', aisle: 'Otros' });

    const first = apiContext({
      path: '/api/shopping-list/items/1',
      method: 'DELETE',
      params: { id: '1' },
      user: ana,
    });
    const res = await DELETE(first.context);
    expect(res.status).toBe(204);

    const second = apiContext({
      path: '/api/shopping-list/items/1',
      method: 'DELETE',
      params: { id: '1' },
      user: ana,
    });
    const again = await DELETE(second.context);
    expect(again.status).toBe(404);
    expect(await again.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No existe el ítem' },
    });
  });

  it('otro usuario recibe 404 y el ítem sigue existiendo', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const beto = createUser(db, 'beto@mail.com', 'Beto');
    addManualItem(db, ana.id, '2026-10-12', { name: 'Detergente', aisle: 'Otros' });

    const { context } = apiContext({
      path: '/api/shopping-list/items/1',
      method: 'DELETE',
      params: { id: '1' },
      user: beto,
    });
    const res = await DELETE(context);
    expect(res.status).toBe(404);

    const list = getShoppingList(db, ana.id, '2026-10-12');
    const otros = list.aisles.find((a) => a.aisle === 'Otros');
    expect(otros?.items).toContainEqual(expect.objectContaining({ key: 'manual|1' }));
  });

  it('id que no es número → 404', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const { context } = apiContext({
      path: '/api/shopping-list/items/abc',
      method: 'DELETE',
      params: { id: 'abc' },
      user: ana,
    });
    const res = await DELETE(context);
    expect(res.status).toBe(404);
  });
});
