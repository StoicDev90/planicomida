import { describe, expect, it } from 'vitest';
import {
  consolidate,
  consolidationKey,
  toBaseUnit,
  type IngredientRow,
} from '@/services/shopping-list';
import type { Aisle, Unit } from '@/services/recipes';

const row = (
  name: string,
  qty: number | null,
  unit: Unit,
  aisle: Aisle = 'Verdulería',
): IngredientRow => ({
  name,
  qty,
  unit,
  aisle,
});

describe('toBaseUnit', () => {
  it('convierte kg a g y l a ml; el resto queda igual', () => {
    expect(toBaseUnit(1, 'kg')).toEqual({ qty: 1000, unit: 'g' });
    expect(toBaseUnit(1.5, 'l')).toEqual({ qty: 1500, unit: 'ml' });
    expect(toBaseUnit(2, 'cda')).toEqual({ qty: 2, unit: 'cda' });
    expect(toBaseUnit(null, 'a gusto')).toEqual({ qty: null, unit: 'a gusto' });
  });
});

describe('consolidationKey', () => {
  it('normaliza el nombre y agrega la unidad base', () => {
    expect(consolidationKey(' Tomaté ', 'unidad')).toBe('tomate|unidad');
  });
});

describe('consolidate', () => {
  it('ejemplo de la spec: suma por clave y convierte unidades', () => {
    expect(
      consolidate([
        row('Tomate', 2, 'unidad'),
        row('tomate', 3, 'unidad'),
        row('Papa', 500, 'g'),
        row('Papa', 1, 'kg'),
      ]),
    ).toEqual([
      { key: 'tomate|unidad', name: 'Tomate', aisle: 'Verdulería', qty: 5, unit: 'unidad' },
      { key: 'papa|g', name: 'Papa', aisle: 'Verdulería', qty: 1500, unit: 'g' },
    ]);
  });

  it('l y ml se suman en ml', () => {
    expect(
      consolidate([row('Leche', 1, 'l', 'Lácteos'), row('Leche', 500, 'ml', 'Lácteos')]),
    ).toEqual([{ key: 'leche|ml', name: 'Leche', aisle: 'Lácteos', qty: 1500, unit: 'ml' }]);
  });

  it('unidades incompatibles quedan en dos líneas', () => {
    const lines = consolidate([row('Leche', 1, 'l'), row('Leche', 2, 'taza')]);
    expect(lines.map((l) => l.key)).toEqual(['leche|ml', 'leche|taza']);
    expect(lines.map((l) => l.qty)).toEqual([1000, 2]);
  });

  it('"a gusto" repetido queda en una línea sin cantidad', () => {
    expect(
      consolidate([
        row('Sal', null, 'a gusto', 'Almacén'),
        row('Sal', null, 'a gusto', 'Almacén'),
        row('Sal', null, 'a gusto', 'Almacén'),
      ]),
    ).toEqual([{ key: 'sal|a gusto', name: 'Sal', aisle: 'Almacén', qty: null, unit: 'a gusto' }]);
  });

  it('ignora mayúsculas, tildes y espacios', () => {
    expect(
      consolidate([
        row('Cebolla', 1, 'unidad'),
        row(' cebolla ', 2, 'unidad'),
        row('CEBOLLÁ', 3, 'unidad'),
      ]),
    ).toEqual([
      { key: 'cebolla|unidad', name: 'Cebolla', aisle: 'Verdulería', qty: 6, unit: 'unidad' },
    ]);
  });

  it('singular y plural no se unifican', () => {
    expect(consolidate([row('Tomate', 1, 'unidad'), row('Tomates', 1, 'unidad')])).toHaveLength(2);
  });

  it('gana la góndola de la primera aparición', () => {
    expect(
      consolidate([row('Huevo', 1, 'unidad', 'Almacén'), row('Huevo', 2, 'unidad', 'Lácteos')]),
    ).toEqual([{ key: 'huevo|unidad', name: 'Huevo', aisle: 'Almacén', qty: 3, unit: 'unidad' }]);
  });

  it('lista vacía devuelve []', () => {
    expect(consolidate([])).toEqual([]);
  });
});
