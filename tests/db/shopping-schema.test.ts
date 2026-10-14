import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, schemaVersion, type Db } from '@/lib/db';
import { createUser } from '../helpers/fixtures';

let db: Db;
let user: { id: number };

beforeEach(() => {
  db = createTestDb();
  user = createUser(db);
});

const add = (name: string, qty: number | null, unit: string | null, aisle?: string) =>
  aisle === undefined
    ? db
        .prepare(
          "INSERT INTO shopping_list_manual_items (user_id, week_start, name, qty, unit) VALUES (?, '2026-10-12', ?, ?, ?)",
        )
        .run(user.id, name, qty, unit)
    : db
        .prepare(
          "INSERT INTO shopping_list_manual_items (user_id, week_start, name, qty, unit, aisle) VALUES (?, '2026-10-12', ?, ?, ?, ?)",
        )
        .run(user.id, name, qty, unit, aisle);

describe('esquema de shopping list', () => {
  it('la versión del esquema es >= 4', () => {
    expect(schemaVersion(db)).toBeGreaterThanOrEqual(4);
  });

  it('acepta un ítem con cantidad y unidad, y la góndola por defecto es Otros', () => {
    add('Detergente', 1, 'unidad');
    const row = db
      .prepare('SELECT aisle FROM shopping_list_manual_items WHERE name = ?')
      .get('Detergente') as { aisle: string };
    expect(row.aisle).toBe('Otros');
  });

  it('acepta un ítem sin cantidad ni unidad', () => {
    expect(() => add('Papel', null, null)).not.toThrow();
  });

  it('rechaza cantidad sin unidad y unidad sin cantidad', () => {
    expect(() => add('X', 1, null)).toThrow(/CHECK/);
    expect(() => add('X', null, 'g')).toThrow(/CHECK/);
  });

  it('rechaza una unidad fuera de la lista (incluido "a gusto") o una góndola inexistente', () => {
    expect(() => add('X', 1, 'a gusto')).toThrow(/CHECK/);
    expect(() => add('X', 1, 'g', 'Ferretería')).toThrow(/CHECK/);
  });

  it('rechaza un week_start que no es lunes', () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO shopping_list_manual_items (user_id, week_start, name) VALUES (?, '2026-10-13', 'X')",
        )
        .run(user.id),
    ).toThrow(/CHECK/);
  });
});
