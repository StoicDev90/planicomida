# SL-10 · Página `/app/lista` (funciona sin JS)

- **Módulo:** shopping-list · **Depende de:** SL-05, SL-08 (y PL-09 `today`/`weekRangeLabel`, RC-10 `formatAmount`, RC-11 `parseQty`) · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 104–113 (UI).
- `.plans/README.md` → "Guía visual".

## Archivos
- Crear: `src/pages/app/lista.astro`

## Contrato
Frontmatter (copiar tal cual):
```astro
---
import Layout from '@/layouts/Layout.astro';
import { getDb } from '@/lib/db';
import { formatAmount } from '@/lib/format';
import { fieldErrors } from '@/lib/http';
import { listToText } from '@/lib/list-text';
import { parseQty } from '@/lib/recipe-form';
import { addWeeks, isWeekStart } from '@/lib/week';
import { today, weekRangeLabel } from '@/lib/week-view';
import { AISLES } from '@/services/recipes';
import {
  addManualItem, deleteManualItem, getShoppingList, MANUAL_UNITS, ManualItemInput,
} from '@/services/shopping-list';

const user = Astro.locals.user!;
const requested = Astro.url.searchParams.get('semana');
const week = isWeekStart(requested) ? requested : today().weekStart;
const db = getDb();

let fields: Record<string, string> = {};
let draft = { name: '', qty: '', unit: '', aisle: 'Otros' };

if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData();
  const action = String(form.get('action') ?? '');
  if (action === 'delete') {
    deleteManualItem(db, user.id, Number(form.get('id')));
    return Astro.redirect(`/app/lista?semana=${week}`, 303);
  }
  if (action === 'add') {
    draft = {
      name: String(form.get('name') ?? ''),
      qty: String(form.get('qty') ?? ''),
      unit: String(form.get('unit') ?? ''),
      aisle: String(form.get('aisle') ?? 'Otros'),
    };
    const qty = parseQty(draft.qty);
    const parsed = ManualItemInput.safeParse({
      name: draft.name,
      aisle: draft.aisle,
      ...(qty !== null ? { qty } : {}),
      ...(draft.unit ? { unit: draft.unit } : {}),
    });
    if (parsed.success) {
      addManualItem(db, user.id, week, parsed.data);
      return Astro.redirect(`/app/lista?semana=${week}#agregar`, 303);
    }
    fields = fieldErrors(parsed.error);
    Astro.response.status = 400;
  }
}

const list = getShoppingList(db, user.id, week);
const label = weekRangeLabel(week);
const shareText = listToText(list, label);
const prevWeek = addWeeks(week, -1);
const nextWeek = addWeeks(week, 1);
---
```
Markup — estructura obligatoria (los `id`, `data-*` y `name` los usa SL-11):
```astro
<Layout title="Lista del súper · PlaniComida">
  <main
    id="shopping-list"
    data-user={user.id}
    data-week={week}
    data-share-text={shareText}
    class="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12"
  >
    <h1 class="font-display text-head leading-[0.95] uppercase">Lista del súper</h1>

    <nav aria-label="Semanas" class="mt-6 flex flex-wrap items-center gap-3">
      <!-- ◀ y ▶ igual que en src/pages/app/planner.astro, apuntando a /app/lista?semana=${prevWeek|nextWeek} -->
      <p class="text-lead font-medium">{label}</p>
      <a href={`/app/planner?semana=${week}`} class="link inline-flex min-h-11 items-center">Volver al planner</a>
    </nav>

    <p class="mt-4 text-small text-muted">Cantidades para 1 persona por comida. Si comen más, multiplicá.</p>
    {list.customMeals.length > 0 && (
      <p class="mt-2 text-small text-muted">Comidas libres de la semana (no suman ingredientes): {list.customMeals.join(', ')}</p>
    )}

    <div data-toolbar class="mt-6 flex flex-wrap gap-x-6 gap-y-2" hidden>
      <button type="button" data-uncheck-all class="link min-h-11 font-medium">Destildar todo</button>
      <button type="button" data-share class="link min-h-11 font-medium">Compartir</button>
      <span data-share-status role="status" class="inline-flex min-h-11 items-center text-small text-muted"></span>
    </div>

    {list.aisles.length === 0 ? (
      <p class="mt-10">No hay recetas planificadas esta semana. <a href={`/app/planner?semana=${week}`} class="link">Ir al planner</a></p>
    ) : (
      <div class="mt-8 md:columns-2 md:gap-10 lg:columns-3">
        {list.aisles.map((group) => (
          <section class="mb-8 break-inside-avoid" aria-labelledby={`g-${group.aisle}`}>
            <h2 id={`g-${group.aisle}`} class="text-lead font-semibold">{group.aisle}</h2>
            <ul class="mt-2 space-y-1">
              {group.items.map((item, index) => (
                <li data-item data-index={index} class="flex items-center gap-2 bg-surface px-3">
                  <label class="flex min-h-12 flex-1 cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" data-check data-key={item.key} class="size-6 shrink-0 accent-accent" />
                    <span data-name>
                      {item.name}
                      {formatAmount(item.qty, item.unit) && <span class="text-muted"> — {formatAmount(item.qty, item.unit)}</span>}
                      {item.manual && <span class="text-small text-muted"> · agregado</span>}
                    </span>
                  </label>
                  {item.manual && (
                    <form method="post">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" class="link min-h-11 text-small" aria-label={`Quitar ${item.name}`}>Quitar</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    )}

    <section id="agregar" class="mt-12 bg-surface p-5 md:max-w-2xl" aria-labelledby="agregar-titulo">
      <h2 id="agregar-titulo" class="font-medium">Agregar ítem</h2>
      <form method="post" class="mt-4 grid gap-4 md:grid-cols-[1fr_6rem_7rem_10rem_auto] md:items-end" novalidate>
        <input type="hidden" name="action" value="add" />
        <!-- 4 campos con el patrón label + .input + .field-error de src/pages/registro.astro:
             name   → "Qué" (obligatorio, maxlength 60, value={draft.name}, error fields.name)
             qty    → "Cantidad" (inputmode="decimal", value={draft.qty}, error fields.qty)
             unit   → "Unidad" (<select>: opción "" = "Sin unidad" + MANUAL_UNITS, selected={draft.unit === u})
             aisle  → "Góndola" (<select>: AISLES, selected={draft.aisle === a})
             Los inputs dentro de esta sección llevan además la clase bg-paper. -->
        <button type="submit" class="btn">Agregar</button>
      </form>
    </section>
  </main>
</Layout>
```

## Verificación
```bash
npm run check
npx vitest run
npm run build
# Servidor levantado, base sembrada, sesión en /tmp/pc.txt. Planificar dos recetas que comparten cebolla (Tarta=8, Guiso=9):
curl -s -b /tmp/pc.txt -X PUT -H 'Content-Type: application/json' -d '{"recipeId":8}' http://localhost:4321/api/plan/2026-10-12/0/cena
curl -s -b /tmp/pc.txt -X PUT -H 'Content-Type: application/json' -d '{"recipeId":9}' http://localhost:4321/api/plan/2026-10-12/1/cena
# Consolidación (por API): una sola línea de cebolla, con 1 + 1 = 2 unidades
curl -s -b /tmp/pc.txt 'http://localhost:4321/api/shopping-list?week=2026-10-12' | grep -o '"key":"cebolla|unidad","name":"Cebolla","qty":2,' | wc -l   # 1
# La página muestra un solo checkbox para la cebolla
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/lista?semana=2026-10-12' | grep -o 'data-key="cebolla|unidad"' | wc -l   # 1
curl -s -i -b /tmp/pc.txt -X POST -H 'Origin: http://localhost:4321' \
  -d 'action=add&name=Detergente&qty=1&unit=unidad&aisle=Otros' 'http://localhost:4321/app/lista?semana=2026-10-12' | grep -iE '^(HTTP|location)'
# → 303 y location: /app/lista?semana=2026-10-12#agregar
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/lista?semana=2026-10-12' | grep -o '· agregado' | wc -l   # 1
curl -s -i -b /tmp/pc.txt -X POST -H 'Origin: http://localhost:4321' \
  -d 'action=add&name=X&qty=1&unit=&aisle=Otros' 'http://localhost:4321/app/lista?semana=2026-10-12' | grep -E '^HTTP|La cantidad y la unidad van juntas'
# → 400 y el mensaje
```
Manual: la página se ve bien a 360 px (una columna), 768 px (dos) y 1280 px (tres), sin scroll horizontal; agregar y quitar
ítems funciona **con JS desactivado**.

## Hecho cuando
- [ ] Los `curl` dan lo indicado, el build pasa y la revisión manual sale bien.

## Commit
`feat(shopping-list): SL-10 página de la lista de compras`
