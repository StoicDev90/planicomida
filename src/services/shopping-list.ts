import { normalizeText } from '@/lib/text';
import type { Aisle, Unit } from '@/services/recipes';

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
