# RC-03 · Constantes, tipos y esquemas zod de recetas

- **Módulo:** recipes · **Depende de:** RC-01 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-recipes.md` líneas 16–40 (valores permitidos), 46–50 (reglas) y 60–87 (API y contrato).

## Archivos
- Crear: `src/services/recipes.ts` (solo lo de esta tarea; RC-04 y RC-05 agregan funciones al final)
- Crear: `tests/services/recipes-schema.test.ts`

## Contrato — `src/services/recipes.ts` (copiar tal cual)
```ts
import { z } from 'astro/zod';

// Mismo orden que los CHECK de db/migrations/002_recipes.sql.
export const CATEGORIES = ['desayuno', 'almuerzo', 'cena', 'snack'] as const;
export const UNITS = ['unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'a gusto'] as const;
/** Orden del recorrido del súper: así se ordena la lista de compras. */
export const AISLES = [
  'Verdulería', 'Carnicería', 'Pescadería', 'Lácteos', 'Panadería', 'Almacén', 'Congelados', 'Bebidas', 'Otros',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Unit = (typeof UNITS)[number];
export type Aisle = (typeof AISLES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack / Merienda',
};

export const IngredientInput = z
  .object({
    name: z.string().trim().min(1, 'Ingresá el ingrediente').max(60, 'Máximo 60 caracteres'),
    qty: z.number().positive('Tiene que ser mayor a 0').nullable(),
    unit: z.enum(UNITS),
    aisle: z.enum(AISLES),
  })
  .refine((i) => (i.unit === 'a gusto') === (i.qty === null), {
    message: 'Poné una cantidad, o elegí "a gusto"',
    path: ['qty'],
  });

export const RecipeInput = z.object({
  title: z.string().trim().min(1, 'Ingresá un título').max(80, 'Máximo 80 caracteres'),
  category: z.enum(CATEGORIES),
  ingredients: z
    .array(IngredientInput)
    .min(1, 'Agregá al menos un ingrediente')
    .max(30, 'Máximo 30 ingredientes'),
});
export type RecipeInputData = z.infer<typeof RecipeInput>;

/** Query de GET /api/recipes. `mine=1` = solo las propias. */
export const RecipeListQuery = z.object({
  category: z.enum(CATEGORIES).optional(),
  q: z.string().trim().max(80).optional(),
  mine: z.literal('1').optional(),
});

export interface Ingredient {
  name: string;
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
}

export interface Recipe {
  id: number;
  title: string;
  category: Category;
  isCatalog: boolean;
  ingredients: Ingredient[];
}

export interface RecipeSummary {
  id: number;
  title: string;
  category: Category;
  isCatalog: boolean;
  ingredientCount: number;
}
```

## Tests primero — `tests/services/recipes-schema.test.ts`
```ts
const valid = {
  title: ' Tarta de verdura ',
  category: 'cena',
  ingredients: [
    { name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' },
    { name: 'Tapas de tarta', qty: 1, unit: 'unidad', aisle: 'Almacén' },
    { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' },
  ],
};
const issuePaths = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.error?.issues.map((i) => i.path.join('.')) ?? [];
```
1. `RecipeInput.safeParse(valid)` → `success: true` y `data.title === 'Tarta de verdura'` (trim).
2. Ingrediente `{ qty: null, unit: 'kg' }` → falla con path `'ingredients.0.qty'` y mensaje `'Poné una cantidad, o elegí "a gusto"'`.
3. `{ qty: 2, unit: 'a gusto' }` → falla con path `'ingredients.0.qty'`.
4. `qty: 0` → falla (`'ingredients.0.qty'`).
5. `ingredients: []` → falla con mensaje `'Agregá al menos un ingrediente'`; 31 ingredientes → falla con `'Máximo 30 ingredientes'`.
6. `aisle: 'Ferretería'` → falla en `'ingredients.0.aisle'`; `unit: 'kilo'` → falla en `'ingredients.0.unit'`.
7. `category: 'merienda'` → falla en `'category'`; `title: '   '` → falla con `'Ingresá un título'`.
8. `AISLES` es exactamente `['Verdulería','Carnicería','Pescadería','Lácteos','Panadería','Almacén','Congelados','Bebidas','Otros']`
   y `UNITS.length === 9`.
9. `RecipeListQuery.safeParse({ category: 'cena', q: ' tarta ', mine: '1' })` → `{ category: 'cena', q: 'tarta', mine: '1' }`;
   `{ category: 'x' }` → falla; `{}` → `success: true`.

## Verificación
```bash
npx vitest run tests/services/recipes-schema.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 9 casos pasan.

## Commit
`feat(recipes): RC-03 constantes, tipos y esquemas de recetas`
