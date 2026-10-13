# RC-14 · Checkpoint del módulo recipes

- **Módulo:** recipes · **Depende de:** RC-01 … RC-13 · **Modelo sugerido:** el más capaz disponible

## Leé antes
- `.specs/SPEC-recipes.md` completo y `.plans/02-recipes/PLAN.md`.

## Archivos
- Modificar: `.specs/SPEC-recipes.md` (tildar `[x]` los Success Criteria verificados)
- Modificar: `.plans/02-recipes/PLAN.md` (Estado → `TERMINADO (<fecha>)`)
- Modificar: `.plans/README.md` (fila de recipes → `Terminado`)

## Pasos
1. `npx vitest run --coverage`, `npm run check`, `npm run build`. Cobertura ≥ 80 % de líneas en `src/services/recipes.ts`.
2. Contrato para otros módulos: confirmar que `src/services/recipes.ts` exporta `getRecipe`, `canAssignRecipe`,
   `AISLES`, `UNITS`, `CATEGORIES`, `CATEGORY_LABELS` y los tipos `Recipe`, `Ingredient`, `Aisle`, `Unit`, `Category`
   (`grep -n "^export" src/services/recipes.ts`).
3. Recorrer los Success Criteria de `SPEC-recipes.md` (líneas 96–102) y anotar qué test o comando prueba cada uno.
4. `npm run db:reset`, reiniciar el servidor y hacer la prueba manual completa a 360 px y 1280 px:
   listado y filtros, ver una receta del catálogo, crear, editar y borrar una propia. Revisar que el aviso
   "Cantidades para 1 persona" se vea en el formulario y en el detalle.
5. Seed después de tener recetas propias: correr `npm run db:seed` de nuevo → no duplica ni pisa nada.

## Hecho cuando
- [ ] Todo en verde y los Success Criteria tildados con su prueba (o reportados si alguno falla).

## Commit
`docs(recipes): RC-14 checkpoint del módulo recipes`
