# PL-01 · Migración `003_planner.sql`

- **Módulo:** planner · **Depende de:** módulo recipes terminado · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 17–38 (Datos).

## Archivos
- Crear: `db/migrations/003_planner.sql`
- Crear: `tests/db/planner-schema.test.ts`

## Contrato — `db/migrations/003_planner.sql` (copiar tal cual)
```sql
CREATE TABLE meal_plan_entries (
  id               INTEGER PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start       TEXT NOT NULL CHECK (date(week_start) = week_start AND strftime('%w', week_start) = '1'),
  day              INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  meal_type        TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'snack', 'cena')),
  recipe_id        INTEGER REFERENCES recipes(id),
  custom_meal_name TEXT CHECK (custom_meal_name IS NULL OR length(custom_meal_name) BETWEEN 1 AND 80),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK ((recipe_id IS NULL) <> (custom_meal_name IS NULL)),
  UNIQUE (user_id, week_start, day, meal_type)
);
```

## Tests primero — `tests/db/planner-schema.test.ts`
`beforeEach`: `db = createTestDb()`, `user = createUser(db)`, `recipeId = insertRecipe(db)`. Helper local:
```ts
const add = (week: string, day: number, meal: string, recipe: number | null, custom: string | null) =>
  db.prepare('INSERT INTO meal_plan_entries (user_id, week_start, day, meal_type, recipe_id, custom_meal_name) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, week, day, meal, recipe, custom);
```
1. `schemaVersion(db) >= 3`.
2. `add('2026-10-12', 0, 'almuerzo', recipeId, null)` y `add('2026-10-12', 0, 'cena', null, 'Delivery')` → ok.
3. `week_start` que no es lunes (`'2026-10-13'`) → `/CHECK/`; fecha inexistente (`'2026-02-30'`) → `/CHECK/`.
4. `day` 7 → `/CHECK/`; `meal_type` `'merienda'` → `/CHECK/`.
5. Receta **y** texto a la vez → `/CHECK/`; ninguno de los dos → `/CHECK/`.
6. Dos entradas en el mismo turno (mismo usuario, semana, día y comida) → `/UNIQUE/`.
7. Receta inexistente (`recipe_id` 999) → `/FOREIGN KEY/`.

## Verificación
```bash
npx vitest run tests/db/planner-schema.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(planner): PL-01 migración de meal_plan_entries`
