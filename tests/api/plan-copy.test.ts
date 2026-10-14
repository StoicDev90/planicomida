import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';
import { POST } from '@/pages/api/plan/[week]/copy-from/[sourceWeek]';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

describe('POST /api/plan/:week/copy-from/:sourceWeek', () => {
  it('copia las entradas de la semana origen al destino vacío → 200 con copied y plan', async () => {
    const user = createUser(db);
    const tarta = insertRecipe(db);
    insertEntry(db, user.id, '2026-10-05', 0, 'almuerzo', tarta);
    insertEntry(db, user.id, '2026-10-05', 2, 'cena', 'Delivery');

    const { context } = apiContext({
      path: '/api/plan/2026-10-12/copy-from/2026-10-05',
      method: 'POST',
      params: { week: '2026-10-12', sourceWeek: '2026-10-05' },
      user,
    });
    const res = await POST(context);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.copied).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.plan.weekStart).toBe('2026-10-12');
    expect(body.plan.entries.length).toBe(2);
  });

  it('repetir la copia → copied 0 (los turnos ya están ocupados)', async () => {
    const user = createUser(db);
    const tarta = insertRecipe(db);
    insertEntry(db, user.id, '2026-10-05', 0, 'almuerzo', tarta);
    insertEntry(db, user.id, '2026-10-05', 2, 'cena', 'Delivery');
    const params = { week: '2026-10-12', sourceWeek: '2026-10-05' };

    await POST(
      apiContext({
        path: '/api/plan/2026-10-12/copy-from/2026-10-05',
        method: 'POST',
        params,
        user,
      }).context,
    );
    const res = await POST(
      apiContext({
        path: '/api/plan/2026-10-12/copy-from/2026-10-05',
        method: 'POST',
        params,
        user,
      }).context,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.copied).toBe(0);
    expect(body.plan.entries.length).toBe(2);
  });

  it('week igual a sourceWeek → 400', async () => {
    const user = createUser(db);
    const { context } = apiContext({
      path: '/api/plan/2026-10-12/copy-from/2026-10-12',
      method: 'POST',
      params: { week: '2026-10-12', sourceWeek: '2026-10-12' },
      user,
    });
    const res = await POST(context);

    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('No se puede copiar una semana sobre sí misma');
  });

  it('sourceWeek que no es lunes (martes) → 400', async () => {
    const user = createUser(db);
    const { context } = apiContext({
      path: '/api/plan/2026-10-12/copy-from/2026-10-06',
      method: 'POST',
      params: { week: '2026-10-12', sourceWeek: '2026-10-06' },
      user,
    });
    const res = await POST(context);

    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe(
      'La semana debe ser la fecha de un lunes (YYYY-MM-DD)',
    );
  });
});
