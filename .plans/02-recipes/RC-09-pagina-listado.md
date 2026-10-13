# RC-09 · Página `/app/recetas` (listado con filtros)

- **Módulo:** recipes · **Depende de:** RC-04, RC-06 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-recipes.md` líneas 89–93 (UI).
- `.plans/README.md` → "Guía visual para pantallas de la app".

## Archivos
- Crear: `src/components/RecipeCard.astro`
- Crear: `src/pages/app/recetas/index.astro`

## Contrato

### `src/components/RecipeCard.astro` (copiar tal cual)
```astro
---
import { CATEGORY_LABELS, type RecipeSummary } from '@/services/recipes';

interface Props {
  recipe: RecipeSummary;
}
const { recipe } = Astro.props;
---

<a
  href={`/app/recetas/${recipe.id}`}
  class="block min-h-11 bg-surface p-5 transition-colors hover:bg-ink hover:text-paper"
>
  <span class="block text-lead leading-snug font-medium">{recipe.title}</span>
  <span class="mt-2 block text-small">
    {CATEGORY_LABELS[recipe.category]} · {recipe.ingredientCount}
    {recipe.ingredientCount === 1 ? 'ingrediente' : 'ingredientes'} · {recipe.isCatalog ? 'Catálogo' : 'Mía'}
  </span>
</a>
```

### `src/pages/app/recetas/index.astro`
Frontmatter (copiar tal cual):
```astro
---
import Layout from '@/layouts/Layout.astro';
import RecipeCard from '@/components/RecipeCard.astro';
import { getDb } from '@/lib/db';
import { CATEGORIES, CATEGORY_LABELS, listRecipes, RecipeListQuery } from '@/services/recipes';

const user = Astro.locals.user!;
const parsed = RecipeListQuery.safeParse(Object.fromEntries(Astro.url.searchParams));
const filters = parsed.success ? parsed.data : {};
const recipes = listRecipes(getDb(), user.id, {
  category: filters.category,
  q: filters.q,
  mine: filters.mine === '1',
});
---
```
Markup (estructura obligatoria; completar las opciones del `<select>` con `CATEGORIES` y `CATEGORY_LABELS`):
```astro
<Layout title="Recetas · PlaniComida">
  <main class="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="font-display text-head leading-[0.95] uppercase">Recetas</h1>
      <a href="/app/recetas/nueva" class="btn">Nueva receta</a>
    </div>

    <form method="get" class="mt-8 grid gap-4 md:grid-cols-[1fr_12rem_auto_auto] md:items-end" role="search">
      <div>
        <label for="q" class="label">Buscar</label>
        <input id="q" name="q" type="search" class="input" value={filters.q ?? ''} placeholder="Ej.: tarta" />
      </div>
      <div>
        <label for="category" class="label">Categoría</label>
        <select id="category" name="category" class="input">
          <option value="">Todas</option>
          <!-- una <option> por categoría, con selected={filters.category === c} -->
        </select>
      </div>
      <label class="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="mine" value="1" checked={filters.mine === '1'} class="size-5 accent-accent" />
        Solo las mías
      </label>
      <button type="submit" class="btn">Filtrar</button>
    </form>

    {
      recipes.length === 0 ? (
        <p class="mt-10">No hay recetas con esos filtros. <a href="/app/recetas" class="link">Ver todas</a></p>
      ) : (
        <ul class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (<li><RecipeCard recipe={recipe} /></li>))}
        </ul>
      )
    }
  </main>
</Layout>
```

## Verificación
```bash
npm run check
npx vitest run
# Servidor levantado, base sembrada, sesión en /tmp/pc.txt:
curl -s -b /tmp/pc.txt http://localhost:4321/app/recetas | grep -o 'href="/app/recetas/[0-9]*"' | wc -l      # 14
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/recetas?category=snack' | grep -o 'href="/app/recetas/[0-9]*"' | wc -l   # 3
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/recetas?q=TARTA' | grep -c 'Tarta de verdura'   # ≥ 1
npm run build
```
Manual: abrir `/app/recetas` en el navegador a 360 px (una columna) y a 1280 px (tres columnas), sin scroll horizontal.

## Hecho cuando
- [ ] Los `curl` dan 14, 3 y ≥ 1; `npm run build` pasa; la revisión manual en los dos anchos está bien.

## Commit
`feat(recipes): RC-09 página de listado de recetas con filtros`
