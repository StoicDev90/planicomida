import { describe, expect, it } from 'vitest';
import { normalizeText } from '@/lib/text';

describe('normalizeText', () => {
  it.each([
    ['Tomate', 'tomate'],
    ['  tomate  ', 'tomate'],
    ['Tomaté', 'tomate'],
    ['Limón   Tahití', 'limon tahiti'],
    ['ÑOQUIS', 'noquis'],
    ['Pan\trallado', 'pan rallado'],
    ['', ''],
    ['Tomates', 'tomates'],
  ])('normaliza %j a %j', (input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });
});
