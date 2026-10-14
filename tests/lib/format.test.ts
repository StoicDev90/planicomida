import { describe, expect, it } from 'vitest';
import { formatAmount, formatNumber } from '@/lib/format';

describe('formatNumber', () => {
  it('usa coma decimal y sin separador de miles', () => {
    expect(formatNumber(2.5)).toBe('2,5');
    expect(formatNumber(1000)).toBe('1000');
  });
});

describe('formatAmount', () => {
  it.each([
    [1, 'unidad', '1 unidad'],
    [2, 'unidad', '2 unidades'],
    [0.5, 'unidad', '0,5 unidades'],
    [1.5, 'kg', '1,5 kg'],
    [750, 'g', '750 g'],
    [1.234, 'l', '1,23 l'],
    [1000, 'g', '1000 g'],
    [null, 'a gusto', 'a gusto'],
    [null, null, ''],
    [3, null, '3'],
  ])('formatAmount(%s, %s) → %j', (qty, unit, expected) => {
    expect(formatAmount(qty, unit)).toBe(expected);
  });
});
