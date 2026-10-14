import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { addManualItem, getShoppingList } from '@/services/shopping-list';
import { createUser, insertEntry, insertRecipe } from '../helpers/fixtures';

let db: Db;
let ana: { id: number };
let beto: { id: number };
let tarta: number;
let guiso: number;
const W = '2026-10-12';

beforeEach(() => {
  db = createTestDb();
  ana = createUser(db, 'ana@mail.com', 'Ana');
  beto = createUser(db, 'beto@mail.com', 'Beto');
  tarta = insertRecipe(db, {
    title: 'Tarta de verdura',
    ingredients: [
      { name: 'Acelga', qty: 250, unit: 'g', aisle: 'Verdulería' },
      { name: 'Cebolla', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' },
    ],
  });
  guiso = insertRecipe(db, {
    title: 'Guiso de lentejas',
    ingredients: [
      { name: 'Lentejas', qty: 90, unit: 'g', aisle: 'Almacén' },
      { name: 'Cebolla', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Papa', qty: 1, unit: 'kg', aisle: 'Verdulería' },
    ],
  });
});

describe('getShoppingList', () => {
  it('semana vacía → sin góndolas ni comidas libres', () => {
    expect(getShoppingList(db, ana.id, W)).toEqual({ weekStart: W, aisles: [], customMeals: [] });
  });

  it('consolida las recetas del plan por góndola, en orden de AISLES y alfabético', () => {
    insertEntry(db, ana.id, W, 0, 'cena', tarta);
    insertEntry(db, ana.id, W, 1, 'cena', guiso);

    expect(getShoppingList(db, ana.id, W)).toEqual({
      weekStart: W,
      aisles: [
        {
          aisle: 'Verdulería',
          items: [
            { key: 'acelga|g', name: 'Acelga', qty: 250, unit: 'g', manual: false },
            { key: 'cebolla|unidad', name: 'Cebolla', qty: 2, unit: 'unidad', manual: false },
            { key: 'papa|g', name: 'Papa', qty: 1, unit: 'kg', manual: false },
          ],
        },
        {
          aisle: 'Almacén',
          items: [
            { key: 'lentejas|g', name: 'Lentejas', qty: 90, unit: 'g', manual: false },
            { key: 'sal|a gusto', name: 'Sal', qty: null, unit: 'a gusto', manual: false },
          ],
        },
      ],
      customMeals: [],
    });
  });

  it('una receta en dos turnos aporta sus cantidades dos veces', () => {
    insertEntry(db, ana.id, W, 0, 'cena', tarta);
    insertEntry(db, ana.id, W, 3, 'almuerzo', tarta);

    const list = getShoppingList(db, ana.id, W);
    const acelga = list.aisles[0].items.find((i) => i.name === 'Acelga');
    expect(acelga).toEqual({ key: 'acelga|g', name: 'Acelga', qty: 500, unit: 'g', manual: false });
  });

  it('solo comidas libres → sin ingredientes, y las lista sin repetir en orden', () => {
    insertEntry(db, ana.id, W, 0, 'cena', 'Delivery');
    insertEntry(db, ana.id, W, 1, 'almuerzo', 'Delivery');
    insertEntry(db, ana.id, W, 2, 'cena', 'Sobras');

    expect(getShoppingList(db, ana.id, W)).toEqual({
      weekStart: W,
      aisles: [],
      customMeals: ['Delivery', 'Sobras'],
    });
  });

  it('una receta borrada que sigue en el plan aporta sus ingredientes', () => {
    insertEntry(db, ana.id, W, 0, 'cena', tarta);
    db.prepare('UPDATE recipes SET deleted_at = ? WHERE id = ?').run('2026-01-01T00:00:00Z', tarta);

    const list = getShoppingList(db, ana.id, W);
    expect(list.aisles.map((a) => a.aisle)).toEqual(['Verdulería', 'Almacén']);
    expect(list.aisles[0].items.map((i) => i.name)).toEqual(['Acelga', 'Cebolla']);
  });

  it('ítem manual → va a su góndola con manual: true', () => {
    addManualItem(db, ana.id, W, { name: 'Detergente', qty: 1, unit: 'unidad', aisle: 'Otros' });

    expect(getShoppingList(db, ana.id, W).aisles).toEqual([
      {
        aisle: 'Otros',
        items: [
          {
            key: 'manual|1',
            id: 1,
            name: 'Detergente',
            qty: 1,
            unit: 'unidad',
            manual: true,
          },
        ],
      },
    ]);
  });

  it('solo ítems manuales, sin plan → una sola góndola', () => {
    addManualItem(db, ana.id, W, { name: 'Pan', aisle: 'Panadería' });

    const list = getShoppingList(db, ana.id, W);
    expect(list.aisles.map((a) => a.aisle)).toEqual(['Panadería']);
    expect(list.aisles[0].items).toEqual([
      { key: 'manual|1', id: 1, name: 'Pan', qty: null, unit: null, manual: true },
    ]);
  });

  it('aísla por usuario y por semana', () => {
    insertEntry(db, ana.id, W, 0, 'cena', tarta);
    insertEntry(db, beto.id, W, 0, 'cena', guiso);
    addManualItem(db, beto.id, W, { name: 'De Beto', aisle: 'Otros' });
    addManualItem(db, ana.id, '2026-10-19', { name: 'Otra semana', aisle: 'Otros' });

    const list = getShoppingList(db, ana.id, W);
    expect(list.aisles.map((a) => a.aisle)).toEqual(['Verdulería', 'Almacén']);
    expect(list.aisles.flatMap((a) => a.items.map((i) => i.name))).not.toContain('Lentejas');
    expect(list.aisles.flatMap((a) => a.items.map((i) => i.name))).not.toContain('De Beto');
    expect(list.aisles.flatMap((a) => a.items.map((i) => i.name))).not.toContain('Otra semana');
  });

  it('receta sin ingredientes planificada → no aporta nada y no falla', () => {
    const vacia = insertRecipe(db, { title: 'Agua', ingredients: [] });
    insertEntry(db, ana.id, W, 0, 'cena', vacia);

    expect(getShoppingList(db, ana.id, W)).toEqual({ weekStart: W, aisles: [], customMeals: [] });
  });
});
