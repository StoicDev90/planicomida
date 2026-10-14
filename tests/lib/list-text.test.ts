import { describe, expect, it } from 'vitest';
import { itemLine, listToText } from '@/lib/list-text';
import type { ShoppingItem, ShoppingList } from '@/services/shopping-list';

const list: ShoppingList = {
  weekStart: '2026-10-12',
  customMeals: [],
  aisles: [
    {
      aisle: 'Verdulería',
      items: [
        { key: 'papa|g', name: 'Papa', qty: 1.5, unit: 'kg', manual: false },
        { key: 'tomate|unidad', name: 'Tomate', qty: 5, unit: 'unidad', manual: false },
      ],
    },
    {
      aisle: 'Almacén',
      items: [{ key: 'sal|a gusto', name: 'Sal', qty: null, unit: 'a gusto', manual: false }],
    },
    {
      aisle: 'Otros',
      items: [
        { key: 'manual|1', id: 1, name: 'Detergente', qty: 1, unit: 'unidad', manual: true },
        { key: 'manual|2', id: 2, name: 'Papel higiénico', qty: null, unit: null, manual: true },
      ],
    },
  ],
};

describe('listToText', () => {
  it('genera el texto exacto con góndolas, cantidades y "a gusto"', () => {
    expect(listToText(list, 'Semana del lun 12 al dom 18 oct')).toBe(
      [
        'Lista del súper · Semana del lun 12 al dom 18 oct',
        '',
        'Verdulería',
        '- Papa: 1,5 kg',
        '- Tomate: 5 unidades',
        '',
        'Almacén',
        '- Sal (a gusto)',
        '',
        'Otros',
        '- Detergente: 1 unidad',
        '- Papel higiénico',
      ].join('\n'),
    );
  });

  it('lista sin góndolas dice que está vacía', () => {
    const empty: ShoppingList = { weekStart: '2026-10-12', customMeals: [], aisles: [] };
    expect(listToText(empty, 'X')).toBe('Lista del súper · X\n\nLa lista está vacía.');
  });
});

describe('itemLine', () => {
  it('formatea cantidad y unidad', () => {
    const item = { name: 'Leche', qty: 250, unit: 'ml' } as ShoppingItem;
    expect(itemLine(item)).toBe('- Leche: 250 ml');
  });
});
