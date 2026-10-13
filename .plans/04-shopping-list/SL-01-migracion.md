# SL-01 · Migración `004_shopping_list.sql`

- **Módulo:** shopping-list · **Depende de:** módulo planner terminado · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 40–61 (Ítems manuales).

## Archivos
- Crear: `db/migrations/004_shopping_list.sql`
- Crear: `tests/db/shopping-schema.test.ts`

## Contrato — `db/migrations/004_shopping_list.sql` (copiar tal cual)
```sql
CREATE TABLE shopping_list_manual_items (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL CHECK (date(week_start) = week_start AND strftime('%w', week_start) = '1'),
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  qty        REAL CHECK (qty IS NULL OR qty > 0),
  unit       TEXT CHECK (unit IS NULL OR unit IN ('unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza')),
  aisle      TEXT NOT NULL DEFAULT 'Otros' CHECK (aisle IN ('Verdulería', 'Carnicería', 'Pescadería', 'Lácteos',
                                                            'Panadería', 'Almacén', 'Congelados', 'Bebidas', 'Otros')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK ((qty IS NULL) = (unit IS NULL))
);
CREATE INDEX shopping_list_manual_items_user_week ON shopping_list_manual_items(user_id, week_start);
```
> La spec dice "mismo CHECK de góndolas que recipe_ingredients": acá está escrito explícito.

## Tests primero — `tests/db/shopping-schema.test.ts`
`beforeEach`: `db = createTestDb()`, `user = createUser(db)`. Helper local:
```ts
const add = (name: string, qty: number | null, unit: string | null, aisle?: string) =>
  aisle === undefined
    ? db.prepare("INSERT INTO shopping_list_manual_items (user_id, week_start, name, qty, unit) VALUES (?, '2026-10-12', ?, ?, ?)").run(user.id, name, qty, unit)
    : db.prepare("INSERT INTO shopping_list_manual_items (user_id, week_start, name, qty, unit, aisle) VALUES (?, '2026-10-12', ?, ?, ?, ?)").run(user.id, name, qty, unit, aisle);
```
1. `schemaVersion(db) >= 4`.
2. `add('Detergente', 1, 'unidad')` ok y su `aisle` es `'Otros'` (default).
3. `add('Papel', null, null)` ok.
4. `add('X', 1, null)` → `/CHECK/`; `add('X', null, 'g')` → `/CHECK/`.
5. `add('X', 1, 'a gusto')` → `/CHECK/`; `add('X', 1, 'g', 'Ferretería')` → `/CHECK/`.
6. `week_start` martes → `/CHECK/` (insert directo con `'2026-10-13'`).

## Verificación
```bash
npx vitest run tests/db/shopping-schema.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 6 casos pasan.

## Commit
`feat(shopping-list): SL-01 migración de ítems manuales`
