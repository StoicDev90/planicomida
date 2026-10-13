import { z } from 'astro/zod';

// Una semana se identifica por la fecha de su lunes, en formato YYYY-MM-DD.
// Toda la aritmética se hace en UTC sobre fechas "de calendario" para no depender de la TZ del proceso.

const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return toDateString(new Date(parseDate(value).getTime() + days * DAY_MS));
}

/** Lunes (YYYY-MM-DD) de la semana que contiene `date`, según el calendario de `timeZone`. */
export function weekStartOf(
  date: Date,
  timeZone = process.env.TZ ?? DEFAULT_TIME_ZONE,
): string {
  // en-CA formatea como YYYY-MM-DD
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
  const daysSinceMonday = (parseDate(localDay).getUTCDay() + 6) % 7;
  return addDays(localDay, -daysSinceMonday);
}

export function addWeeks(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7);
}

/** `true` si `value` es una fecha real YYYY-MM-DD que cae en lunes. */
export function isWeekStart(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDate(value);
  return toDateString(date) === value && date.getUTCDay() === 1;
}

export const WeekStart = z
  .string()
  .refine(isWeekStart, 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)');

const dayLabelFormat = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Etiqueta corta de un día de la semana: `formatDayLabel('2026-10-12', 0)` → "lun 12 oct". */
export function formatDayLabel(weekStart: string, day: number): string {
  return dayLabelFormat
    .format(parseDate(addDays(weekStart, day)))
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ');
}
