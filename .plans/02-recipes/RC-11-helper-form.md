# RC-11 · Helper del formulario de recetas (función pura)

- **Módulo:** recipes · **Depende de:** RC-03 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-recipes.md` líneas 69–82 (forma de `RecipeInput`).
- `src/lib/http.ts` → `fieldErrors` (claves con puntos: `'ingredients.2.qty'`).

## Archivos
- Crear: `src/lib/recipe-form.ts`
- Crear: `tests/lib/recipe-form.test.ts`

## Contrato — `src/lib/recipe-form.ts`
```ts
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
export function parseQty(value: string): number | null;

/**
 * Arma el body para la API. No filtra filas (si una fila está vacía, la API devuelve el error en esa fila).
 * qty = null si la unidad es 'a gusto'; si no, parseQty(qty).
 */
export function toRecipeInput(values: RecipeFormValues): {
  title: string;
  category: string;
  ingredients: { name: string; qty: number | null; unit: string; aisle: string }[];
};

/**
 * Separa los errores de la API: 'ingredients.2.qty' → rows[2].qty; el resto ('title', 'category',
 * 'ingredients') → form.
 */
export function splitFieldErrors(fields: Record<string, string>): {
  form: Record<string, string>;
  rows: Record<number, Record<string, string>>;
};
```
`parseQty`: `const n = Number(value.trim().replace(',', '.')); return value.trim() === '' || !Number.isFinite(n) ? null : n;`
`splitFieldErrors`: regex `/^ingredients\.(\d+)\.(\w+)$/`.

## Tests primero — `tests/lib/recipe-form.test.ts`
1. `parseQty`: `'1,5'` → `1.5`; `' 2 '` → `2`; `''` → `null`; `'abc'` → `null`; `'0'` → `0`.
2. `toRecipeInput({ title: 'Tarta', category: 'cena', rows: [ { name: 'Acelga', qty: '1', unit: 'kg', aisle: 'Verdulería' }, { name: 'Sal', qty: '3', unit: 'a gusto', aisle: 'Almacén' } ] })` →
   `{ title: 'Tarta', category: 'cena', ingredients: [ { name: 'Acelga', qty: 1, unit: 'kg', aisle: 'Verdulería' }, { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' } ] }`.
3. Fila vacía `{ name: '', qty: '', unit: 'unidad', aisle: 'Otros' }` se mantiene (con `qty: null`).
4. El resultado de `toRecipeInput` del caso 2 pasa `RecipeInput.safeParse` (importar de `@/services/recipes`).
5. `splitFieldErrors({ title: 'Ingresá un título', 'ingredients.0.qty': 'X', 'ingredients.2.name': 'Y', ingredients: 'Z' })` →
   `{ form: { title: 'Ingresá un título', ingredients: 'Z' }, rows: { 0: { qty: 'X' }, 2: { name: 'Y' } } }`.

## Verificación
```bash
npx vitest run tests/lib/recipe-form.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 5 casos pasan.

## Commit
`feat(recipes): RC-11 helper puro del formulario de recetas`
