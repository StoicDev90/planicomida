# SL-05 · `getShoppingList`: la lista de una semana desde la base

- **Módulo:** shopping-list · **Depende de:** SL-04 (y PL-03 por `getRecipeIdsForWeek`) · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 17–19 (una vez por turno, comidas libres no suman), 70–96 (JSON con `customMeals`)
  y 117, 122–124, 128 (Success Criteria).
- `src/services/plan.ts` → `getRecipeIdsForWeek` (con repeticiones, orden día → turno, incluye borradas).

## Archivos
- Modificar: `src/services/shopping-list.ts` (agregar al final)
- Crear: `tests/services/shopping-list.test.ts`

## Contrato — agregar a `src/services/shopping-list.ts`
```ts
import { getRecipeIdsForWeek } from '@/services/plan';

export function getShoppingList(db: Db, userId: number, weekStart: string): ShoppingList;
```
Pasos:
1. `ids = getRecipeIdsForWeek(db, userId, weekStart)`.
2. Si hay ids, buscar los ingredientes de los ids **distintos**, una sola vez:
   ```sql
   SELECT recipe_id, name, qty, unit, aisle FROM recipe_ingredients
    WHERE recipe_id IN (?, ?, …) ORDER BY recipe_id, position
   ```
   (armar los `?` con `unique.map(() => '?').join(', ')`), y agruparlos en un `Map<number, IngredientRow[]>`.
3. `rows = ids.flatMap((id) => byRecipe.get(id) ?? [])` → así una receta en 2 turnos aporta 2 veces, en orden.
4. Comidas libres (sin repetir, en orden de aparición):
   ```sql
   SELECT custom_meal_name FROM meal_plan_entries
    WHERE user_id = ? AND week_start = ? AND custom_meal_name IS NOT NULL
    ORDER BY day, CASE meal_type WHEN 'desayuno' THEN 0 WHEN 'almuerzo' THEN 1 WHEN 'snack' THEN 2 ELSE 3 END
   ```
   → `[...new Set(nombres)]`.
5. Devolver `{ weekStart, aisles: buildAisles(consolidate(rows), listManualItems(db, userId, weekStart)), customMeals }`.

## Tests primero — `tests/services/shopping-list.test.ts`
`beforeEach`: `db = createTestDb()`, `ana`, `beto`, `W = '2026-10-12'`, y dos recetas de catálogo con `insertRecipe`:
`tarta` = `[Acelga 250 g Verdulería, Cebolla 1 unidad Verdulería, Sal null 'a gusto' Almacén]`,
`guiso` = `[Lentejas 90 g Almacén, Cebolla 1 unidad Verdulería, Papa 1 kg Verdulería]`.
1. Semana vacía → `{ weekStart: W, aisles: [], customMeals: [] }`.
2. `tarta` en `(0,'cena')` y `guiso` en `(1,'cena')` → Verdulería: `Acelga 250 g`, `Cebolla 2 unidad`, `Papa 1 kg`; Almacén: `Lentejas 90 g`, `Sal null 'a gusto'` (verificar `name`, `qty`, `unit` de cada ítem y el orden).
3. Misma receta en 2 turnos (`tarta` en `(0,'cena')` y `(3,'almuerzo')`) → `Acelga` con `qty: 500`.
4. Solo comidas libres (`'Delivery'` en dos turnos y `'Sobras'`) → `aisles: []` y `customMeals: ['Delivery', 'Sobras']`.
5. Receta borrada después de planificarla (`UPDATE recipes SET deleted_at = …`) → sus ingredientes siguen en la lista.
6. Manuales: `addManualItem(db, ana.id, W, { name: 'Detergente', qty: 1, unit: 'unidad', aisle: 'Otros' })` → última góndola `'Otros'` con
   `{ key: 'manual|1', id: 1, name: 'Detergente', qty: 1, unit: 'unidad', manual: true }`.
7. Solo manuales, sin plan → la lista tiene solo esa góndola.
8. Aislamiento: el plan y los manuales de Beto en la misma semana no aparecen en la lista de Ana; los manuales de Ana de otra semana tampoco.
9. Receta sin ingredientes (`insertRecipe(db, { ingredients: [] })`) planificada → no aporta nada ni falla (cubre la rama `?? []`).

## Verificación
```bash
npx vitest run tests/services/shopping-list.test.ts
npx vitest run --coverage --coverage.include=src/services/shopping-list.ts
npm run check
```

## Hecho cuando
- [ ] Los 9 casos pasan y `shopping-list.ts` tiene 100 % de ramas.

## Commit
`feat(shopping-list): SL-05 lista de compras de una semana`
