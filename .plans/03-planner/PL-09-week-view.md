# PL-09 · Vista de la semana (función pura)

- **Módulo:** planner · **Depende de:** PL-02 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 83–85 (encabezado "Semana del lun 12 al dom 18 oct", hoy primero).
- `src/lib/week.ts` (`formatDayLabel`, `weekStartOf`).

## Archivos
- Crear: `src/lib/week-view.ts`
- Crear: `tests/lib/week-view.test.ts`

## Contrato — `src/lib/week-view.ts`
```ts
import { formatDayLabel, weekStartOf } from '@/lib/week';
import { MEAL_LABELS, MEAL_TYPES, type MealType, type PlanEntry, type WeekPlan } from '@/services/plan';

export interface SlotView {
  mealType: MealType;
  mealLabel: string;     // MEAL_LABELS[mealType]
  entry: PlanEntry | null;
  label: string;         // título de la receta (+ " (borrada)"), la comida libre, o "Agregar"
}

export interface DayView {
  day: number;           // 0..6
  label: string;         // "lun 12 oct"
  isToday: boolean;
  slots: SlotView[];     // siempre 4, en el orden de MEAL_TYPES
}

/** Semana actual y día (0 = lunes) de `now` en la zona horaria TZ. */
export function today(now = new Date(), timeZone = process.env.TZ ?? 'America/Argentina/Buenos_Aires'): {
  weekStart: string;
  day: number;
};

/** "Semana del lun 12 al dom 18 oct" (mismo mes) · "Semana del lun 28 sept al dom 4 oct" (distinto mes). */
export function weekRangeLabel(weekStart: string): string;

/** 7 días × 4 turnos. `now` sirve para marcar el día de hoy si la semana es la actual. */
export function buildWeekView(plan: WeekPlan, now = new Date()): DayView[];

export function slotLabel(entry: PlanEntry | null): string;
```
Implementación:
- `today`: `weekStart = weekStartOf(now, timeZone)`; el día local con
  `new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)` (da `YYYY-MM-DD`);
  `day = (Date.parse(local) - Date.parse(weekStart)) / 86_400_000`.
- `weekRangeLabel`: `start = formatDayLabel(w, 0)`, `end = formatDayLabel(w, 6)`; si el último token (el mes) es igual en
  los dos, sacar el mes de `start` (`start.split(' ').slice(0, 2).join(' ')`). Devolver `` `Semana del ${start} al ${end}` ``.
- `slotLabel`: `null` → `'Agregar'`; con receta → `title` + (`deleted` ? `' (borrada)'` : `''`); si no → `customMealName`.

## Tests primero — `tests/lib/week-view.test.ts`
`const plan = { weekStart: '2026-10-12', prevWeek: '2026-10-05', nextWeek: '2026-10-19', entries: [ { day: 2, mealType: 'cena', recipe: { id: 1, title: 'Tarta', deleted: false }, customMealName: null }, { day: 0, mealType: 'desayuno', recipe: null, customMealName: 'Café' } ] }`.
1. `today(new Date('2026-10-14T15:00:00-03:00'))` → `{ weekStart: '2026-10-12', day: 2 }`;
   `today(new Date('2026-10-19T02:30:00Z'))` (domingo 23:30 en Buenos Aires) → `{ weekStart: '2026-10-12', day: 6 }`.
2. `weekRangeLabel('2026-10-12')` → `'Semana del lun 12 al dom 18 oct'`.
3. `weekRangeLabel('2026-09-28')` → `'Semana del lun 28 sept al dom 4 oct'`; `weekRangeLabel('2026-12-28')` → `'Semana del lun 28 dic al dom 3 ene'`.
4. `buildWeekView(plan, new Date('2026-10-14T15:00:00-03:00'))` → 7 días; `days[2].isToday === true` y los demás `false`;
   cada día tiene 4 slots con `mealType` `['desayuno','almuerzo','snack','cena']`.
5. `days[2].slots[3].label === 'Tarta'`; `days[0].slots[0].label === 'Café'`; `days[1].slots[1].label === 'Agregar'` y `entry === null`.
6. Otra semana (`now` = `2026-11-03`) → ningún día `isToday`.
7. `slotLabel` con receta borrada → `'Tarta (borrada)'`.
8. `days[0].label === 'lun 12 oct'` y `slots[2].mealLabel === 'Snack / Merienda'`.

## Verificación
```bash
npx vitest run tests/lib/week-view.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 8 casos pasan.

## Commit
`feat(planner): PL-09 vista de la semana como función pura`
