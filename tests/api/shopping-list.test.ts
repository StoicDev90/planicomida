import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';
import { GET } from '@/pages/api/shopping-list/index';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => {
  setDb(undefined);
  vi.useRealTimers();
});

describe('GET /api/shopping-list', () => {
  it('con week válido devuelve la lista con recetas y comidas libres', async () => {
    const user = createUser(db);
    const tarta = insertRecipe(db, {
      ownerId: user.id,
      ingredients: [{ name: 'Tomate', qty: 2, unit: 'unidad', aisle: 'Verdulería' }],
    });
    insertEntry(db, user.id, '2026-10-12', 0, 'cena', tarta);
    insertEntry(db, user.id, '2026-10-12', 1, 'cena', 'Delivery');
    const { context } = apiContext({ path: '/api/shopping-list?week=2026-10-12', user });

    const res = await GET(context);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      weekStart: '2026-10-12',
      aisles: [
        {
          aisle: 'Verdulería',
          items: [{ key: 'tomate|unidad', name: 'Tomate', qty: 2, unit: 'unidad', manual: false }],
        },
      ],
      customMeals: ['Delivery'],
    });
  });

  it('sin week usa el lunes de la semana actual (según TZ)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T12:00:00-03:00')); // miércoles
    const user = createUser(db);
    const { context } = apiContext({ path: '/api/shopping-list', user });

    const res = await GET(context);
    expect(res.status).toBe(200);
    expect((await res.json()).weekStart).toBe('2026-10-12');
  });

  it('week que no es lunes → 400 VALIDATION', async () => {
    const user = createUser(db);
    const { context } = apiContext({ path: '/api/shopping-list?week=2026-10-13', user });

    const res = await GET(context);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION',
        message: 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)',
      },
    });
  });

  it('otro usuario pidiendo la misma semana no ve el plan ajeno', async () => {
    const owner = createUser(db);
    const other = createUser(db, 'otro@mail.com', 'Otro');
    const tarta = insertRecipe(db, {
      ownerId: owner.id,
      ingredients: [{ name: 'Tomate', qty: 2, unit: 'unidad', aisle: 'Verdulería' }],
    });
    insertEntry(db, owner.id, '2026-10-12', 0, 'cena', tarta);
    const { context } = apiContext({ path: '/api/shopping-list?week=2026-10-12', user: other });

    const res = await GET(context);
    expect(res.status).toBe(200);
    expect((await res.json()).aisles).toEqual([]);
  });
});
