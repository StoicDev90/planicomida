import { z } from 'astro/zod';
import { WeekStart } from '@/lib/week';

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
