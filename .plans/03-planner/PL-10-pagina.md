# PL-10 · Página `/app/planner` y componente `MealSlot`

- **Módulo:** planner · **Depende de:** PL-03, PL-09 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-planner.md` líneas 83–88 (UI).
- `src/lib/week-view.ts` (PL-09) y `.plans/README.md` → "Guía visual".

## Archivos
- Crear: `src/components/MealSlot.astro`
- Crear: `src/pages/app/planner.astro`

## Contrato

### `src/components/MealSlot.astro` (copiar tal cual)
```astro
---
import type { SlotView } from '@/lib/week-view';

interface Props {
  week: string;
  day: number;
  dayLabel: string;
  slot: SlotView;
}
const { week, day, dayLabel, slot } = Astro.props;
---

<button
  type="button"
  data-slot
  data-week={week}
  data-day={day}
  data-meal={slot.mealType}
  data-meal-label={slot.mealLabel}
  data-day-label={dayLabel}
  class="group flex min-h-14 w-full flex-col items-start bg-surface px-3 py-2 text-left transition-colors hover:bg-ink hover:text-paper"
>
  <span class="text-small text-muted group-hover:text-paper">{slot.mealLabel}</span>
  <span data-slot-label class:list={['font-medium break-words', { 'text-muted group-hover:text-paper': !slot.entry }]}>
    {slot.label}
  </span>
</button>
```

### `src/pages/app/planner.astro`
Frontmatter (copiar tal cual):
```astro
---
import Layout from '@/layouts/Layout.astro';
import MealSlot from '@/components/MealSlot.astro';
import { getDb } from '@/lib/db';
import { isWeekStart } from '@/lib/week';
import { buildWeekView, today, weekRangeLabel } from '@/lib/week-view';
import { getWeekPlan } from '@/services/plan';

const user = Astro.locals.user!;
const current = today();
const requested = Astro.url.searchParams.get('semana');
const week = isWeekStart(requested) ? requested : current.weekStart;
const plan = getWeekPlan(getDb(), user.id, week);
const days = buildWeekView(plan);
---
```
Markup (copiar tal cual):
```astro
<Layout title="Planner · PlaniComida">
  <main class="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <h1 class="font-display text-head leading-[0.95] uppercase">Planner</h1>

    <nav aria-label="Semanas" class="mt-6 flex flex-wrap items-center gap-3">
      <a href={`/app/planner?semana=${plan.prevWeek}`} class="btn bg-surface text-ink hover:bg-ink hover:text-paper" aria-label="Semana anterior">◀</a>
      <p class="text-lead font-medium">{weekRangeLabel(week)}</p>
      <a href={`/app/planner?semana=${plan.nextWeek}`} class="btn bg-surface text-ink hover:bg-ink hover:text-paper" aria-label="Semana siguiente">▶</a>
      {week !== current.weekStart && <a href="/app/planner" class="link min-h-11 inline-flex items-center">Hoy</a>}
    </nav>

    <!-- PL-12 agrega acá "Copiar semana anterior" y "Ver lista de compras" -->

    <ol class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-7 lg:gap-3">
      {
        days.map((d) => (
          <li class:list={['space-y-2', { 'max-lg:order-first': d.isToday }]}>
            <h2 class="font-medium">
              {d.label}
              {d.isToday && <span class="text-accent"> · Hoy</span>}
            </h2>
            {d.slots.map((slot) => (
              <MealSlot week={week} day={d.day} dayLabel={d.label} slot={slot} />
            ))}
          </li>
        ))
      }
    </ol>

    <!-- PL-11 agrega acá <SlotPicker /> -->
  </main>
</Layout>
```

## Verificación
```bash
npm run check
npx vitest run
npm run build
# Servidor levantado, sesión en /tmp/pc.txt:
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner?semana=2026-10-12' | grep -c 'data-slot-label'      # 28
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner?semana=2026-10-12' | grep -c 'Semana del lun 12 al dom 18 oct'   # 1
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner?semana=2026-10-13' | grep -c 'data-slot-label'      # 28 (vuelve a la semana actual)
# Asignar algo por API y ver que aparece:
curl -s -b /tmp/pc.txt -X PUT -H 'Content-Type: application/json' -d '{"customMealName":"Delivery"}' \
  http://localhost:4321/api/plan/2026-10-12/0/cena
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner?semana=2026-10-12' | grep -c 'Delivery'            # 1
```
Manual en el navegador: a 360 px (una columna, el día de hoy primero), 768 px (dos columnas) y 1280 px (7 columnas, toda la
semana a la vista, sin scroll horizontal). ◀ ▶ cambian de semana; "Hoy" vuelve a la actual.

## Hecho cuando
- [ ] Los `curl` dan lo indicado, el build pasa y la revisión en los tres anchos está bien.

## Commit
`feat(planner): PL-10 página del planner con la grilla semanal`
