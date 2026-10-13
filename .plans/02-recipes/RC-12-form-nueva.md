# RC-12 · Componente `RecipeForm` y página `/app/recetas/nueva`

- **Módulo:** recipes · **Depende de:** RC-07, RC-11 (y ID-13 por las clases `.label`, `.input`, `.field-error`) · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-recipes.md` líneas 49–50 (1–30 ingredientes, aviso "para 1 persona") y 89–93 (UI).
- `src/lib/recipe-form.ts` (RC-11) y `.plans/README.md` → "Guía visual".

## Archivos
- Crear: `src/components/RecipeForm.astro`
- Crear: `src/pages/app/recetas/nueva.astro`

## Contrato

### `src/pages/app/recetas/nueva.astro` (copiar tal cual)
```astro
---
import Layout from '@/layouts/Layout.astro';
import RecipeForm from '@/components/RecipeForm.astro';
---

<Layout title="Nueva receta · PlaniComida">
  <main class="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
    <a href="/app/recetas" class="link text-small">Volver a recetas</a>
    <h1 class="mt-4 font-display text-head leading-[0.95] uppercase">Nueva receta</h1>
    <RecipeForm />
  </main>
</Layout>
```

### `src/components/RecipeForm.astro`
Props y frontmatter (copiar tal cual):
```astro
---
import { AISLES, CATEGORIES, CATEGORY_LABELS, UNITS, type Recipe } from '@/services/recipes';

interface Props {
  /** Sin receta = alta (POST /api/recipes). Con receta = edición (PUT /api/recipes/:id). */
  recipe?: Recipe;
}
const { recipe } = Astro.props;
const method = recipe ? 'PUT' : 'POST';
const url = recipe ? `/api/recipes/${recipe.id}` : '/api/recipes';
const rows = recipe?.ingredients ?? [{ name: '', qty: null, unit: 'unidad', aisle: 'Verdulería' }];
---
```
Markup — estructura obligatoria (ids, `name` y atributos `data-*` exactos; el script depende de ellos):
```astro
<form id="recipe-form" data-method={method} data-url={url} class="mt-8 space-y-6" novalidate>
  <p data-error="general" role="alert" class="field-error text-body" hidden></p>

  <div>
    <label for="title" class="label">Título</label>
    <input id="title" name="title" class="input" maxlength="80" required value={recipe?.title ?? ''} />
    <p data-error="title" class="field-error" hidden></p>
  </div>

  <div>
    <label for="category" class="label">Categoría</label>
    <select id="category" name="category" class="input">
      {CATEGORIES.map((c) => <option value={c} selected={recipe?.category === c}>{CATEGORY_LABELS[c]}</option>)}
    </select>
  </div>

  <fieldset>
    <legend class="label">Ingredientes</legend>
    <p class="text-small text-muted">Cantidades para 1 persona. Si comen más, multiplicá por la cantidad de personas.</p>
    <ol data-rows class="mt-4 space-y-4">
      {rows.map((row) => (
        <li data-row class="grid grid-cols-2 gap-2 bg-surface p-3 md:grid-cols-[1fr_5.5rem_7rem_9.5rem_auto] md:items-start">
          <input name="name" aria-label="Ingrediente" placeholder="Ingrediente" class="input col-span-2 bg-paper md:col-span-1" maxlength="60" value={row.name} />
          <input name="qty" aria-label="Cantidad" placeholder="Cant." inputmode="decimal" class="input bg-paper" value={row.qty === null ? '' : String(row.qty).replace('.', ',')} disabled={row.unit === 'a gusto'} />
          <select name="unit" aria-label="Unidad" class="input bg-paper">
            {UNITS.map((u) => <option value={u} selected={row.unit === u}>{u}</option>)}
          </select>
          <select name="aisle" aria-label="Góndola" class="input col-span-2 bg-paper md:col-span-1">
            {AISLES.map((a) => <option value={a} selected={row.aisle === a}>{a}</option>)}
          </select>
          <div class="col-span-2 flex gap-1 md:col-span-1">
            <button type="button" data-action="up" class="min-h-11 min-w-11 bg-paper" aria-label="Subir">↑</button>
            <button type="button" data-action="down" class="min-h-11 min-w-11 bg-paper" aria-label="Bajar">↓</button>
            <button type="button" data-action="remove" class="min-h-11 min-w-11 bg-paper" aria-label="Quitar">×</button>
          </div>
          <p data-row-error class="field-error col-span-2 md:col-span-5" hidden></p>
        </li>
      ))}
    </ol>
    <p data-error="ingredients" class="field-error" hidden></p>
    <button type="button" data-action="add" class="link mt-4 min-h-11 font-medium">Agregar ingrediente</button>
  </fieldset>

  <button type="submit" class="btn">Guardar receta</button>
</form>
```
Script (copiar tal cual al final del componente):
```astro
<script>
  import { splitFieldErrors, toRecipeInput, type IngredientRowValues } from '@/lib/recipe-form';

  const form = document.querySelector<HTMLFormElement>('#recipe-form')!;
  const list = form.querySelector<HTMLOListElement>('[data-rows]')!;
  const MAX_ROWS = 30;

  const rowsEls = () => [...list.querySelectorAll<HTMLLIElement>('[data-row]')];
  const field = (row: Element, name: string) =>
    row.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;

  function syncQty(row: Element) {
    const qty = field(row, 'qty') as HTMLInputElement;
    const aGusto = field(row, 'unit').value === 'a gusto';
    qty.disabled = aGusto;
    if (aGusto) qty.value = '';
  }

  function readRows(): IngredientRowValues[] {
    return rowsEls().map((row) => ({
      name: field(row, 'name').value,
      qty: field(row, 'qty').value,
      unit: field(row, 'unit').value,
      aisle: field(row, 'aisle').value,
    }));
  }

  function clearErrors() {
    form.querySelectorAll<HTMLElement>('[data-error], [data-row-error]').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
  }

  function showError(el: HTMLElement | null, message: string) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.getAttribute('name') === 'unit') syncQty(target.closest('[data-row]')!);
  });

  form.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!button) return;
    const row = button.closest('[data-row]');
    const action = button.dataset.action;
    if (action === 'add' && rowsEls().length < MAX_ROWS) {
      const copy = rowsEls().at(-1)!.cloneNode(true) as HTMLLIElement;
      copy.querySelectorAll<HTMLInputElement>('input').forEach((input) => (input.value = ''));
      field(copy, 'unit').value = 'unidad';
      copy.querySelector<HTMLElement>('[data-row-error]')!.hidden = true;
      syncQty(copy);
      list.append(copy);
      field(copy, 'name').focus();
    }
    if (action === 'remove' && row && rowsEls().length > 1) row.remove();
    if (action === 'up' && row?.previousElementSibling) row.previousElementSibling.before(row);
    if (action === 'down' && row?.nextElementSibling) row.nextElementSibling.after(row);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    const body = toRecipeInput({
      title: field(form, 'title').value,
      category: field(form, 'category').value,
      rows: readRows(),
    });
    const res = await fetch(form.dataset.url!, {
      method: form.dataset.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const recipe = await res.json();
      location.href = `/app/recetas/${recipe.id}`;
      return;
    }
    const data = await res.json().catch(() => null);
    const general = form.querySelector<HTMLElement>('[data-error="general"]');
    if (res.status === 400 && data?.error?.fields) {
      const { form: formErrors, rows } = splitFieldErrors(data.error.fields);
      for (const [key, message] of Object.entries(formErrors)) {
        showError(form.querySelector<HTMLElement>(`[data-error="${key}"]`), message);
      }
      rowsEls().forEach((row, i) => {
        if (rows[i]) showError(row.querySelector('[data-row-error]'), Object.values(rows[i]).join(' · '));
      });
      showError(general, 'Revisá los datos marcados.');
    } else {
      showError(general, data?.error?.message ?? 'Ocurrió un error inesperado. Probá de nuevo.');
    }
  });
</script>
```

## Verificación
```bash
npm run check
npx vitest run
npm run build
# Servidor levantado y sesión en /tmp/pc.txt:
curl -s -b /tmp/pc.txt http://localhost:4321/app/recetas/nueva | grep -c 'id="recipe-form"'   # 1
```
Prueba manual en el navegador (obligatoria, a 360 px y a 1280 px):
1. Crear "Prueba" (almuerzo) con 3 ingredientes, uno "a gusto" → al guardar lleva a `/app/recetas/<id>` (puede dar 404 hasta RC-13; lo que importa es que la URL tenga el id nuevo y que `curl -b /tmp/pc.txt localhost:4321/api/recipes?mine=1` la muestre).
2. Elegir unidad "a gusto" deshabilita la cantidad.
3. Subir, bajar, quitar y agregar filas; el orden guardado es el que se ve.
4. Guardar con título vacío y una fila sin cantidad → aparecen los errores en el título y en esa fila.
5. Sin scroll horizontal en ningún ancho; todo se puede hacer con Tab, Enter y Espacio.

## Hecho cuando
- [ ] `check`, tests y build en verde; las 5 pruebas manuales salen bien.

## Commit
`feat(recipes): RC-12 formulario de receta con filas dinámicas y página nueva`
