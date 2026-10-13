# PL-12 · Copiar semana desde la página y link a la lista

- **Módulo:** planner · **Depende de:** PL-05, PL-11 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 49–54 y 89–90.
- `src/pages/app/planner.astro` (completo).

## Archivos
- Modificar: `src/pages/app/planner.astro`

## Contrato
1. **Frontmatter:** agregar `copyWeek` al import de `@/services/plan`, y justo después de `const user = …`, este bloque
   (procesa el formulario sin JS y redirige con el resultado):
```ts
if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData();
  const target = String(form.get('week') ?? '');
  const source = String(form.get('source') ?? '');
  if (!isWeekStart(target)) return Astro.redirect('/app/planner', 303);
  if (!isWeekStart(source) || source === target) return Astro.redirect(`/app/planner?semana=${target}`, 303);
  const { copied, skipped } = copyWeek(getDb(), user.id, target, source);
  return Astro.redirect(`/app/planner?semana=${target}&copiadas=${copied}&omitidas=${skipped}`, 303);
}
```
   Y al final del frontmatter, el mensaje:
```ts
const copiedParam = Astro.url.searchParams.get('copiadas');
const skippedCount = Number(Astro.url.searchParams.get('omitidas') ?? 0);
let copyMessage = '';
if (copiedParam !== null) {
  const n = Number(copiedParam);
  copyMessage = n === 1 ? 'Se copió 1 comida' : `Se copiaron ${n} comidas`;
  if (skippedCount === 1) copyMessage += ' · 1 receta borrada no se copió';
  if (skippedCount > 1) copyMessage += ` · ${skippedCount} recetas borradas no se copiaron`;
}
```
2. **Markup:** reemplazar el comentario `<!-- PL-12 … -->` por:
```astro
<div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
  <form method="post">
    <input type="hidden" name="week" value={week} />
    <input type="hidden" name="source" value={plan.prevWeek} />
    <button type="submit" class="link min-h-11 font-medium">Copiar semana anterior</button>
  </form>
  <a href={`/app/lista?semana=${week}`} class="link inline-flex min-h-11 items-center font-medium">Ver lista de compras</a>
</div>
{copyMessage && <p role="status" class="mt-4 bg-surface px-4 py-3">{copyMessage}</p>}
```

## Verificación
```bash
npm run check
npm run build
# Servidor levantado, sesión en /tmp/pc.txt. Cargar algo en la semana 2026-10-05 por API:
curl -s -b /tmp/pc.txt -X PUT -H 'Content-Type: application/json' -d '{"customMealName":"Pizza"}' \
  http://localhost:4321/api/plan/2026-10-05/4/cena
curl -s -i -b /tmp/pc.txt -X POST -H 'Origin: http://localhost:4321' \
  -d 'week=2026-10-12&source=2026-10-05' http://localhost:4321/app/planner | grep -iE '^(HTTP|location)'
# → 303 y location: /app/planner?semana=2026-10-12&copiadas=1&omitidas=0   (o copiadas=0 si ya estaba)
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner?semana=2026-10-12&copiadas=3&omitidas=1' | grep -c 'Se copiaron 3 comidas · 1 receta borrada no se copió'   # 1
curl -s -b /tmp/pc.txt 'http://localhost:4321/app/planner?semana=2026-10-12' | grep -c 'href="/app/lista?semana=2026-10-12"'   # 1
```

## Hecho cuando
- [ ] Los `curl` dan lo indicado; en el navegador, "Copiar semana anterior" funciona también con JS desactivado.

## Commit
`feat(planner): PL-12 copiar la semana anterior desde el planner`
