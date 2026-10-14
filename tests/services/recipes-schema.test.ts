import { describe, expect, it } from 'vitest';
import { AISLES, RecipeInput, RecipeListQuery, UNITS } from '@/services/recipes';

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
const issueMessages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

const withIngredient = (ingredient: Record<string, unknown>) => ({
  ...valid,
  ingredients: [ingredient],
});

describe('RecipeInput', () => {
  it('acepta una receta válida y recorta el título', () => {
    const r = RecipeInput.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.title).toBe('Tarta de verdura');
  });

  it('rechaza qty null con unidad distinta de "a gusto"', () => {
    const r = RecipeInput.safeParse(
      withIngredient({ name: 'Sal', qty: null, unit: 'kg', aisle: 'Almacén' }),
    );
    expect(r.success).toBe(false);
    expect(issuePaths(r)).toContain('ingredients.0.qty');
    expect(issueMessages(r)).toContain('Poné una cantidad, o elegí "a gusto"');
  });

  it('rechaza qty con unidad "a gusto"', () => {
    const r = RecipeInput.safeParse(
      withIngredient({ name: 'Sal', qty: 2, unit: 'a gusto', aisle: 'Almacén' }),
    );
    expect(r.success).toBe(false);
    expect(issuePaths(r)).toContain('ingredients.0.qty');
  });

  it('rechaza qty igual a 0', () => {
    const r = RecipeInput.safeParse(
      withIngredient({ name: 'Acelga', qty: 0, unit: 'kg', aisle: 'Verdulería' }),
    );
    expect(r.success).toBe(false);
    expect(issuePaths(r)).toContain('ingredients.0.qty');
  });

  it('rechaza una lista de ingredientes vacía y más de 30', () => {
    const empty = RecipeInput.safeParse({ ...valid, ingredients: [] });
    expect(empty.success).toBe(false);
    expect(issueMessages(empty)).toContain('Agregá al menos un ingrediente');

    const ingredient = { name: 'Sal', qty: null, unit: 'a gusto', aisle: 'Almacén' };
    const tooMany = RecipeInput.safeParse({
      ...valid,
      ingredients: Array.from({ length: 31 }, () => ({ ...ingredient })),
    });
    expect(tooMany.success).toBe(false);
    expect(issueMessages(tooMany)).toContain('Máximo 30 ingredientes');
  });

  it('rechaza una góndola inexistente y una unidad inválida', () => {
    const aisle = RecipeInput.safeParse(
      withIngredient({ name: 'Clavo', qty: 1, unit: 'unidad', aisle: 'Ferretería' }),
    );
    expect(aisle.success).toBe(false);
    expect(issuePaths(aisle)).toContain('ingredients.0.aisle');

    const unit = RecipeInput.safeParse(
      withIngredient({ name: 'Acelga', qty: 1, unit: 'kilo', aisle: 'Verdulería' }),
    );
    expect(unit.success).toBe(false);
    expect(issuePaths(unit)).toContain('ingredients.0.unit');
  });

  it('rechaza categoría inválida y título solo con espacios', () => {
    const category = RecipeInput.safeParse({ ...valid, category: 'merienda' });
    expect(category.success).toBe(false);
    expect(issuePaths(category)).toContain('category');

    const title = RecipeInput.safeParse({ ...valid, title: '   ' });
    expect(title.success).toBe(false);
    expect(issueMessages(title)).toContain('Ingresá un título');
  });
});

describe('constantes', () => {
  it('AISLES y UNITS tienen los valores y el orden del esquema', () => {
    expect([...AISLES]).toEqual([
      'Verdulería',
      'Carnicería',
      'Pescadería',
      'Lácteos',
      'Panadería',
      'Almacén',
      'Congelados',
      'Bebidas',
      'Otros',
    ]);
    expect(UNITS.length).toBe(9);
  });
});

describe('RecipeListQuery', () => {
  it('recorta q y acepta mine=1', () => {
    const r = RecipeListQuery.safeParse({ category: 'cena', q: ' tarta ', mine: '1' });
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({ category: 'cena', q: 'tarta', mine: '1' });
  });

  it('rechaza una categoría inválida y acepta un objeto vacío', () => {
    expect(RecipeListQuery.safeParse({ category: 'x' }).success).toBe(false);
    expect(RecipeListQuery.safeParse({}).success).toBe(true);
  });
});
