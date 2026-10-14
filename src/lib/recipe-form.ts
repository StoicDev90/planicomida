/** Valores crudos de una fila del formulario (todo string, como sale del DOM). */
export interface IngredientRowValues {
  name: string;
  qty: string;
  unit: string;
  aisle: string;
}

export interface RecipeFormValues {
  title: string;
  category: string;
  rows: IngredientRowValues[];
}

/** "1,5" → 1.5; " 2 " → 2; "" → null; "abc" → null. */
export function parseQty(value: string): number | null {
  const n = Number(value.trim().replace(',', '.'));
  return value.trim() === '' || !Number.isFinite(n) ? null : n;
}

/**
 * Arma el body para la API. No filtra filas (si una fila está vacía, la API devuelve el error en esa fila).
 * qty = null si la unidad es 'a gusto'; si no, parseQty(qty).
 */
export function toRecipeInput(values: RecipeFormValues): {
  title: string;
  category: string;
  ingredients: { name: string; qty: number | null; unit: string; aisle: string }[];
} {
  return {
    title: values.title,
    category: values.category,
    ingredients: values.rows.map((row) => ({
      name: row.name,
      qty: row.unit === 'a gusto' ? null : parseQty(row.qty),
      unit: row.unit,
      aisle: row.aisle,
    })),
  };
}

/**
 * Separa los errores de la API: 'ingredients.2.qty' → rows[2].qty; el resto ('title', 'category',
 * 'ingredients') → form.
 */
export function splitFieldErrors(fields: Record<string, string>): {
  form: Record<string, string>;
  rows: Record<number, Record<string, string>>;
} {
  const form: Record<string, string> = {};
  const rows: Record<number, Record<string, string>> = {};
  const rowKey = /^ingredients\.(\d+)\.(\w+)$/;

  for (const [key, message] of Object.entries(fields)) {
    const match = rowKey.exec(key);
    if (match) {
      const index = Number(match[1]);
      rows[index] ??= {};
      rows[index][match[2]] = message;
    } else {
      form[key] = message;
    }
  }
  return { form, rows };
}
