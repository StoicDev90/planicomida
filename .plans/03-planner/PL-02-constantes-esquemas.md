# PL-02 · Constantes, tipos y esquemas del plan

- **Módulo:** planner · **Depende de:** PL-01 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 32–38 (turnos y su orden), 56–77 (API y JSON).
- `src/lib/week.ts` (`WeekStart`).

## Archivos
- Crear: `src/services/plan.ts` (solo esto; PL-03, PL-04 y PL-05 agregan funciones al final)
- Crear: `tests/services/plan-schema.test.ts`

## Contrato — `src/services/plan.ts` (copiar tal cual)
```ts
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
  z.object({ customMealName: z.string().trim().min(1, 'Escribí qué vas a comer').max(80, 'Máximo 80 caracteres') }).strict(),
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
```

## Tests primero — `tests/services/plan-schema.test.ts`
1. `SlotParams.safeParse({ week: '2026-10-12', day: '3', meal: 'cena' })` → `{ week: '2026-10-12', day: 3, meal: 'cena' }`.
2. Fallan: `week: '2026-10-13'`; `day: '7'`; `day: '-1'`; `day: '1.5'`; `day: 'abc'`; `meal: 'merienda'`.
3. Aceptan `meal: 'desayuno'` y `meal: 'snack'`.
4. `SetMealBody`: `{ recipeId: 7 }` ok; `{ customMealName: ' Delivery ' }` ok y queda `'Delivery'`.
5. `SetMealBody` falla con: `{ recipeId: 7, customMealName: 'x' }`, `{}`, `{ recipeId: 0 }`, `{ recipeId: '7' }`, `{ customMealName: '   ' }`.
6. `MEAL_TYPES` es `['desayuno', 'almuerzo', 'snack', 'cena']` y `MEAL_LABELS.snack === 'Snack / Merienda'`.

## Verificación
```bash
npx vitest run tests/services/plan-schema.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 6 casos pasan.

## Commit
`feat(planner): PL-02 constantes, tipos y esquemas del plan`
