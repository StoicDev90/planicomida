# PL-11 · Diálogo `SlotPicker`: asignar receta, comida libre o quitar

- **Módulo:** planner · **Depende de:** PL-07, PL-10 (y RC-07 para `GET /api/recipes`) · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-planner.md` líneas 85–88 (selector: hoja inferior en el celular, diálogo en la PC, buscador filtrado por
  la categoría del turno con "Ver todas", comida libre, quitar; actualiza la tarjeta sin recargar) y 107 (teclado).
- `src/components/MealSlot.astro` (atributos `data-*`).

## Archivos
- Crear: `src/components/SlotPicker.astro`
- Modificar: `src/pages/app/planner.astro` (importar el componente y reemplazar el comentario `<!-- PL-11 … -->` por `<SlotPicker />`)

## Contrato — `src/components/SlotPicker.astro` (copiar tal cual)
```astro
<dialog id="slot-picker" aria-labelledby="picker-title" class="picker m-auto w-full max-w-lg bg-paper p-0 text-ink backdrop:bg-black/50">
  <div class="flex max-h-[85dvh] flex-col">
    <header class="flex items-start justify-between gap-4 p-5">
      <h2 id="picker-title" class="text-lead font-medium">Elegí una comida</h2>
      <button type="button" data-close class="min-h-11 min-w-11 bg-surface" aria-label="Cerrar">×</button>
    </header>

    <div class="space-y-2 px-5">
      <label for="picker-search" class="label">Buscar receta</label>
      <input id="picker-search" type="search" class="input" autocomplete="off" />
      <label class="flex min-h-11 items-center gap-2 text-small">
        <input type="checkbox" data-all class="size-5 accent-accent" /> Ver todas las categorías
      </label>
    </div>

    <ul data-results class="mt-2 min-h-24 flex-1 space-y-1 overflow-y-auto px-5" aria-live="polite"></ul>

    <form data-custom class="mt-4 space-y-2 bg-surface p-5">
      <label for="picker-custom" class="label">O escribí una comida libre</label>
      <div class="flex gap-2">
        <input id="picker-custom" class="input bg-paper" maxlength="80" placeholder="Delivery, Sobras…" />
        <button type="submit" class="btn">Guardar</button>
      </div>
    </form>

    <footer class="flex flex-wrap items-center justify-between gap-4 p-5">
      <button type="button" data-clear class="link min-h-11 font-medium text-danger">Quitar</button>
      <p data-picker-error role="alert" class="field-error" hidden></p>
    </footer>
  </div>
</dialog>

<style>
  /* Lo único que flota en la app: lleva sombra. */
  .picker {
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.25);
  }
  /* En el celular, hoja inferior a todo el ancho. */
  @media (max-width: 767px) {
    .picker {
      margin: auto 0 0;
      max-width: none;
    }
  }
</style>

<script>
  import { normalizeText } from '@/lib/text';

  interface RecipeOption {
    id: number;
    title: string;
  }
  interface Current {
    button: HTMLButtonElement;
    week: string;
    day: string;
    meal: string;
  }

  const dialog = document.querySelector<HTMLDialogElement>('#slot-picker')!;
  const title = dialog.querySelector<HTMLElement>('#picker-title')!;
  const search = dialog.querySelector<HTMLInputElement>('#picker-search')!;
  const all = dialog.querySelector<HTMLInputElement>('[data-all]')!;
  const results = dialog.querySelector<HTMLUListElement>('[data-results]')!;
  const customForm = dialog.querySelector<HTMLFormElement>('[data-custom]')!;
  const customInput = dialog.querySelector<HTMLInputElement>('#picker-custom')!;
  const error = dialog.querySelector<HTMLElement>('[data-picker-error]')!;

  let current: Current | null = null;
  let recipes: RecipeOption[] = [];

  const endpoint = (c: Current) => `/api/plan/${c.week}/${c.day}/${c.meal}`;

  function showError(message: string) {
    error.textContent = message;
    error.hidden = false;
  }

  function renderResults() {
    const q = normalizeText(search.value);
    const items = recipes.filter((r) => normalizeText(r.title).includes(q));
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'py-3 text-small text-muted';
      li.textContent = 'No hay recetas con ese nombre.';
      results.replaceChildren(li);
      return;
    }
    results.replaceChildren(
      ...items.map((r) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.recipeId = String(r.id);
        button.className = 'min-h-11 w-full bg-surface px-3 py-2 text-left hover:bg-ink hover:text-paper';
        button.textContent = r.title;
        li.append(button);
        return li;
      }),
    );
  }

  async function loadRecipes() {
    if (!current) return;
    const url = all.checked ? '/api/recipes' : `/api/recipes?category=${current.meal}`;
    const res = await fetch(url);
    recipes = res.ok ? (await res.json()).recipes : [];
    renderResults();
  }

  function setLabel(text: string, filled: boolean) {
    const label = current?.button.querySelector<HTMLElement>('[data-slot-label]');
    if (!label) return;
    label.textContent = text;
    label.classList.toggle('text-muted', !filled);
  }

  async function save(body: { recipeId: number } | { customMealName: string }) {
    if (!current) return;
    const res = await fetch(endpoint(current), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      showError(data?.error?.message ?? 'No se pudo guardar. Probá de nuevo.');
      return;
    }
    const entry = await res.json();
    setLabel(entry.recipe ? entry.recipe.title : entry.customMealName, true);
    dialog.close();
  }

  async function clear() {
    if (!current) return;
    const res = await fetch(endpoint(current), { method: 'DELETE' });
    if (!res.ok) return showError('No se pudo quitar. Probá de nuevo.');
    setLabel('Agregar', false);
    dialog.close();
  }

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
    if (!button) return;
    const { week, day, meal, dayLabel, mealLabel } = button.dataset;
    current = { button, week: week!, day: day!, meal: meal! };
    title.textContent = `${dayLabel} · ${mealLabel}`;
    search.value = '';
    customInput.value = '';
    all.checked = false;
    error.hidden = true;
    results.replaceChildren();
    dialog.showModal();
    search.focus();
    loadRecipes();
  });

  results.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-recipe-id]');
    if (button) save({ recipeId: Number(button.dataset.recipeId) });
  });
  search.addEventListener('input', renderResults);
  all.addEventListener('change', loadRecipes);
  customForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (customInput.value.trim()) save({ customMealName: customInput.value });
  });
  dialog.querySelector('[data-clear]')!.addEventListener('click', clear);
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  // Click en el fondo oscuro cierra.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
</script>
```

## Verificación
```bash
npm run check
npx vitest run
npm run build
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner' | grep -c 'id="slot-picker"'   # 1
```
Prueba manual (obligatoria) con la base sembrada, a 360 px y a 1280 px:
1. Tocar "Agregar" en un almuerzo → se abre el diálogo (abajo en el celular, centrado en la PC) con las recetas de almuerzo.
2. Buscar "pollo" filtra; tildar "Ver todas" muestra todas.
3. Elegir una receta → se cierra y la tarjeta muestra el título **sin recargar** la página. Recargar → sigue ahí.
4. Comida libre "Delivery" → la tarjeta muestra "Delivery".
5. "Quitar" → la tarjeta vuelve a "Agregar".
6. Con teclado: Tab hasta un turno, Enter abre, Tab recorre, Esc cierra y el foco vuelve al turno.

## Hecho cuando
- [ ] `check`, tests y build en verde y las 6 pruebas manuales salen bien.

## Commit
`feat(planner): PL-11 diálogo para asignar o quitar comidas`
