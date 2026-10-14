import type { Db } from '@/lib/db';
import { normalizeText } from '@/lib/text';
import { z } from 'astro/zod';

// Mismo orden que los CHECK de db/migrations/002_recipes.sql.
export const CATEGORIES = ['desayuno', 'almuerzo', 'cena', 'snack'] as const;
export const UNITS = ['unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'a gusto'] as const;
/** Orden del recorrido del súper: así se ordena la lista de compras. */
export const AISLES = [
  'Verdulería',
  'Carnicería',
  'Pescadería',
  'Lácteos',
  'Panadería',
  'Almacén',
  'Congelados',
  'Bebidas',
  'Otros',
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

interface RecipeRow {
  id: number;
  title: string;
  category: Category;
  owner_id: number | null;
}

interface IngredientRow {
  name: string;
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
}

export function listRecipes(
  db: Db,
  userId: number,
  filters: { category?: Category; q?: string; mine?: boolean } = {},
): RecipeSummary[] {
  const rows = db
    .prepare<
      { userId: number; category: string | null; mine: number },
      RecipeRow & { ingredient_count: number }
    >(
      `SELECT r.id, r.title, r.category, r.owner_id, COUNT(i.id) AS ingredient_count
         FROM recipes r
         LEFT JOIN recipe_ingredients i ON i.recipe_id = r.id
        WHERE r.deleted_at IS NULL
          AND (r.owner_id IS NULL OR r.owner_id = @userId)
          AND (@category IS NULL OR r.category = @category)
          AND (@mine = 0 OR r.owner_id = @userId)
        GROUP BY r.id`,
    )
    .all({
      userId,
      category: filters.category ?? null,
      mine: filters.mine ? 1 : 0,
    });

  const needle = filters.q ? normalizeText(filters.q) : null;
  return rows
    .filter((r) => needle === null || normalizeText(r.title).includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
    .map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      isCatalog: r.owner_id === null,
      ingredientCount: r.ingredient_count,
    }));
}

/** null si no existe, si es de otro usuario o (sin includeDeleted) si está borrada. */
export function getRecipe(
  db: Db,
  userId: number,
  id: number,
  options: { includeDeleted?: boolean } = {},
): Recipe | null {
  const row = db
    .prepare<[number, number, number], RecipeRow>(
      `SELECT id, title, category, owner_id FROM recipes
        WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)
          AND (? = 1 OR deleted_at IS NULL)`,
    )
    .get(id, userId, options.includeDeleted ? 1 : 0);
  if (!row) return null;

  const ingredients = db
    .prepare<[number], IngredientRow>(
      'SELECT name, qty, unit, aisle FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position',
    )
    .all(id);

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    isCatalog: row.owner_id === null,
    ingredients: ingredients.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      aisle: i.aisle,
    })),
  };
}

/** Visible para el usuario y no borrada. */
export function canAssignRecipe(db: Db, userId: number, id: number): boolean {
  return getRecipe(db, userId, id) !== null;
}
