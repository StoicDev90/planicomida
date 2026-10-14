import { z } from 'astro/zod';
import type { Db } from '@/lib/db';
import { addWeeks, WeekStart } from '@/lib/week';

/** Orden de los turnos dentro del día. Mismos valores que recipes.category. */
export const MEAL_TYPES = ['desayuno', 'almuerzo', 'snack', 'cena'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  snack: 'Snack / Merienda',
  cena: 'Cena',
};

/** Parámetros de ruta /api/plan/:week/:day/:meal (llegan como strings). */
export const SlotParams = z.object({
  week: WeekStart,
  day: z.coerce.number().int().min(0).max(6),
  meal: z.enum(MEAL_TYPES),
});
export type Slot = z.infer<typeof SlotParams>;

/** Exactamente una de las dos claves. */
export const SetMealBody = z.union([
  z.object({ recipeId: z.number().int().positive() }).strict(),
  z
    .object({
      customMealName: z
        .string()
        .trim()
        .min(1, 'Escribí qué vas a comer')
        .max(80, 'Máximo 80 caracteres'),
    })
    .strict(),
]);
export type SetMealInput = z.infer<typeof SetMealBody>;

export interface PlanEntry {
  day: number;
  mealType: MealType;
  recipe: { id: number; title: string; deleted: boolean } | null;
  customMealName: string | null;
}

export interface WeekPlan {
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  entries: PlanEntry[];
}

const ENTRY_SELECT = `SELECT e.day, e.meal_type, e.custom_meal_name, r.id AS recipe_id, r.title, r.deleted_at
  FROM meal_plan_entries e
  LEFT JOIN recipes r ON r.id = e.recipe_id`;
const ENTRY_ORDER = `ORDER BY e.day,
          CASE e.meal_type WHEN 'desayuno' THEN 0 WHEN 'almuerzo' THEN 1 WHEN 'snack' THEN 2 ELSE 3 END`;

interface EntryRow {
  day: number;
  meal_type: MealType;
  custom_meal_name: string | null;
  recipe_id: number | null;
  title: string | null;
  deleted_at: string | null;
}

function toPlanEntry(row: EntryRow): PlanEntry {
  return {
    day: row.day,
    mealType: row.meal_type,
    recipe:
      row.recipe_id === null
        ? null
        : { id: row.recipe_id, title: row.title ?? '', deleted: row.deleted_at !== null },
    customMealName: row.custom_meal_name,
  };
}

/** Plan de la semana: entradas ordenadas por día y por turno (MEAL_TYPES). */
export function getWeekPlan(db: Db, userId: number, weekStart: string): WeekPlan {
  const rows = db
    .prepare<[number, string], EntryRow>(
      `${ENTRY_SELECT}
 WHERE e.user_id = ? AND e.week_start = ?
 ${ENTRY_ORDER}`,
    )
    .all(userId, weekStart);
  return {
    weekStart,
    prevWeek: addWeeks(weekStart, -1),
    nextWeek: addWeeks(weekStart, 1),
    entries: rows.map(toPlanEntry),
  };
}

/** La entrada de un turno, o null si está vacío. */
export function getEntry(db: Db, userId: number, slot: Slot): PlanEntry | null {
  const row = db
    .prepare<[number, string, number, MealType], EntryRow>(
      `${ENTRY_SELECT}
 WHERE e.user_id = ? AND e.week_start = ? AND e.day = ? AND e.meal_type = ?`,
    )
    .get(userId, slot.week, slot.day, slot.meal);
  return row ? toPlanEntry(row) : null;
}

/**
 * Ids de receta de la semana, uno por turno con receta (con repeticiones),
 * en orden día → turno. Incluye recetas borradas. Lo consume shopping-list.
 */
export function getRecipeIdsForWeek(db: Db, userId: number, weekStart: string): number[] {
  return db
    .prepare<[number, string], number>(
      `SELECT e.recipe_id FROM meal_plan_entries e
 WHERE e.user_id = ? AND e.week_start = ? AND e.recipe_id IS NOT NULL
 ${ENTRY_ORDER}`,
    )
    .pluck()
    .all(userId, weekStart);
}
