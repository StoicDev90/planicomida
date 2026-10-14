import { z } from 'astro/zod';
import type { Db } from '@/lib/db';
import { normalizeText } from '@/lib/text';
import { AISLES, type Aisle, type Unit } from '@/services/recipes';
import { getRecipeIdsForWeek } from '@/services/plan';

/** Unidades después de pasar kg → g y l → ml. */
export type BaseUnit = 'unidad' | 'g' | 'ml' | 'cda' | 'cdta' | 'taza' | 'a gusto';

/** Un ingrediente tal como viene de una receta del plan (en orden día → turno → posición). */
export interface IngredientRow {
  name: string;
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
}

export interface ConsolidatedLine {
  key: string; // "tomate|unidad"
  name: string; // el de la primera aparición
  aisle: Aisle; // el de la primera aparición
  qty: number | null; // suma en unidad base; null para "a gusto"
  unit: BaseUnit;
}

const BASE_UNITS: Record<Unit, { unit: BaseUnit; factor: number }> = {
  unidad: { unit: 'unidad', factor: 1 },
  g: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  ml: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
  cda: { unit: 'cda', factor: 1 },
  cdta: { unit: 'cdta', factor: 1 },
  taza: { unit: 'taza', factor: 1 },
  'a gusto': { unit: 'a gusto', factor: 1 },
};

/** kg → g (×1000), l → ml (×1000). El resto igual. qty null queda null. */
export function toBaseUnit(qty: number | null, unit: Unit): { qty: number | null; unit: BaseUnit } {
  const base = BASE_UNITS[unit];
  return { qty: qty === null ? null : qty * base.factor, unit: base.unit };
}

/** `${normalizeText(name)}|${unit}` */
export function consolidationKey(name: string, unit: BaseUnit): string {
  return `${normalizeText(name)}|${unit}`;
}

/** Suma por clave, en el orden de la primera aparición. "a gusto" no suma (queda qty null). */
export function consolidate(rows: IngredientRow[]): ConsolidatedLine[] {
  const map = new Map<string, ConsolidatedLine>();
  for (const row of rows) {
    const base = toBaseUnit(row.qty, row.unit);
    const key = consolidationKey(row.name, base.unit);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        name: row.name.trim(),
        aisle: row.aisle,
        qty: base.qty,
        unit: base.unit,
      });
    } else if (existing.qty !== null) {
      existing.qty += base.qty!;
    }
  }
  return [...map.values()];
}

export interface ShoppingItem {
  key: string;
  id?: number; // solo los manuales
  name: string;
  qty: number | null;
  unit: string | null;
  manual: boolean;
}

export interface ShoppingAisle {
  aisle: Aisle;
  items: ShoppingItem[];
}

export interface ShoppingList {
  weekStart: string;
  aisles: ShoppingAisle[];
  customMeals: string[];
}

export interface ManualItem {
  id: number;
  name: string;
  qty: number | null;
  unit: string | null;
  aisle: Aisle;
}

/** Redondea a 2 decimales: 1.005 → 1.01 no importa; 0.1 + 0.2 → 0.3. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** g ≥ 1000 → kg; ml ≥ 1000 → l; redondeo a 2 decimales. qty null queda null. */
export function formatQty(
  qty: number | null,
  unit: BaseUnit,
): { qty: number | null; unit: string } {
  if (qty === null) return { qty: null, unit };
  if (unit === 'g' && qty >= 1000) return { qty: round2(qty / 1000), unit: 'kg' };
  if (unit === 'ml' && qty >= 1000) return { qty: round2(qty / 1000), unit: 'l' };
  return { qty: round2(qty), unit };
}

export function manualToItem(item: ManualItem): ShoppingItem {
  return {
    key: `manual|${item.id}`,
    id: item.id,
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    manual: true,
  };
}

/**
 * Junta líneas de recetas (formateadas) y manuales por góndola.
 * Góndolas en el orden de AISLES (sin las vacías); dentro de cada una, por nombre con localeCompare('es').
 */
export function buildAisles(lines: ConsolidatedLine[], manual: ManualItem[]): ShoppingAisle[] {
  const byAisle = new Map<Aisle, ShoppingItem[]>();
  const add = (aisle: Aisle, item: ShoppingItem) => {
    const items = byAisle.get(aisle);
    if (items) items.push(item);
    else byAisle.set(aisle, [item]);
  };
  for (const line of lines) {
    add(line.aisle, {
      key: line.key,
      name: line.name,
      ...formatQty(line.qty, line.unit),
      manual: false,
    });
  }
  for (const item of manual) add(item.aisle, manualToItem(item));

  return AISLES.flatMap((aisle) => {
    const items = byAisle.get(aisle);
    if (!items) return [];
    return [{ aisle, items: items.sort((a, b) => a.name.localeCompare(b.name, 'es')) }];
  });
}

/** Unidades permitidas en ítems manuales (todas menos "a gusto"). */
export const MANUAL_UNITS = ['unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza'] as const;

export const ManualItemInput = z
  .object({
    name: z.string().trim().min(1, 'Escribí qué querés comprar').max(60, 'Máximo 60 caracteres'),
    qty: z.number().positive('Tiene que ser mayor a 0').optional(),
    unit: z.enum(MANUAL_UNITS).optional(),
    aisle: z.enum(AISLES).default('Otros'),
  })
  .refine((i) => (i.qty === undefined) === (i.unit === undefined), {
    message: 'La cantidad y la unidad van juntas',
    path: ['qty'],
  });
export type ManualItemData = z.infer<typeof ManualItemInput>;

/** Ítems manuales de la semana, en orden de creación (id). */
export function listManualItems(db: Db, userId: number, weekStart: string): ManualItem[] {
  return db
    .prepare(
      'SELECT id, name, qty, unit, aisle FROM shopping_list_manual_items WHERE user_id = ? AND week_start = ? ORDER BY id',
    )
    .all(userId, weekStart) as ManualItem[];
}

export function addManualItem(
  db: Db,
  userId: number,
  weekStart: string,
  input: ManualItemData,
): ManualItem {
  const qty = input.qty ?? null;
  const unit = input.unit ?? null;
  const result = db
    .prepare(
      'INSERT INTO shopping_list_manual_items (user_id, week_start, name, qty, unit, aisle) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(userId, weekStart, input.name, qty, unit, input.aisle);
  return {
    id: Number(result.lastInsertRowid),
    name: input.name,
    qty,
    unit,
    aisle: input.aisle,
  };
}

/** true si borró; false si no existe o es de otro usuario. */
export function deleteManualItem(db: Db, userId: number, id: number): boolean {
  const result = db
    .prepare('DELETE FROM shopping_list_manual_items WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return result.changes === 1;
}

/** Lista de compras de una semana: recetas del plan (consolidadas) + ítems manuales. */
export function getShoppingList(db: Db, userId: number, weekStart: string): ShoppingList {
  const ids = getRecipeIdsForWeek(db, userId, weekStart);
  const byRecipe = new Map<number, IngredientRow[]>();
  if (ids.length > 0) {
    const unique = [...new Set(ids)];
    const rows = db
      .prepare(
        `SELECT recipe_id, name, qty, unit, aisle FROM recipe_ingredients
          WHERE recipe_id IN (${unique.map(() => '?').join(', ')}) ORDER BY recipe_id, position`,
      )
      .all(...unique) as (IngredientRow & { recipe_id: number })[];
    for (const { recipe_id, ...ingredient } of rows) {
      const list = byRecipe.get(recipe_id);
      if (list) list.push(ingredient);
      else byRecipe.set(recipe_id, [ingredient]);
    }
  }
  // Una receta en dos turnos aporta dos veces, en el orden del plan.
  const rows = ids.flatMap((id) => byRecipe.get(id) ?? []);

  const customMeals = db
    .prepare(
      `SELECT custom_meal_name FROM meal_plan_entries
        WHERE user_id = ? AND week_start = ? AND custom_meal_name IS NOT NULL
        ORDER BY day, CASE meal_type WHEN 'desayuno' THEN 0 WHEN 'almuerzo' THEN 1 WHEN 'snack' THEN 2 ELSE 3 END`,
    )
    .pluck()
    .all(userId, weekStart) as string[];

  return {
    weekStart,
    aisles: buildAisles(consolidate(rows), listManualItems(db, userId, weekStart)),
    customMeals: [...new Set(customMeals)],
  };
}
