import { afterEach, describe, expect, it } from 'vitest';
import type { WeekPlan } from '@/services/plan';
import { buildWeekView, slotLabel, today, weekRangeLabel } from '@/lib/week-view';

const plan: WeekPlan = {
  weekStart: '2026-10-12',
  prevWeek: '2026-10-05',
  nextWeek: '2026-10-19',
  entries: [
    {
      day: 2,
      mealType: 'cena',
      recipe: { id: 1, title: 'Tarta', deleted: false },
      customMealName: null,
    },
    {
      day: 0,
      mealType: 'desayuno',
      recipe: null,
      customMealName: 'Café',
    },
  ],
};

describe('today', () => {
  it('devuelve la semana y el día (0 = lunes) en Buenos Aires', () => {
    expect(today(new Date('2026-10-14T15:00:00-03:00'))).toEqual({
      weekStart: '2026-10-12',
      day: 2,
    });
  });

  it('domingo 23:30 en Buenos Aires sigue siendo el domingo de esa semana', () => {
    expect(today(new Date('2026-10-19T02:30:00Z'))).toEqual({
      weekStart: '2026-10-12',
      day: 6,
    });
  });
});

describe('weekRangeLabel', () => {
  it('usa un solo mes cuando la semana cae en el mismo mes', () => {
    expect(weekRangeLabel('2026-10-12')).toBe('Semana del lun 12 al dom 18 oct');
  });

  it('muestra los dos meses cuando la semana cruza de mes', () => {
    expect(weekRangeLabel('2026-09-28')).toBe('Semana del lun 28 sept al dom 4 oct');
  });

  it('muestra los dos meses cuando la semana cruza de año', () => {
    expect(weekRangeLabel('2026-12-28')).toBe('Semana del lun 28 dic al dom 3 ene');
  });
});

describe('buildWeekView', () => {
  const now = new Date('2026-10-14T15:00:00-03:00');
  const days = buildWeekView(plan, now);
  const MEAL_ORDER = ['desayuno', 'almuerzo', 'snack', 'cena'];

  it('devuelve 7 días', () => {
    expect(days).toHaveLength(7);
  });

  it('marca solo el miércoles como hoy', () => {
    expect(days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false]);
  });

  it('cada día tiene 4 turnos en el orden de MEAL_TYPES', () => {
    for (const day of days) {
      expect(day.slots.map((s) => s.mealType)).toEqual(MEAL_ORDER);
    }
  });

  it('muestra la receta, la comida libre o "Agregar" según el turno', () => {
    expect(days[2].slots[3].label).toBe('Tarta');
    expect(days[0].slots[0].label).toBe('Café');
    expect(days[1].slots[1].label).toBe('Agregar');
    expect(days[1].slots[1].entry).toBeNull();
  });

  it('en otra semana ningún día es hoy', () => {
    const other = buildWeekView(plan, new Date('2026-11-03'));
    expect(other.some((d) => d.isToday)).toBe(false);
  });

  it('etiqueta de día y nombre de turno', () => {
    expect(days[0].label).toBe('lun 12 oct');
    expect(days[0].slots[2].mealLabel).toBe('Snack / Merienda');
  });
});

describe('slotLabel', () => {
  it('turno vacío → "Agregar"', () => {
    expect(slotLabel(null)).toBe('Agregar');
  });

  it('receta borrada → título + " (borrada)"', () => {
    expect(
      slotLabel({
        day: 0,
        mealType: 'cena',
        recipe: { id: 1, title: 'Tarta', deleted: true },
        customMealName: null,
      }),
    ).toBe('Tarta (borrada)');
  });
});

describe('ramas defensivas', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('slotLabel: una entrada sin receta ni comida libre muestra "Agregar"', () => {
    expect(slotLabel({ day: 0, mealType: 'cena', recipe: null, customMealName: null })).toBe(
      'Agregar',
    );
  });

  it('today: sin TZ definida usa America/Argentina/Buenos_Aires', () => {
    delete process.env.TZ;
    expect(today(new Date('2026-10-18T02:30:00Z'))).toEqual({ weekStart: '2026-10-12', day: 5 });
  });
});
