# RC-13 · Página `/app/recetas/[id]`: ver, editar y borrar

- **Módulo:** recipes · **Depende de:** RC-08, RC-10, RC-12 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-recipes.md` líneas 47–53 (catálogo de solo lectura, borrado lógico) y 89–93 (UI).
- `src/components/RecipeForm.astro` (RC-12) y `src/lib/format.ts` (RC-10).

## Archivos
- Crear: `src/pages/app/recetas/[id].astro`

## Contrato
Frontmatter (copiar tal cual):
```astro
---
import Layout from '@/layouts/Layout.astro';
import RecipeForm from '@/components/RecipeForm.astro';
import { getDb } from '@/lib/db';
import { formatAmount } from '@/lib/format';
import { CATEGORY_LABELS, getRecipe } from '@/services/recipes';

const id = Number(Astro.params.id);
const recipe = Number.isInteger(id) && id > 0 ? getRecipe(getDb(), Astro.locals.user!.id, id) : null;
if (!recipe) Astro.response.status = 404;
const title = recipe ? `${recipe.title} · PlaniComida` : 'Receta no encontrada · PlaniComida';
---
```
Tres estados en el markup, dentro de `<Layout {title}>` y `<main class="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">`,
siempre con `<a href="/app/recetas" class="link text-small">Volver a recetas</a>` arriba:

1. **No existe** (`!recipe`): `<h1>` "No encontramos esa receta" (mismas clases de título que el resto) y el link de volver.
2. **Catálogo** (`recipe.isCatalog`): solo lectura.
   - `<h1>` con `recipe.title`; debajo `<p class="text-small">` con `CATEGORY_LABELS[recipe.category]` · "Catálogo".
   - `<p class="mt-6 text-small text-muted">Cantidades para 1 persona. Si comen más, multiplicá por la cantidad de personas.</p>`
   - `<ul class="mt-4 space-y-2">` con un `<li class="flex justify-between gap-4 bg-surface px-4 py-3">` por ingrediente:
     `<span>{i.name}</span><span class="text-muted">{formatAmount(i.qty, i.unit)}</span>`.
   - `<p class="mt-6 text-small text-muted">Las recetas del catálogo no se pueden editar.</p>`
3. **Propia:** `<h1>` "Editar receta", `<RecipeForm recipe={recipe} />` y, debajo, una sección para borrar:
   ```astro
   <section class="mt-12 bg-surface p-5" aria-labelledby="borrar">
     <h2 id="borrar" class="font-medium">Borrar receta</h2>
     <p class="mt-1 text-small">Va a seguir apareciendo en las semanas donde ya la usaste.</p>
     <button type="button" id="delete-recipe" data-url={`/api/recipes/${recipe.id}`} class="link mt-3 min-h-11 font-medium text-danger">
       Borrar esta receta
     </button>
   </section>
   <script>
     const button = document.querySelector<HTMLButtonElement>('#delete-recipe');
     button?.addEventListener('click', async () => {
       if (!confirm('¿Borrar esta receta? Va a seguir apareciendo en las semanas donde ya la usaste.')) return;
       const res = await fetch(button.dataset.url!, { method: 'DELETE' });
       if (res.ok) location.href = '/app/recetas';
       else alert('No se pudo borrar la receta. Probá de nuevo.');
     });
   </script>
   ```
   (`text-danger` existe porque ID-13 agregó `--color-danger` al tema.)

## Verificación
```bash
npm run check
npx vitest run
npm run build
# Servidor levantado, base sembrada, sesión en /tmp/pc.txt:
curl -s -b /tmp/pc.txt http://localhost:4321/app/recetas/1 | grep -c 'no se pueden editar'                  # 1 (catálogo)
curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/pc.txt http://localhost:4321/app/recetas/99999          # 404
curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/pc.txt http://localhost:4321/app/recetas/abc            # 404
```
Prueba manual (360 px y 1280 px): abrir una receta propia (la de RC-12), cambiarle un ingrediente y guardar → la página
recarga con el cambio; borrarla → vuelve al listado y ya no aparece.

## Hecho cuando
- [ ] Los `curl` dan lo indicado, la prueba manual sale bien y el build pasa.

## Commit
`feat(recipes): RC-13 página de detalle, edición y borrado de recetas`
