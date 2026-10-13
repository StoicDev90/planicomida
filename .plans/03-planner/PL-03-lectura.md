# PL-03 · Lectura: `getWeekPlan`, `getEntry`, `getRecipeIdsForWeek`

- **Módulo:** planner · **Depende de:** PL-02 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-planner.md` líneas 40–47 (Reglas), 66–81 (JSON y contrato) y 99 (receta borrada → `deleted: true`).
- `src/services/plan.ts` (PL-02).

## Archivos
- Modificar: `src/services/plan.ts` (agregar al final)
- Modificar: `tests/helpers/fixtures.ts` (agregar `insertEntry` al final)
- Crear: `tests/services/plan-read.test.ts`

## Contrato

### Agregar a `src/services/plan.ts`
```ts
import type { Db } from '@/lib/db';
import { addWeeks } from '@/lib/week';

/** Plan de la semana: entradas ordenadas por día y por turno (MEAL_TYPES). */
export function getWeekPlan(db: Db, userId: number, weekStart: string): WeekPlan;

/** La entrada de un turno, o null si está vacío. */
export function getEntry(db: Db, userId: number, slot: Slot): PlanEntry | null;

/**
 * Ids de receta de la semana, uno por turno con receta (con repeticiones),
 * en orden día → turno. Incluye recetas borradas. Lo consume shopping-list.
 */
export function getRecipeIdsForWeek(db: Db, userId: number, weekStart: string): number[];
```
SQL base (las tres funciones usan este orden):
```sql
SELECT e.day, e.meal_type, e.custom_meal_name, r.id AS recipe_id, r.title, r.deleted_at
  FROM meal_plan_entries e
  LEFT JOIN recipes r ON r.id = e.recipe_id
 WHERE e.user_id = ? AND e.week_start = ?
 ORDER BY e.day,
          CASE e.meal_type WHEN 'desayuno' THEN 0 WHEN 'almuerzo' THEN 1 WHEN 'snack' THEN 2 ELSE 3 END
```
- `getEntry`: el mismo SELECT con `AND e.day = ? AND e.meal_type = ?`.
- `getRecipeIdsForWeek`: el mismo orden, `SELECT e.recipe_id … AND e.recipe_id IS NOT NULL`, `.pluck().all()`.
- Mapeo de fila a `PlanEntry`:
  `{ day, mealType: meal_type, recipe: recipe_id === null ? null : { id: recipe_id, title, deleted: deleted_at !== null }, customMealName: custom_meal_name }`.
- `WeekPlan`: `{ weekStart, prevWeek: addWeeks(weekStart, -1), nextWeek: addWeeks(weekStart, 1), entries }`.

### Agregar a `tests/helpers/fixtures.ts`
```ts
/** Inserta una entrada del plan: con receta (número) o comida libre (string). */
export function insertEntry(
  db: Db,
  userId: number,
  week: string,
  day: number,
  meal: string,
  value: number | string,
): void {
  db.prepare(
    'INSERT INTO meal_plan_entries (user_id, week_start, day, meal_type, recipe_id, custom_meal_name) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, week, day, meal, typeof value === 'number' ? value : null, typeof value === 'string' ? value : null);
}
```

## Tests primero — `tests/services/plan-read.test.ts`
`beforeEach`: `db = createTestDb()`, `ana = createUser(db)`, `beto = createUser(db, 'beto@mail.com', 'Beto')`,
`tarta = insertRecipe(db, { title: 'Tarta de verdura' })`, `W = '2026-10-12'`.
1. Semana vacía → `{ weekStart: W, prevWeek: '2026-10-05', nextWeek: '2026-10-19', entries: [] }`.
2. Orden: insertar (en este orden) `(2, 'cena', tarta)`, `(0, 'cena', 'Delivery')`, `(0, 'desayuno', tarta)`, `(0, 'snack', 'Fruta')` →
   `entries.map(e => [e.day, e.mealType])` = `[[0,'desayuno'],[0,'snack'],[0,'cena'],[2,'cena']]`.
3. Entrada con receta → `{ day: 2, mealType: 'cena', recipe: { id: tarta, title: 'Tarta de verdura', deleted: false }, customMealName: null }`;
   comida libre → `recipe: null, customMealName: 'Delivery'`.
4. Receta borrada después de asignarla (`UPDATE recipes SET deleted_at = '2026-10-01' WHERE id = ?`) → `recipe.deleted === true`.
5. Aislamiento: una entrada de Beto en la misma semana no aparece para Ana; una de Ana en otra semana tampoco.
6. `getEntry(db, ana.id, { week: W, day: 0, meal: 'cena' })` → la entrada de Delivery; turno vacío → `null`.
7. `getRecipeIdsForWeek`: con `tarta` en `(0,'almuerzo')` y `(3,'cena')`, `arroz` en `(1,'almuerzo')` y `'Delivery'` en `(0,'cena')` →
   `[tarta, arroz, tarta]` (orden día → turno, con repeticiones, sin comidas libres).
8. `getRecipeIdsForWeek` incluye recetas borradas.

## Verificación
```bash
npx vitest run tests/services/plan-read.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 8 casos pasan.

## Commit
`feat(planner): PL-03 lectura del plan semanal`
