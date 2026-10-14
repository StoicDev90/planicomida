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
