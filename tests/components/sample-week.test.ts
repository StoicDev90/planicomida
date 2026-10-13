import { describe, expect, it } from 'vitest';
import { buildList, DEFAULT_SELECTION, DISHES } from '@/components/landing/sample-week';

const ALL = DISHES.map((d) => d.id);
const line = (list: ReturnType<typeof buildList>, name: string) =>
  list.flatMap((g) => g.lines).find((l) => l.name === name);

describe('buildList (ejemplo de la landing)', () => {
  it('suma el mismo ingrediente de varios platos en una sola línea', () => {
    const list = buildList(['fideos', 'guiso', 'ensalada']);
    expect(line(list, 'Tomate')).toEqual({ name: 'Tomate', amount: '4 unidades', sources: 3 });
  });

  it('suma gramos y mililitros', () => {
    expect(line(buildList(['milanesas', 'guiso']), 'Papa')?.amount).toBe('450 g');
    expect(line(buildList(['milanesas', 'tostadas']), 'Leche')?.amount).toBe('250 ml');
  });

  it('usa singular para una unidad', () => {
    expect(line(buildList(['ensalada']), 'Zanahoria')?.amount).toBe('1 unidad');
  });

  it('ninguna combinación llega a 1000 g o ml (no hace falta pasar a kg o l)', () => {
    const amounts = buildList(ALL).flatMap((g) => g.lines.map((l) => l.amount));
    for (const amount of amounts) expect(Number.parseFloat(amount)).toBeLessThan(1000);
  });

  it('agrupa en el orden del súper y ordena alfabéticamente dentro de cada góndola', () => {
    const list = buildList(ALL);
    expect(list.map((g) => g.aisle)).toEqual([
      'Verdulería',
      'Carnicería',
      'Lácteos',
      'Panadería',
      'Almacén',
    ]);
    for (const { lines } of list) {
      const names = lines.map((l) => l.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    }
  });

  it('omite góndolas vacías y devuelve [] sin platos', () => {
    expect(buildList(DEFAULT_SELECTION).map((g) => g.aisle)).not.toContain('Panadería');
    expect(buildList([])).toEqual([]);
  });
});
