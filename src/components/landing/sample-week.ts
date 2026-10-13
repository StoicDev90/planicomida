// Datos de ejemplo para la landing: platos caseros con cantidades para 1 persona
// y una versión mínima de la consolidación (la real vive en services/shopping-list, módulo shopping-list).

export type Aisle = 'Verdulería' | 'Carnicería' | 'Lácteos' | 'Panadería' | 'Almacén';
type Unit = 'unidad' | 'g' | 'ml';

interface Ingredient {
  name: string;
  qty: number;
  unit: Unit;
  aisle: Aisle;
}

export interface Dish {
  id: string;
  name: string;
  meal: string;
  ingredients: Ingredient[];
}

const AISLE_ORDER: Aisle[] = ['Verdulería', 'Carnicería', 'Lácteos', 'Panadería', 'Almacén'];

export const DISHES: Dish[] = [
  {
    id: 'fideos',
    name: 'Fideos con tuco',
    meal: 'Almuerzo del lunes',
    ingredients: [
      { name: 'Fideos', qty: 120, unit: 'g', aisle: 'Almacén' },
      { name: 'Tomate', qty: 2, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Cebolla', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Queso rallado', qty: 20, unit: 'g', aisle: 'Lácteos' },
    ],
  },
  {
    id: 'tarta',
    name: 'Tarta de verdura',
    meal: 'Cena del martes',
    ingredients: [
      { name: 'Acelga', qty: 250, unit: 'g', aisle: 'Verdulería' },
      { name: 'Cebolla', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Huevo', qty: 1, unit: 'unidad', aisle: 'Almacén' },
      { name: 'Queso cremoso', qty: 60, unit: 'g', aisle: 'Lácteos' },
      { name: 'Tapa de tarta', qty: 1, unit: 'unidad', aisle: 'Almacén' },
    ],
  },
  {
    id: 'milanesas',
    name: 'Milanesas con puré',
    meal: 'Almuerzo del miércoles',
    ingredients: [
      { name: 'Nalga para milanesa', qty: 200, unit: 'g', aisle: 'Carnicería' },
      { name: 'Huevo', qty: 1, unit: 'unidad', aisle: 'Almacén' },
      { name: 'Pan rallado', qty: 60, unit: 'g', aisle: 'Almacén' },
      { name: 'Papa', qty: 300, unit: 'g', aisle: 'Verdulería' },
      { name: 'Leche', qty: 50, unit: 'ml', aisle: 'Lácteos' },
    ],
  },
  {
    id: 'guiso',
    name: 'Guiso de lentejas',
    meal: 'Cena del jueves',
    ingredients: [
      { name: 'Lentejas', qty: 90, unit: 'g', aisle: 'Almacén' },
      { name: 'Chorizo colorado', qty: 1, unit: 'unidad', aisle: 'Carnicería' },
      { name: 'Cebolla', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Tomate', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Papa', qty: 150, unit: 'g', aisle: 'Verdulería' },
    ],
  },
  {
    id: 'ensalada',
    name: 'Ensalada completa',
    meal: 'Almuerzo del viernes',
    ingredients: [
      { name: 'Lechuga', qty: 120, unit: 'g', aisle: 'Verdulería' },
      { name: 'Tomate', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Zanahoria', qty: 1, unit: 'unidad', aisle: 'Verdulería' },
      { name: 'Huevo', qty: 1, unit: 'unidad', aisle: 'Almacén' },
    ],
  },
  {
    id: 'tostadas',
    name: 'Tostadas con queso',
    meal: 'Desayuno del sábado',
    ingredients: [
      { name: 'Pan francés', qty: 100, unit: 'g', aisle: 'Panadería' },
      { name: 'Queso cremoso', qty: 40, unit: 'g', aisle: 'Lácteos' },
      { name: 'Leche', qty: 200, unit: 'ml', aisle: 'Lácteos' },
    ],
  },
];

export const PRESETS = [
  { id: 'clasica', label: 'Semana clásica', dishes: ['fideos', 'tarta', 'milanesas', 'ensalada'] },
  { id: 'invierno', label: 'De invierno', dishes: ['fideos', 'milanesas', 'guiso', 'tostadas'] },
  { id: 'todo', label: 'Todo', dishes: DISHES.map((d) => d.id) },
] as const;

export const DEFAULT_SELECTION: readonly string[] = PRESETS[0].dishes;

export interface ListLine {
  name: string;
  amount: string;
  /** cuántos platos aportan a esta línea */
  sources: number;
}

// Con estos platos ninguna suma llega a 1000 g o 1000 ml, así que no hace falta pasar a kg o l.
function formatAmount(qty: number, unit: Unit): string {
  if (unit === 'unidad') return qty === 1 ? '1 unidad' : `${qty} unidades`;
  return `${qty} ${unit}`;
}

/** Suma por nombre + unidad y agrupa por góndola, en el orden del recorrido del súper. */
export function buildList(selected: readonly string[]): { aisle: Aisle; lines: ListLine[] }[] {
  const totals = new Map<string, Ingredient & { sources: number }>();
  for (const dish of DISHES.filter((d) => selected.includes(d.id))) {
    for (const ing of dish.ingredients) {
      const key = `${ing.name}|${ing.unit}`;
      const current = totals.get(key);
      if (current) {
        current.qty += ing.qty;
        current.sources += 1;
      } else {
        totals.set(key, { ...ing, sources: 1 });
      }
    }
  }

  return AISLE_ORDER.map((aisle) => ({
    aisle,
    lines: [...totals.values()]
      .filter((t) => t.aisle === aisle)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((t) => ({ name: t.name, amount: formatAmount(t.qty, t.unit), sources: t.sources })),
  })).filter((group) => group.lines.length > 0);
}
