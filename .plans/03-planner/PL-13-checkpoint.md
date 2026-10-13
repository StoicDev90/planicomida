# PL-13 · Checkpoint del módulo planner

- **Módulo:** planner · **Depende de:** PL-01 … PL-12 · **Modelo sugerido:** el más capaz disponible

## Leé antes
- `.specs/SPEC-planner.md` completo y `.plans/03-planner/PLAN.md`.

## Archivos
- Modificar: `.specs/SPEC-planner.md` (tildar `[x]` los Success Criteria verificados)
- Modificar: `.plans/03-planner/PLAN.md` (Estado → `TERMINADO (<fecha>)`)
- Modificar: `.plans/README.md` (fila de planner → `Terminado`)

## Pasos
1. `npx vitest run --coverage`, `npm run check`, `npm run build`. Cobertura ≥ 80 % en `src/services/plan.ts` y 100 % de
   ramas en `src/lib/week-view.ts`.
2. Contrato para shopping-list: `getRecipeIdsForWeek` exportado y con test de orden y repeticiones (PL-03, caso 7).
3. Recorrer los Success Criteria de `SPEC-planner.md` (líneas 93–107) y anotar el test o comando de cada uno.
4. Prueba manual cronometrada (Success Criterion de 2 minutos), con `npm run db:reset` y una cuenta nueva:
   planificar los 7 almuerzos y las 7 cenas con recetas del catálogo, **una vez a 360 px y otra a 1280 px**.
   Anotar los tiempos. Si alguno pasa de 2 minutos, reportarlo con qué demoró.
5. Teclado en la PC: recorrer toda la grilla con Tab, abrir con Enter, elegir con Enter, cerrar con Esc.
6. Revisar también a 1024 px: la grilla de 7 columnas sin scroll horizontal y los títulos largos partidos en renglones.

## Hecho cuando
- [ ] Todo en verde, Success Criteria tildados con su prueba y los tiempos de la prueba manual anotados en el reporte.

## Commit
`docs(planner): PL-13 checkpoint del módulo planner`
