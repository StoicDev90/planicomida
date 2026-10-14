import { describe, expect, it } from 'vitest';
import { RecipeInput } from '@/services/recipes';
import { parseQty, splitFieldErrors, toRecipeInput } from '@/lib/recipe-form';

describe('parseQty', () => {
  it('convierte coma decimal, espacios y ceros', () => {
    expect(parseQty('1,5')).toBe(1.5);
    expect(parseQty(' 2 ')).toBe(2);
    expect(parseQty('0')).toBe(0);
  });

  it('devuelve null para vacío o no numérico', () => {
    expect(parseQty('')).toBeNull();
    expect(parseQty('abc')).toBeNull();
  });
});

const values = {
  title: 'Tarta',
  category: 'cena',
  rows: [
    { name: 'Acelga', qty: '1', unit: 'kg', aisle: 'Verdulería' },
    { name: 'Sal', qty: '3', unit: 'a gusto', aisle: 'Almacén' },
  ],
};

describe('toRecipeInput', () => {
  it('arma el body de la API, con qty null para "a gusto"', () => {
    expect(toRecipeInput(values)).toEqual({
      title: 'Tarta',
      category: 'cena',
      ingredients: [
        { name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' },
        { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' },
      ],
    });
  });

  it('mantiene una fila vacía (la validación la rechaza la API)', () => {
    const result = toRecipeInput({
      title: 'Tarta',
      category: 'cena',
      rows: [{ name: '', qty: '', unit: 'unidad', aisle: 'Otros' }],
    });
    expect(result.ingredients).toEqual([{ name: '', qty: null, unit: 'unidad', aisle: 'Otros' }]);
  });

  it('el resultado pasa RecipeInput.safeParse', () => {
    expect(RecipeInput.safeParse(toRecipeInput(values)).success).toBe(true);
  });
});

describe('splitFieldErrors', () => {
  it('separa errores de formulario y de filas', () => {
    expect(
      splitFieldErrors({
        title: 'Ingresá un título',
        'ingredients.0.qty': 'X',
        'ingredients.2.name': 'Y',
        ingredients: 'Z',
      }),
    ).toEqual({
      form: { title: 'Ingresá un título', ingredients: 'Z' },
      rows: { 0: { qty: 'X' }, 2: { name: 'Y' } },
    });
  });
});
