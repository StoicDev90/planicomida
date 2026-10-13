# PL-05 · `copyWeek`: copiar una semana sobre otra

- **Módulo:** planner · **Depende de:** PL-04 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-planner.md` líneas 49–54 (Copiar semana) y 100–103 (Success Criteria).

## Archivos
- Modificar: `src/services/plan.ts` (agregar al final)
- Crear: `tests/services/plan-copy.test.ts`

## Contrato — agregar a `src/services/plan.ts`
```ts
/**
 * Copia las entradas de `sourceWeek` a `targetWeek` (mismo día y turno), en una transacción.
 * Solo llena turnos vacíos. Entradas con receta borrada → no se copian y suman a `skipped`.
 * Si las semanas son iguales devuelve { copied: 0, skipped: 0 } sin tocar nada.
 */
export function copyWeek(
  db: Db,
  userId: number,
  targetWeek: string,
  sourceWeek: string,
): { copied: number; skipped: number };
```
SQL:
```sql
SELECT e.day, e.meal_type, e.recipe_id, e.custom_meal_name, r.deleted_at
  FROM meal_plan_entries e
  LEFT JOIN recipes r ON r.id = e.recipe_id
 WHERE e.user_id = ? AND e.week_start = ?;

INSERT INTO meal_plan_entries (user_id, week_start, day, meal_type, recipe_id, custom_meal_name)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (user_id, week_start, day, meal_type) DO NOTHING;
```
Por cada fila del SELECT: si tiene `recipe_id` y `deleted_at !== null` → `skipped++`; si no, ejecutar el INSERT y sumar
`result.changes` a `copied` (vale 0 cuando el turno ya estaba ocupado). Todo dentro de `db.transaction(() => { … })()`.

## Tests primero — `tests/services/plan-copy.test.ts`
`beforeEach`: `db = createTestDb()`, `ana`, `beto`, `tarta = insertRecipe(db)`, `SRC = '2026-10-05'`, `DST = '2026-10-12'`.
1. Destino vacío: origen con `(0,'almuerzo',tarta)`, `(2,'cena','Delivery')`, `(6,'desayuno',tarta)` →
   `{ copied: 3, skipped: 0 }` y `getWeekPlan(DST).entries` tiene los mismos `day`, `mealType`, receta o texto que el origen.
2. Destino parcialmente cargado: en DST ya está `(0,'almuerzo','Sobras')` → `{ copied: 2, skipped: 0 }` y `(0,'almuerzo')` sigue siendo `'Sobras'`.
3. Receta borrada en el origen: `borrada = insertRecipe(db, { deleted: true })` en `(1,'cena')` → `skipped: 1` y ese turno queda vacío en DST.
4. Origen vacío → `{ copied: 0, skipped: 0 }`.
5. Misma semana (`copyWeek(db, ana.id, DST, DST)`) → `{ copied: 0, skipped: 0 }` y nada cambia.
6. Solo copia lo del usuario: entradas de Beto en SRC no aparecen en el DST de Ana.
7. El origen no se modifica (misma cantidad de filas en SRC antes y después).

## Verificación
```bash
npx vitest run tests/services/plan-copy.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(planner): PL-05 copiar una semana llenando solo turnos vacíos`
