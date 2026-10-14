import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { getEntry, getRecipeIdsForWeek, getWeekPlan } from '@/services/plan';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';

let db: Db;
let ana: { id: number };
let beto: { id: number };
let tarta: number;
const W = '2026-10-12';

beforeEach(() => {
  db = createTestDb();
  ana = createUser(db);
  beto = createUser(db, 'beto@mail.com', 'Beto');
  tarta = insertRecipe(db, { title: 'Tarta de verdura' });
});

describe('getWeekPlan', () => {
  it('semana vacía', () => {
    expect(getWeekPlan(db, ana.id, W)).toEqual({
      weekStart: W,
      prevWeek: '2026-10-05',
      nextWeek: '2026-10-19',
      entries: [],
    });
  });

  it('ordena por día y por turno', () => {
    insertEntry(db, ana.id, W, 2, 'cena', tarta);
    insertEntry(db, ana.id, W, 0, 'cena', 'Delivery');
    insertEntry(db, ana.id, W, 0, 'desayuno', tarta);
    insertEntry(db, ana.id, W, 0, 'snack', 'Fruta');

    const { entries } = getWeekPlan(db, ana.id, W);
    expect(entries.map((e) => [e.day, e.mealType])).toEqual([
      [0, 'desayuno'],
      [0, 'snack'],
      [0, 'cena'],
      [2, 'cena'],
    ]);
  });

  it('entrada con receta y entrada de comida libre', () => {
    insertEntry(db, ana.id, W, 2, 'cena', tarta);
    insertEntry(db, ana.id, W, 0, 'cena', 'Delivery');

    const { entries } = getWeekPlan(db, ana.id, W);
    expect(entries).toEqual([
      {
        day: 0,
        mealType: 'cena',
        recipe: null,
        customMealName: 'Delivery',
      },
      {
        day: 2,
        mealType: 'cena',
        recipe: { id: tarta, title: 'Tarta de verdura', deleted: false },
        customMealName: null,
      },
    ]);
  });

  it('receta borrada después de asignarla sigue apareciendo con deleted: true', () => {
    insertEntry(db, ana.id, W, 2, 'cena', tarta);
    db.prepare('UPDATE recipes SET deleted_at = ? WHERE id = ?').run('2026-10-01', tarta);

    const { entries } = getWeekPlan(db, ana.id, W);
    expect(entries[0].recipe).toEqual({ id: tarta, title: 'Tarta de verdura', deleted: true });
  });

  it('aísla por usuario y por semana', () => {
    insertEntry(db, beto.id, W, 0, 'cena', 'Pizza de Beto');
    insertEntry(db, ana.id, '2026-10-19', 0, 'cena', 'Otra semana');

    expect(getWeekPlan(db, ana.id, W).entries).toEqual([]);
    expect(getWeekPlan(db, beto.id, W).entries.map((e) => e.customMealName)).toEqual([
      'Pizza de Beto',
    ]);
  });
});

describe('getEntry', () => {
  it('devuelve la entrada del turno, o null si está vacío', () => {
    insertEntry(db, ana.id, W, 0, 'cena', 'Delivery');

    expect(getEntry(db, ana.id, { week: W, day: 0, meal: 'cena' })).toEqual({
      day: 0,
      mealType: 'cena',
      recipe: null,
      customMealName: 'Delivery',
    });
    expect(getEntry(db, ana.id, { week: W, day: 0, meal: 'almuerzo' })).toBeNull();
  });
});

describe('getRecipeIdsForWeek', () => {
  it('ids de receta con repeticiones, en orden día → turno, sin comidas libres', () => {
    const arroz = insertRecipe(db, { title: 'Arroz' });
    insertEntry(db, ana.id, W, 0, 'almuerzo', tarta);
    insertEntry(db, ana.id, W, 3, 'cena', tarta);
    insertEntry(db, ana.id, W, 1, 'almuerzo', arroz);
    insertEntry(db, ana.id, W, 0, 'cena', 'Delivery');

    expect(getRecipeIdsForWeek(db, ana.id, W)).toEqual([tarta, arroz, tarta]);
  });

  it('incluye recetas borradas', () => {
    insertEntry(db, ana.id, W, 0, 'almuerzo', tarta);
    db.prepare('UPDATE recipes SET deleted_at = ? WHERE id = ?').run('2026-10-01', tarta);

    expect(getRecipeIdsForWeek(db, ana.id, W)).toEqual([tarta]);
  });
});
