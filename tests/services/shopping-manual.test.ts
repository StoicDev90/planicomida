import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import {
  ManualItemInput,
  addManualItem,
  deleteManualItem,
  listManualItems,
} from '@/services/shopping-list';
import { createUser } from '../helpers/fixtures';

let db: Db;
let ana: { id: number };
let beto: { id: number };
const W = '2026-10-12';

beforeEach(() => {
  db = createTestDb();
  ana = createUser(db, 'ana@mail.com', 'Ana');
  beto = createUser(db, 'beto@mail.com', 'Beto');
});

describe('ManualItemInput', () => {
  it('recorta el nombre y pone la góndola "Otros" por defecto', () => {
    expect(ManualItemInput.safeParse({ name: ' Detergente ' })).toEqual({
      success: true,
      data: { name: 'Detergente', aisle: 'Otros' },
    });
  });

  it('acepta cantidad, unidad y góndola juntas', () => {
    const res = ManualItemInput.safeParse({ name: 'Yerba', qty: 1, unit: 'kg', aisle: 'Almacén' });
    expect(res.success).toBe(true);
  });

  it.each([
    [{ name: 'X', qty: 1 }, 'qty', 'La cantidad y la unidad van juntas'],
    [{ name: 'X', unit: 'g' }, 'qty', 'La cantidad y la unidad van juntas'],
    [{ name: 'X', qty: 1, unit: 'a gusto' }, 'unit', null],
    [{ name: '' }, 'name', 'Escribí qué querés comprar'],
    [{ name: 'X', aisle: 'Ferretería' }, 'aisle', null],
  ])('rechaza %j', (input, path, message) => {
    const res = ManualItemInput.safeParse(input);
    expect(res.success).toBe(false);
    if (res.success) return;
    const issue = res.error.issues.find((i) => i.path[0] === path);
    expect(issue).toBeDefined();
    if (message) expect(issue?.message).toBe(message);
  });
});

describe('addManualItem / listManualItems / deleteManualItem', () => {
  it('agrega un ítem sin cantidad y devuelve sus datos', () => {
    const item = addManualItem(db, ana.id, W, { name: 'Detergente', aisle: 'Otros' });
    expect(item).toEqual({ id: 1, name: 'Detergente', qty: null, unit: null, aisle: 'Otros' });
  });

  it('lista solo los de esa semana y ese usuario, en orden de creación', () => {
    const a1 = addManualItem(db, ana.id, W, { name: 'Pan', aisle: 'Panadería' });
    addManualItem(db, ana.id, '2026-10-19', { name: 'Otra semana', aisle: 'Otros' });
    addManualItem(db, beto.id, W, { name: 'De Beto', aisle: 'Otros' });
    const a2 = addManualItem(db, ana.id, W, { name: 'Leche', qty: 1, unit: 'l', aisle: 'Lácteos' });

    expect(listManualItems(db, ana.id, W)).toEqual([a1, a2]);
  });

  it('deleteManualItem borra una vez y después devuelve false', () => {
    const item = addManualItem(db, ana.id, W, { name: 'Detergente', aisle: 'Otros' });

    expect(deleteManualItem(db, ana.id, item.id)).toBe(true);
    expect(listManualItems(db, ana.id, W)).toEqual([]);
    expect(deleteManualItem(db, ana.id, item.id)).toBe(false);
  });

  it('no deja borrar un ítem de otro usuario', () => {
    const item = addManualItem(db, ana.id, W, { name: 'Detergente', aisle: 'Otros' });

    expect(deleteManualItem(db, beto.id, item.id)).toBe(false);
    expect(listManualItems(db, ana.id, W)).toHaveLength(1);
  });
});
