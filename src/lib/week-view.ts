import { formatDayLabel, weekStartOf } from '@/lib/week';
import {
  MEAL_LABELS,
  MEAL_TYPES,
  type MealType,
  type PlanEntry,
  type WeekPlan,
} from '@/services/plan';

export interface SlotView {
  mealType: MealType;
  mealLabel: string;
  entry: PlanEntry | null;
  label: string;
}

export interface DayView {
  day: number;
  label: string;
  isToday: boolean;
  slots: SlotView[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Semana actual y día (0 = lunes) de `now` en la zona horaria TZ. */
export function today(
  now = new Date(),
  timeZone = process.env.TZ ?? 'America/Argentina/Buenos_Aires',
): { weekStart: string; day: number } {
  const weekStart = weekStartOf(now, timeZone);
  const local = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
  const day = (Date.parse(local) - Date.parse(weekStart)) / DAY_MS;
  return { weekStart, day };
}

/** "Semana del lun 12 al dom 18 oct" (mismo mes) · "Semana del lun 28 sept al dom 4 oct" (distinto mes). */
export function weekRangeLabel(weekStart: string): string {
  const start = formatDayLabel(weekStart, 0);
  const end = formatDayLabel(weekStart, 6);
  const sameMonth = start.split(' ').at(-1) === end.split(' ').at(-1);
  const startText = sameMonth ? start.split(' ').slice(0, 2).join(' ') : start;
  return `Semana del ${startText} al ${end}`;
}

export function slotLabel(entry: PlanEntry | null): string {
  if (!entry) return 'Agregar';
  if (entry.recipe) return entry.recipe.title + (entry.recipe.deleted ? ' (borrada)' : '');
  return entry.customMealName ?? 'Agregar';
}

/** 7 días × 4 turnos. `now` sirve para marcar el día de hoy si la semana es la actual. */
export function buildWeekView(plan: WeekPlan, now = new Date()): DayView[] {
  const current = today(now);
  const isCurrentWeek = current.weekStart === plan.weekStart;

  return Array.from({ length: 7 }, (_, day) => ({
    day,
    label: formatDayLabel(plan.weekStart, day),
    isToday: isCurrentWeek && current.day === day,
    slots: MEAL_TYPES.map((mealType) => {
      const entry = plan.entries.find((e) => e.day === day && e.mealType === mealType) ?? null;
      return {
        mealType,
        mealLabel: MEAL_LABELS[mealType],
        entry,
        label: slotLabel(entry),
      };
    }),
  }));
}
