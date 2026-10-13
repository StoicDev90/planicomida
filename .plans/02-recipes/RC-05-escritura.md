# RC-05 · Escritura: `createRecipe`, `updateRecipe`, `deleteRecipe`

- **Módulo:** recipes · **Depende de:** RC-04 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-recipes.md` líneas 46–54 (Reglas).
- `src/services/recipes.ts` (todo lo anterior).

## Archivos
- Modificar: `src/services/recipes.ts` (agregar al final)
- Crear: `tests/services/recipes-write.test.ts`

## Contrato — agregar a `src/services/recipes.ts`
```ts
export type WriteResult<T> = { ok: true; value: T } | { ok: false; error: 'NOT_FOUND' | 'FORBIDDEN' };

/** `input` ya validado con RecipeInput. Inserta receta e ingredientes en una transacción. */
export function createRecipe(db: Db, userId: number, input: RecipeInputData): Recipe;

/** Reemplaza título, categoría y TODOS los ingredientes, en una transacción. */
export function updateRecipe(db: Db, userId: number, id: number, input: RecipeInputData): WriteResult<Recipe>;

/** Borrado lógico: deleted_at = ahora. */
export function deleteRecipe(db: Db, userId: number, id: number): WriteResult<null>;
```
Chequeo de permisos (igual en update y delete), con
`SELECT owner_id, deleted_at FROM recipes WHERE id = ?`:
1. Sin fila, `deleted_at` no nulo, o `owner_id` de **otro** usuario → `{ ok: false, error: 'NOT_FOUND' }`.
2. `owner_id === null` (catálogo) → `{ ok: false, error: 'FORBIDDEN' }`.
3. Si no, se hace la operación.

SQL:
```sql
INSERT INTO recipes (owner_id, title, category) VALUES (?, ?, ?);
INSERT INTO recipe_ingredients (recipe_id, position, name, qty, unit, aisle) VALUES (?, ?, ?, ?, ?, ?);
UPDATE recipes SET title = ?, category = ? WHERE id = ?;
DELETE FROM recipe_ingredients WHERE recipe_id = ?;
UPDATE recipes SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?;
```
Las inserciones de ingredientes usan `position` = índice en el arreglo. Usar `db.transaction(() => { ... })()`.
`createRecipe` y `updateRecipe` devuelven la receta leída con `getRecipe(db, userId, id)!`.

## Tests primero — `tests/services/recipes-write.test.ts`
`beforeEach`: `db = createTestDb()`, `ana = createUser(db)`, `beto = createUser(db, 'beto@mail.com', 'Beto')`.
`const input = { title: 'Arroz con pollo', category: 'almuerzo' as const, ingredients: [ { name: 'Arroz', qty: 80, unit: 'g' as const, aisle: 'Almacén' as const }, { name: 'Pollo', qty: 250, unit: 'g' as const, aisle: 'Carnicería' as const }, { name: 'Sal', qty: null, unit: 'a gusto' as const, aisle: 'Almacén' as const } ] }`.
1. `createRecipe(db, ana.id, input)` → `{ id: 1, title: 'Arroz con pollo', category: 'almuerzo', isCatalog: false, ingredients: input.ingredients }`.
2. Positions guardadas `0, 1, 2` (`SELECT position FROM recipe_ingredients ORDER BY position`).
3. `updateRecipe` con un solo ingrediente nuevo → `ok: true`, `value.ingredients.length === 1`, y en la tabla quedan solo esas filas.
4. `updateRecipe` de una receta de Beto (pedida por Ana) → `{ ok: false, error: 'NOT_FOUND' }`; id inexistente → `NOT_FOUND`.
5. `updateRecipe` de una del catálogo (`insertRecipe(db)`) → `{ ok: false, error: 'FORBIDDEN' }`.
6. `deleteRecipe` propia → `{ ok: true, value: null }`; después `getRecipe` da `null` y `getRecipe(..., { includeDeleted: true })` no.
7. `deleteRecipe` dos veces → la segunda da `NOT_FOUND`. Catálogo → `FORBIDDEN`. De Beto → `NOT_FOUND`.
8. `updateRecipe` de una borrada → `NOT_FOUND`.
9. Transacción: `updateRecipe` con un ingrediente que viola el CHECK de la base
   (castear: `{ name: 'X', qty: null, unit: 'kg', aisle: 'Almacén' } as never`) → lanza, y la receta conserva sus ingredientes anteriores.

## Verificación
```bash
npx vitest run tests/services/recipes-write.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 9 casos pasan.

## Commit
`feat(recipes): RC-05 alta, edición y borrado lógico de recetas`
