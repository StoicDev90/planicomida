import { describe, expect, it } from 'vitest';
import {
  buildAisles,
  consolidate,
  formatQty,
  manualToItem,
  type IngredientRow,
  type ManualItem,
} from '@/services/shopping-list';
import type { Aisle, Unit } from '@/services/recipes';

const row = (
  name: string,
  qty: number | null,
  unit: Unit,
  aisle: Aisle = 'Verdulería',
): IngredientRow => ({ name, qty, unit, aisle });

const manual = (name: string, aisle: Aisle = 'Otros', id = 1): ManualItem => ({
  id,
  name,
  qty: null,
  unit: null,
  aisle,
});

describe('formatQty', () => {
  it('pasa a kg desde 1000 g y a l desde 1000 ml; redondea a 2 decimales', () => {
    expect(formatQty(1500, 'g')).toEqual({ qty: 1.5, unit: 'kg' });
    expect(formatQty(750, 'g')).toEqual({ qty: 750, unit: 'g' });
    expect(formatQty(1000, 'ml')).toEqual({ qty: 1, unit: 'l' });
    expect(formatQty(999, 'ml')).toEqual({ qty: 999, unit: 'ml' });
    expect(formatQty(0.1 + 0.2, 'cda')).toEqual({ qty: 0.3, unit: 'cda' });
    expect(formatQty(null, 'a gusto')).toEqual({ qty: null, unit: 'a gusto' });
    expect(formatQty(1234.567, 'g')).toEqual({ qty: 1.23, unit: 'kg' });
  });
});

describe('manualToItem', () => {
  it('convierte un manual en ShoppingItem con key manual|id', () => {
    expect(
      manualToItem({ id: 3, name: 'Detergente', qty: 1, unit: 'unidad', aisle: 'Otros' }),
    ).toEqual({
      key: 'manual|3',
      id: 3,
      name: 'Detergente',
      qty: 1,
      unit: 'unidad',
      manual: true,
    });
  });
});

describe('buildAisles', () => {
  it('ejemplo de la spec: Papa 1.5 kg y Tomate 5 unidad en Verdulería', () => {
    const lines = consolidate([
      row('Tomate', 2, 'unidad'),
      row('tomate', 3, 'unidad'),
      row('Papa', 500, 'g'),
      row('Papa', 1, 'kg'),
    ]);
    expect(buildAisles(lines, [])).toEqual([
      {
        aisle: 'Verdulería',
        items: [
          { key: 'papa|g', name: 'Papa', qty: 1.5, unit: 'kg', manual: false },
          { key: 'tomate|unidad', name: 'Tomate', qty: 5, unit: 'unidad', manual: false },
        ],
      },
    ]);
  });

  it('ordena las góndolas según AISLES', () => {
    const lines = consolidate([
      row('Sal', 1, 'cda', 'Otros'),
      row('Queso', 100, 'g', 'Lácteos'),
      row('Papa', 1, 'unidad', 'Verdulería'),
    ]);
    expect(buildAisles(lines, []).map((a) => a.aisle)).toEqual(['Verdulería', 'Lácteos', 'Otros']);
  });

  it('manual y receta con el mismo nombre quedan como dos ítems separados', () => {
    const lines = consolidate([row('Tomate', 2, 'unidad')]);
    const manualItem: ManualItem = {
      id: 7,
      name: 'Tomate',
      qty: 1,
      unit: 'unidad',
      aisle: 'Verdulería',
    };
    const result = buildAisles(lines, [manualItem]);
    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
    const manualFlags = result[0].items.map((i) => i.manual);
    expect(manualFlags.filter(Boolean)).toHaveLength(1);
    expect(result[0].items.find((i) => i.manual)).toEqual({
      key: 'manual|7',
      id: 7,
      name: 'Tomate',
      qty: 1,
      unit: 'unidad',
      manual: true,
    });
  });

  it('dentro de la góndola ordena alfabéticamente mezclando manuales y recetas', () => {
    const lines = consolidate([row('Zanahoria', 1, 'unidad'), row('Ñame', 1, 'unidad')]);
    const result = buildAisles(lines, [manual('Acelga', 'Verdulería')]);
    expect(result).toHaveLength(1);
    expect(result[0].items.map((i) => i.name)).toEqual(['Acelga', 'Ñame', 'Zanahoria']);
  });

  it('solo manuales: devuelve solo sus góndolas', () => {
    const result = buildAisles([], [manual('Detergente', 'Otros'), manual('Leche', 'Lácteos', 2)]);
    expect(result.map((a) => a.aisle)).toEqual(['Lácteos', 'Otros']);
  });

  it('sin líneas ni manuales devuelve []', () => {
    expect(buildAisles([], [])).toEqual([]);
  });
});
