# RC-01 · Migración `002_recipes.sql`

- **Módulo:** recipes · **Depende de:** módulo identity terminado (usa `users` y `createUser`) · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-recipes.md` líneas 16–44 (Datos).

## Archivos
- Crear: `db/migrations/002_recipes.sql`
- Crear: `tests/db/recipes-schema.test.ts`

## Contrato — `db/migrations/002_recipes.sql` (copiar tal cual)
```sql
CREATE TABLE recipes (
  id         INTEGER PRIMARY KEY,
  owner_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  category   TEXT NOT NULL CHECK (category IN ('desayuno', 'almuerzo', 'cena', 'snack')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT
);
CREATE INDEX recipes_owner_id ON recipes(owner_id);

CREATE TABLE recipe_ingredients (
  id        INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  name      TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  qty       REAL CHECK (qty IS NULL OR qty > 0),
  unit      TEXT NOT NULL CHECK (unit IN ('unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'a gusto')),
  aisle     TEXT NOT NULL CHECK (aisle IN ('Verdulería', 'Carnicería', 'Pescadería', 'Lácteos', 'Panadería',
                                           'Almacén', 'Congelados', 'Bebidas', 'Otros')),
  CHECK ((unit = 'a gusto') = (qty IS NULL))
);
CREATE INDEX recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
```

## Tests primero — `tests/db/recipes-schema.test.ts`
`beforeEach`: `db = createTestDb()`. Helper local:
```ts
const addRecipe = (ownerId: number | null = null) =>
  Number(db.prepare("INSERT INTO recipes (owner_id, title, category) VALUES (?, 'Tarta', 'cena')").run(ownerId).lastInsertRowid);
const addIngredient = (recipeId: number, qty: number | null, unit: string, aisle = 'Verdulería') =>
  db.prepare('INSERT INTO recipe_ingredients (recipe_id, position, name, qty, unit, aisle) VALUES (?, 0, ?, ?, ?, ?)')
    .run(recipeId, 'Acelga', qty, unit, aisle);
```
1. `schemaVersion(db) >= 2`.
2. Receta de catálogo (`owner_id` NULL) se inserta bien.
3. Categoría inválida (`'merienda'`) → lanza `/CHECK/`.
4. `addIngredient(id, 1, 'kg')` ok; `addIngredient(id, null, 'a gusto')` ok.
5. `addIngredient(id, null, 'kg')` → `/CHECK/`; `addIngredient(id, 2, 'a gusto')` → `/CHECK/`; `addIngredient(id, 0, 'g')` → `/CHECK/`.
6. Unidad `'kilo'` → `/CHECK/`; góndola `'Ferretería'` → `/CHECK/`.
7. Borrar la receta (`DELETE FROM recipes`) borra sus ingredientes.
8. Borrar el usuario dueño (`createUser` + `addRecipe(user.id)`, `DELETE FROM users`) borra sus recetas.

## Verificación
```bash
npx vitest run tests/db/recipes-schema.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 8 casos pasan.

## Commit
`feat(recipes): RC-01 migración de recipes y recipe_ingredients`
