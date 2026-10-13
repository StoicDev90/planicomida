# RC-04 · Lectura: `listRecipes`, `getRecipe`, `canAssignRecipe`

- **Módulo:** recipes · **Depende de:** RC-02, RC-03 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-recipes.md` líneas 46–53 (Reglas de visibilidad y borrado) y 84–87 (Contrato).
- `src/services/recipes.ts` (tipos de RC-03).

## Archivos
- Modificar: `src/services/recipes.ts` (agregar al final)
- Modificar: `tests/helpers/fixtures.ts` (agregar `insertRecipe` al final)
- Crear: `tests/services/recipes-read.test.ts`

## Contrato

### Agregar a `src/services/recipes.ts`
```ts
import type { Db } from '@/lib/db';
import { normalizeText } from '@/lib/text';

export function listRecipes(
  db: Db,
  userId: number,
  filters: { category?: Category; q?: string; mine?: boolean } = {},
): RecipeSummary[];

/** null si no existe, si es de otro usuario o (sin includeDeleted) si está borrada. */
export function getRecipe(
  db: Db,
  userId: number,
  id: number,
  options: { includeDeleted?: boolean } = {},
): Recipe | null;

/** Visible para el usuario y no borrada. */
export function canAssignRecipe(db: Db, userId: number, id: number): boolean;
```
SQL de `listRecipes` (parámetros con nombre de better-sqlite3):
```sql
SELECT r.id, r.title, r.category, r.owner_id, COUNT(i.id) AS ingredient_count
  FROM recipes r
  LEFT JOIN recipe_ingredients i ON i.recipe_id = r.id
 WHERE r.deleted_at IS NULL
   AND (r.owner_id IS NULL OR r.owner_id = @userId)
   AND (@category IS NULL OR r.category = @category)
   AND (@mine = 0 OR r.owner_id = @userId)
 GROUP BY r.id
```
`.all({ userId, category: filters.category ?? null, mine: filters.mine ? 1 : 0 })`.
Después, en JS: si hay `q`, quedarse con las que `normalizeText(title).includes(normalizeText(q))`;
ordenar por `title` con `a.title.localeCompare(b.title, 'es')`; mapear a `RecipeSummary`
(`isCatalog: owner_id === null`, `ingredientCount: ingredient_count`).

SQL de `getRecipe`:
```sql
SELECT id, title, category, owner_id FROM recipes
 WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)
   AND (? = 1 OR deleted_at IS NULL);
SELECT name, qty, unit, aisle FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position;
```

### Agregar a `tests/helpers/fixtures.ts`
```ts
interface FixtureIngredient {
  name: string;
  qty: number | null;
  unit: string;
  aisle: string;
}

/** Inserta una receta directo en la base. ownerId null = catálogo. Devuelve el id. */
export function insertRecipe(
  db: Db,
  {
    ownerId = null,
    title = 'Tarta de verdura',
    category = 'cena',
    deleted = false,
    ingredients = [{ name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' }],
  }: {
    ownerId?: number | null;
    title?: string;
    category?: string;
    deleted?: boolean;
    ingredients?: FixtureIngredient[];
  } = {},
): number {
  const id = Number(
    db
      .prepare('INSERT INTO recipes (owner_id, title, category, deleted_at) VALUES (?, ?, ?, ?)')
      .run(ownerId, title, category, deleted ? '2026-01-01T00:00:00Z' : null).lastInsertRowid,
  );
  const insert = db.prepare(
    'INSERT INTO recipe_ingredients (recipe_id, position, name, qty, unit, aisle) VALUES (?, ?, ?, ?, ?, ?)',
  );
  ingredients.forEach((i, position) => insert.run(id, position, i.name, i.qty, i.unit, i.aisle));
  return id;
}
```

## Tests primero — `tests/services/recipes-read.test.ts`
`beforeEach`: `db = createTestDb()`, `ana = createUser(db)`, `beto = createUser(db, 'beto@mail.com', 'Beto')`.
1. `listRecipes` con catálogo `'Tarta'` + propia de Ana `'Arroz'` + propia de Beto `'Bife'` → para Ana: títulos `['Arroz', 'Tarta']`
   (ordenados), `isCatalog` `[false, true]`.
2. `ingredientCount`: receta con 3 ingredientes → `3`.
3. Filtro `category: 'cena'` → solo las de cena. Filtro `mine: true` → solo las de Ana.
4. Filtro `q: 'TARTÁ'` encuentra `'Tarta de verdura'`; `q: 'pollo'` → `[]`.
5. Receta borrada (`deleted: true`) no aparece.
6. `getRecipe(db, ana.id, id)` de una propia con ingredientes `[Acelga 1 kg, Sal null 'a gusto']` → devuelve
   `{ id, title, category, isCatalog: false, ingredients: [...] }` con los ingredientes **en orden de position** y `qty: null` en Sal.
7. `getRecipe` de una receta de Beto pedida por Ana → `null`. Id inexistente → `null`.
8. `getRecipe` de una borrada → `null`; con `{ includeDeleted: true }` → la receta.
9. `canAssignRecipe`: catálogo → `true`; propia → `true`; de Beto → `false`; borrada → `false`.

## Verificación
```bash
npx vitest run tests/services/recipes-read.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 9 casos pasan.

## Commit
`feat(recipes): RC-04 lectura de recetas con visibilidad por usuario`
