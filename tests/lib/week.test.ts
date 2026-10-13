import { describe, expect, it } from 'vitest';
import { addWeeks, formatDayLabel, isWeekStart, WeekStart, weekStartOf } from '@/lib/week';

const BA = 'America/Argentina/Buenos_Aires';

describe('weekStartOf', () => {
  it('devuelve el mismo día si es lunes', () => {
    expect(weekStartOf(new Date('2026-10-12T15:00:00-03:00'), BA)).toBe('2026-10-12');
  });

  it('devuelve el lunes anterior para un domingo', () => {
    expect(weekStartOf(new Date('2026-10-18T12:00:00-03:00'), BA)).toBe('2026-10-12');
  });

  it('respeta la zona horaria: domingo 23:30 en Buenos Aires ya es lunes en UTC', () => {
    const date = new Date('2026-10-19T02:30:00Z');
    expect(weekStartOf(date, BA)).toBe('2026-10-12');
    expect(weekStartOf(date, 'UTC')).toBe('2026-10-19');
  });

  it('cruza fin de año', () => {
    expect(weekStartOf(new Date('2027-01-01T12:00:00-03:00'), BA)).toBe('2026-12-28');
  });

  it('usa process.env.TZ si no se pasa zona', () => {
    expect(weekStartOf(new Date('2026-10-19T02:30:00Z'))).toBe('2026-10-12');
  });

  it('usa Buenos Aires si TZ no está definida', () => {
    const original = process.env.TZ;
    delete process.env.TZ;
    try {
      expect(weekStartOf(new Date('2026-10-19T02:30:00Z'))).toBe('2026-10-12');
    } finally {
      process.env.TZ = original;
    }
  });
});

describe('addWeeks', () => {
  it('suma y resta semanas cruzando mes y año', () => {
    expect(addWeeks('2026-12-28', 1)).toBe('2027-01-04');
    expect(addWeeks('2026-10-05', 1)).toBe('2026-10-12');
    expect(addWeeks('2026-10-12', -1)).toBe('2026-10-05');
    expect(addWeeks('2026-10-12', 0)).toBe('2026-10-12');
  });
});

describe('isWeekStart', () => {
  it.each([
    ['2026-10-12', true],
    ['2027-01-04', true],
    ['2026-10-13', false], // martes
    ['2026-02-30', false], // no existe
    ['2026-1-5', false], // formato
    ['2026-10-12T00:00:00Z', false],
    ['', false],
  ])('%j → %s', (value, expected) => {
    expect(isWeekStart(value)).toBe(expected);
  });

  it('rechaza valores que no son string', () => {
    expect(isWeekStart(20261012)).toBe(false);
    expect(isWeekStart(undefined)).toBe(false);
  });
});

describe('WeekStart (zod)', () => {
  it('acepta un lunes y rechaza otro día con mensaje en español', () => {
    expect(WeekStart.safeParse('2026-10-12').success).toBe(true);
    const result = WeekStart.safeParse('2026-10-13');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/lunes/);
  });
});

describe('formatDayLabel', () => {
  it('formatea el día de la semana en es-AR sin puntuación', () => {
    expect(formatDayLabel('2026-10-12', 0)).toBe('lun 12 oct');
    expect(formatDayLabel('2026-10-12', 6)).toBe('dom 18 oct');
    expect(formatDayLabel('2026-12-28', 4)).toBe('vie 1 ene');
  });
});
