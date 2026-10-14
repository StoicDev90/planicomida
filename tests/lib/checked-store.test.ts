import { describe, expect, it } from 'vitest';
import {
  checkedStorageKey,
  loadChecked,
  saveChecked,
  type KeyValueStorage,
} from '@/lib/checked-store';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const broken: KeyValueStorage = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('lleno');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  },
};

describe('checked-store', () => {
  it('checkedStorageKey arma la clave pc:checked:<userId>:<weekStart>', () => {
    expect(checkedStorageKey(7, '2026-10-12')).toBe('pc:checked:7:2026-10-12');
  });

  it('guarda y vuelve a cargar las keys tachadas', () => {
    const storage = memoryStorage();
    saveChecked(storage, 7, '2026-10-12', ['tomate|unidad', 'manual|3']);
    expect(loadChecked(storage, 7, '2026-10-12')).toEqual(new Set(['tomate|unidad', 'manual|3']));
  });

  it('las semanas son independientes', () => {
    const storage = memoryStorage();
    saveChecked(storage, 7, '2026-10-12', ['tomate|unidad']);
    expect(loadChecked(storage, 7, '2026-10-19')).toEqual(new Set());
  });

  it('guardar un arreglo vacío borra la entrada', () => {
    const storage = memoryStorage();
    const key = checkedStorageKey(7, '2026-10-12');
    saveChecked(storage, 7, '2026-10-12', ['tomate|unidad']);
    expect(storage.data.has(key)).toBe(true);
    saveChecked(storage, 7, '2026-10-12', []);
    expect(storage.data.has(key)).toBe(false);
  });

  it('valores inválidos se leen como Set vacío o ignoran los no-string', () => {
    const storage = memoryStorage();
    const key = checkedStorageKey(7, '2026-10-12');

    storage.setItem(key, '{roto');
    expect(loadChecked(storage, 7, '2026-10-12')).toEqual(new Set());

    storage.setItem(key, '{"a":1}');
    expect(loadChecked(storage, 7, '2026-10-12')).toEqual(new Set());

    storage.setItem(key, '["a", 2, null]');
    expect(loadChecked(storage, 7, '2026-10-12')).toEqual(new Set(['a']));
  });

  it('con un storage que lanza, loadChecked devuelve vacío y saveChecked no lanza', () => {
    expect(loadChecked(broken, 7, '2026-10-12')).toEqual(new Set());
    expect(() => saveChecked(broken, 7, '2026-10-12', ['a'])).not.toThrow();
  });
});
