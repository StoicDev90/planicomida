import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser, insertRecipe } from '../helpers/fixtures';
import { DELETE, PUT } from '@/pages/api/plan/[week]/[day]/[meal]';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

const params = { week: '2026-10-12', day: '1', meal: 'almuerzo' };

function countEntries(userId: number, week: string, day: number, meal: string): number {
  return db
    .prepare<[number, string, number, string], number>(
      'SELECT COUNT(*) FROM meal_plan_entries WHERE user_id = ? AND week_start = ? AND day = ? AND meal_type = ?',
    )
    .pluck()
    .get(userId, week, day, meal) as number;
}

describe('PUT /api/plan/:week/:day/:meal', () => {
  it('asigna una receta al turno → 200 con la entrada', async () => {
    const ana = createUser(db);
    const tarta = insertRecipe(db);
    const { context } = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: { recipeId: tarta },
      params,
      user: ana,
    });

    const res = await PUT(context);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      day: 1,
      mealType: 'almuerzo',
      recipe: { id: tarta, title: 'Tarta de verdura', deleted: false },
      customMealName: null,
    });
  });

  it('dos PUT sobre el mismo turno → la segunda reemplaza y queda una sola fila', async () => {
    const ana = createUser(db);
    const tarta = insertRecipe(db);
    const first = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: { recipeId: tarta },
      params,
      user: ana,
    });
    await PUT(first.context);

    const second = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: { customMealName: 'Sobras' },
      params,
      user: ana,
    });
    const res = await PUT(second.context);
    expect(res.status).toBe(200);
    expect((await res.json()).customMealName).toBe('Sobras');
    expect(countEntries(ana.id, '2026-10-12', 1, 'almuerzo')).toBe(1);
  });

  it('body con recipeId y customMealName, o body vacío → 400', async () => {
    const ana = createUser(db);
    const tarta = insertRecipe(db);
    const both = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: { recipeId: tarta, customMealName: 'x' },
      params,
      user: ana,
    });
    expect((await PUT(both.context)).status).toBe(400);

    const empty = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: {},
      params,
      user: ana,
    });
    expect((await PUT(empty.context)).status).toBe(400);
  });

  it('receta de otro usuario → 404 NOT_FOUND', async () => {
    const ana = createUser(db);
    const beto = createUser(db, 'beto@mail.com', 'Beto');
    const recetaDeBeto = insertRecipe(db, { ownerId: beto.id });
    const { context } = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: { recipeId: recetaDeBeto },
      params,
      user: ana,
    });

    const res = await PUT(context);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No existe la receta' },
    });
  });

  it('otro usuario asigna el mismo turno → no toca el plan de Ana', async () => {
    const ana = createUser(db);
    const beto = createUser(db, 'beto@mail.com', 'Beto');
    const put = (user: typeof ana, customMealName: string) =>
      PUT(
        apiContext({
          path: '/api/plan/2026-10-12/1/almuerzo',
          method: 'PUT',
          body: { customMealName },
          params,
          user,
        }).context,
      );

    await put(ana, 'Milanesas');
    const res = await put(beto, 'Ensalada');

    expect(res.status).toBe(200);
    expect(countEntries(ana.id, '2026-10-12', 1, 'almuerzo')).toBe(1);
    expect(countEntries(beto.id, '2026-10-12', 1, 'almuerzo')).toBe(1);
    const nameOfAna = db
      .prepare('SELECT custom_meal_name FROM meal_plan_entries WHERE user_id = ?')
      .pluck()
      .get(ana.id);
    expect(nameOfAna).toBe('Milanesas');
  });

  it.each([
    { week: '2026-10-13', day: '1', meal: 'almuerzo' },
    { week: '2026-10-12', day: '7', meal: 'almuerzo' },
    { week: '2026-10-12', day: '1', meal: 'merienda' },
  ])('parámetros inválidos %o → 400', async (bad) => {
    const ana = createUser(db);
    const tarta = insertRecipe(db);
    const { context } = apiContext({
      path: `/api/plan/${bad.week}/${bad.day}/${bad.meal}`,
      method: 'PUT',
      body: { recipeId: tarta },
      params: bad,
      user: ana,
    });

    const res = await PUT(context);
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('Semana, día o comida inválidos');
  });

  it.each(['desayuno', 'snack'])('meal %s se acepta → 200', async (meal) => {
    const ana = createUser(db);
    const { context } = apiContext({
      path: `/api/plan/2026-10-12/1/${meal}`,
      method: 'PUT',
      body: { customMealName: 'Tostadas' },
      params: { ...params, meal },
      user: ana,
    });

    const res = await PUT(context);
    expect(res.status).toBe(200);
    expect((await res.json()).mealType).toBe(meal);
  });
});

describe('DELETE /api/plan/:week/:day/:meal', () => {
  it('vacía el turno → 204 y no queda fila', async () => {
    const ana = createUser(db);
    const tarta = insertRecipe(db);
    const put = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'PUT',
      body: { recipeId: tarta },
      params,
      user: ana,
    });
    await PUT(put.context);

    const { context } = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'DELETE',
      params,
      user: ana,
    });
    const res = await DELETE(context);
    expect(res.status).toBe(204);
    expect(countEntries(ana.id, '2026-10-12', 1, 'almuerzo')).toBe(0);
  });

  it('borrar un turno vacío → 204', async () => {
    const ana = createUser(db);
    const { context } = apiContext({
      path: '/api/plan/2026-10-12/1/almuerzo',
      method: 'DELETE',
      params,
      user: ana,
    });
    expect((await DELETE(context)).status).toBe(204);
  });

  it('day fuera de rango → 400', async () => {
    const ana = createUser(db);
    const { context } = apiContext({
      path: '/api/plan/2026-10-12/9/almuerzo',
      method: 'DELETE',
      params: { ...params, day: '9' },
      user: ana,
    });

    const res = await DELETE(context);
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('Semana, día o comida inválidos');
  });
});
