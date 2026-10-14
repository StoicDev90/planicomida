import { describe, expect, it } from 'vitest';
import { MEAL_LABELS, MEAL_TYPES, SetMealBody, SlotParams } from '@/services/plan';

describe('SlotParams', () => {
  it('convierte day a número y acepta una semana válida', () => {
    expect(SlotParams.safeParse({ week: '2026-10-12', day: '3', meal: 'cena' })).toEqual({
      success: true,
      data: { week: '2026-10-12', day: 3, meal: 'cena' },
    });
  });

  it('rechaza semanas que no son lunes', () => {
    expect(SlotParams.safeParse({ week: '2026-10-13', day: '3', meal: 'cena' }).success).toBe(
      false,
    );
  });

  it.each(['7', '-1', '1.5', 'abc'])('rechaza day %s', (day) => {
    expect(SlotParams.safeParse({ week: '2026-10-12', day, meal: 'cena' }).success).toBe(false);
  });

  it('rechaza un turno inexistente', () => {
    expect(SlotParams.safeParse({ week: '2026-10-12', day: '0', meal: 'merienda' }).success).toBe(
      false,
    );
  });

  it('acepta desayuno y snack', () => {
    expect(SlotParams.safeParse({ week: '2026-10-12', day: '0', meal: 'desayuno' }).success).toBe(
      true,
    );
    expect(SlotParams.safeParse({ week: '2026-10-12', day: '0', meal: 'snack' }).success).toBe(
      true,
    );
  });
});

describe('SetMealBody', () => {
  it('acepta una receta', () => {
    expect(SetMealBody.safeParse({ recipeId: 7 }).success).toBe(true);
  });

  it('acepta texto libre y lo recorta', () => {
    expect(SetMealBody.safeParse({ customMealName: ' Delivery ' })).toEqual({
      success: true,
      data: { customMealName: 'Delivery' },
    });
  });

  it.each([
    ['ambas claves', { recipeId: 7, customMealName: 'x' }],
    ['body vacío', {}],
    ['recipeId 0', { recipeId: 0 }],
    ['recipeId como string', { recipeId: '7' }],
    ['texto solo con espacios', { customMealName: '   ' }],
  ])('rechaza %s', (_name, body) => {
    expect(SetMealBody.safeParse(body).success).toBe(false);
  });
});

describe('constantes de turnos', () => {
  it('MEAL_TYPES tiene el orden del día', () => {
    expect(MEAL_TYPES).toEqual(['desayuno', 'almuerzo', 'snack', 'cena']);
  });

  it('MEAL_LABELS muestra snack como Snack / Merienda', () => {
    expect(MEAL_LABELS.snack).toBe('Snack / Merienda');
  });
});
