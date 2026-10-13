# PL-04 · Escritura: `setMeal` (upsert) y `clearMeal`

- **Módulo:** planner · **Depende de:** PL-03 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-planner.md` líneas 40–47 (Reglas) y 95–98 (Success Criteria de PUT).
- `src/services/recipes.ts` → `canAssignRecipe`.

## Archivos
- Modificar: `src/services/plan.ts` (agregar al final)
- Crear: `tests/services/plan-write.test.ts`

## Contrato — agregar a `src/services/plan.ts`
```ts
import { canAssignRecipe } from '@/services/recipes';

/**
 * Asigna una receta o una comida libre a un turno (reemplaza lo que hubiera).
 * Receta que el usuario no puede asignar (de otro, borrada o inexistente) → { ok: false, error: 'RECIPE_NOT_FOUND' }.
 */
export function setMeal(
  db: Db,
  userId: number,
  slot: Slot,
  input: SetMealInput,
): { ok: true; entry: PlanEntry } | { ok: false; error: 'RECIPE_NOT_FOUND' };

/** Vacía el turno. Si ya estaba vacío, no hace nada. */
export function clearMeal(db: Db, userId: number, slot: Slot): void;
```
SQL:
```sql
INSERT INTO meal_plan_entries (user_id, week_start, day, meal_type, recipe_id, custom_meal_name)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (user_id, week_start, day, meal_type) DO UPDATE SET
  recipe_id = excluded.recipe_id,
  custom_meal_name = excluded.custom_meal_name,
  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now');

DELETE FROM meal_plan_entries WHERE user_id = ? AND week_start = ? AND day = ? AND meal_type = ?;
```
- Si `'recipeId' in input`: chequear `canAssignRecipe(db, userId, input.recipeId)`; si es `false` → `RECIPE_NOT_FOUND`.
  Insertar con `recipe_id = input.recipeId, custom_meal_name = null`.
- Si no: `recipe_id = null, custom_meal_name = input.customMealName`.
- Devolver `{ ok: true, entry: getEntry(db, userId, slot)! }`.

## Tests primero — `tests/services/plan-write.test.ts`
`beforeEach`: `db = createTestDb()`, `ana`, `beto`, `tarta = insertRecipe(db)` (catálogo),
`slot = { week: '2026-10-12', day: 1, meal: 'almuerzo' as const }`.
1. `setMeal(db, ana.id, slot, { recipeId: tarta })` → `ok: true`, `entry.recipe.id === tarta`.
2. Upsert: después `setMeal(..., { customMealName: 'Sobras' })` → `entry.customMealName === 'Sobras'`, `entry.recipe === null`
   y hay **1** fila para ese turno (`SELECT count(*) …`).
3. Idempotente: la misma asignación dos veces → 1 fila.
4. Receta de Beto (`insertRecipe(db, { ownerId: beto.id })`) → `{ ok: false, error: 'RECIPE_NOT_FOUND' }` y no se insertó nada.
5. Receta borrada (`insertRecipe(db, { deleted: true })`) → `RECIPE_NOT_FOUND`. Id 999 → `RECIPE_NOT_FOUND`.
6. Receta propia de Ana → ok.
7. `clearMeal` → el turno queda vacío (`getEntry` → `null`); `clearMeal` sobre un turno vacío no lanza.
8. `clearMeal` de Ana no borra el mismo turno de Beto.

## Verificación
```bash
npx vitest run tests/services/plan-write.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 8 casos pasan.

## Commit
`feat(planner): PL-04 asignar y quitar comidas de un turno`
