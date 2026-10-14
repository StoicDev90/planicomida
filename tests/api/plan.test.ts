import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';
import { GET } from '@/pages/api/plan/index';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => {
  setDb(undefined);
  vi.useRealTimers();
});

describe('GET /api/plan', () => {
  it('sin week usa el lunes de la semana actual (según TZ)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T15:00:00-03:00')); // domingo
    const user = createUser(db);
    const { context } = apiContext({ path: '/api/plan', user });

    const res = await GET(context);
    expect(res.status).toBe(200);
    expect((await res.json()).weekStart).toBe('2026-10-12');
  });

  it('con week válido devuelve el plan con entradas, prevWeek y nextWeek', async () => {
    const user = createUser(db);
    const recipeId = insertRecipe(db, { ownerId: user.id, title: 'Arroz' });
    insertEntry(db, user.id, '2026-10-12', 0, 'almuerzo', recipeId);
    const { context } = apiContext({ path: '/api/plan?week=2026-10-12', user });

    const res = await GET(context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries.length).toBe(1);
    expect(body.weekStart).toBe('2026-10-12');
    expect(body.prevWeek).toBe('2026-10-05');
    expect(body.nextWeek).toBe('2026-10-19');
  });

  it('week que no es lunes → 400 VALIDATION', async () => {
    const user = createUser(db);
    const { context } = apiContext({ path: '/api/plan?week=2026-10-13', user });

    const res = await GET(context);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION',
        message: 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)',
      },
    });
  });

  it.each(['2026-02-30', 'hola'])('week inválido %s → 400', async (week) => {
    const user = createUser(db);
    const { context } = apiContext({ path: `/api/plan?week=${week}`, user });

    const res = await GET(context);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION');
  });

  it('no muestra entradas de otro usuario en la misma semana', async () => {
    const ana = createUser(db, 'ana@mail.com', 'Ana');
    const beto = createUser(db, 'beto@mail.com', 'Beto');
    insertEntry(db, beto.id, '2026-10-12', 0, 'cena', 'Pizza de Beto');
    const { context } = apiContext({ path: '/api/plan?week=2026-10-12', user: ana });

    const res = await GET(context);
    expect((await res.json()).entries).toEqual([]);
  });
});
