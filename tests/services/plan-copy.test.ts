import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { copyWeek, getWeekPlan } from '@/services/plan';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';

let db: Db;
let ana: { id: number };
let beto: { id: number };
let tarta: number;
const SRC = '2026-10-05';
const DST = '2026-10-12';

const countRows = (userId: number, week: string) =>
  db
    .prepare<[number, string], number>(
      'SELECT count(*) FROM meal_plan_entries WHERE user_id = ? AND week_start = ?',
    )
    .pluck()
    .get(userId, week)!;

beforeEach(() => {
  db = createTestDb();
  ana = createUser(db);
  beto = createUser(db, 'beto@mail.com', 'Beto');
  tarta = insertRecipe(db, { title: 'Tarta de verdura' });
});

describe('copyWeek', () => {
  it('con destino vacío copia las mismas entradas en los mismos turnos', () => {
    insertEntry(db, ana.id, SRC, 0, 'almuerzo', tarta);
    insertEntry(db, ana.id, SRC, 2, 'cena', 'Delivery');
    insertEntry(db, ana.id, SRC, 6, 'desayuno', tarta);

    expect(copyWeek(db, ana.id, DST, SRC)).toEqual({ copied: 3, skipped: 0 });

    const copied = getWeekPlan(db, ana.id, DST).entries.map((e) => ({
      day: e.day,
      mealType: e.mealType,
      recipeId: e.recipe?.id ?? null,
      customMealName: e.customMealName,
    }));
    expect(copied).toEqual([
      { day: 0, mealType: 'almuerzo', recipeId: tarta, customMealName: null },
      { day: 2, mealType: 'cena', recipeId: null, customMealName: 'Delivery' },
      { day: 6, mealType: 'desayuno', recipeId: tarta, customMealName: null },
    ]);
  });

  it('con destino parcialmente cargado no pisa los turnos ocupados', () => {
    insertEntry(db, ana.id, SRC, 0, 'almuerzo', tarta);
    insertEntry(db, ana.id, SRC, 1, 'cena', 'Delivery');
    insertEntry(db, ana.id, SRC, 3, 'snack', 'Fruta');
    insertEntry(db, ana.id, DST, 0, 'almuerzo', 'Sobras');

    expect(copyWeek(db, ana.id, DST, SRC)).toEqual({ copied: 2, skipped: 0 });

    const almuerzo = getWeekPlan(db, ana.id, DST).entries.find(
      (e) => e.day === 0 && e.mealType === 'almuerzo',
    );
    expect(almuerzo?.customMealName).toBe('Sobras');
    expect(almuerzo?.recipe).toBeNull();
  });

  it('una receta borrada en el origen no se copia y suma a skipped', () => {
    const borrada = insertRecipe(db, { title: 'Receta vieja', deleted: true });
    insertEntry(db, ana.id, SRC, 1, 'cena', borrada);

    expect(copyWeek(db, ana.id, DST, SRC)).toEqual({ copied: 0, skipped: 1 });

    const cena = getWeekPlan(db, ana.id, DST).entries.find(
      (e) => e.day === 1 && e.mealType === 'cena',
    );
    expect(cena).toBeUndefined();
  });

  it('origen vacío → { copied: 0, skipped: 0 }', () => {
    expect(copyWeek(db, ana.id, DST, SRC)).toEqual({ copied: 0, skipped: 0 });
    expect(countRows(ana.id, DST)).toBe(0);
  });

  it('misma semana → { copied: 0, skipped: 0 } y nada cambia', () => {
    insertEntry(db, ana.id, DST, 0, 'almuerzo', tarta);
    const before = countRows(ana.id, DST);

    expect(copyWeek(db, ana.id, DST, DST)).toEqual({ copied: 0, skipped: 0 });
    expect(countRows(ana.id, DST)).toBe(before);
  });

  it('solo copia las entradas del usuario indicado', () => {
    insertEntry(db, ana.id, SRC, 0, 'almuerzo', tarta);
    insertEntry(db, beto.id, SRC, 4, 'cena', 'Pizza de Beto');

    expect(copyWeek(db, ana.id, DST, SRC)).toEqual({ copied: 1, skipped: 0 });
    expect(countRows(ana.id, DST)).toBe(1);
    expect(getWeekPlan(db, ana.id, DST).entries.map((e) => e.customMealName)).not.toContain(
      'Pizza de Beto',
    );
  });

  it('el origen no se modifica', () => {
    insertEntry(db, ana.id, SRC, 0, 'almuerzo', tarta);
    insertEntry(db, ana.id, SRC, 2, 'cena', 'Delivery');
    const before = countRows(ana.id, SRC);

    copyWeek(db, ana.id, DST, SRC);

    expect(countRows(ana.id, SRC)).toBe(before);
  });
});
