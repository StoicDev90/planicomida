# SL-12 · Checkpoint del módulo shopping-list y de la v1

- **Módulo:** shopping-list (cierre de la v1) · **Depende de:** SL-01 … SL-11 · **Modelo sugerido:** el más capaz disponible

## Leé antes
- `.specs/SPEC-shopping-list.md` completo, `.specs/SPEC-core.md` líneas 165–193 (requisitos no funcionales y Success Criteria)
  y `.plans/04-shopping-list/PLAN.md`.

## Archivos
- Modificar: `.specs/SPEC-shopping-list.md` (tildar `[x]` los Success Criteria verificados)
- Modificar: `.plans/04-shopping-list/PLAN.md` (Estado → `TERMINADO (<fecha>)`)
- Modificar: `.plans/README.md` (fila de shopping-list → `Terminado`)

## Pasos
1. `npx vitest run --coverage`, `npm run check`, `npm run build`.
   - `src/services/shopping-list.ts`: **100 % de ramas** (Success Criterion de la spec).
   - `src/services/` y `src/lib/` completos: ≥ 80 % de líneas.
2. Recorrer los Success Criteria de `SPEC-shopping-list.md` (líneas 116–132) con su test o comando.
3. **Recorrido de punta a punta de la v1** con `npm run db:reset`, servidor reiniciado y una cuenta nueva,
   una vez a 360 px y otra a 1280 px:
   registro → crear una receta propia que comparta un ingrediente con el catálogo → planificar la semana (incluida esa receta
   y una comida libre) → copiar la semana a la siguiente → abrir la lista → verificar que el ingrediente compartido aparece una
   vez y sumado → agregar "Detergente" → tachar en el celular → compartir → salir.
4. Lighthouse sobre el build de producción (`npm run build`, después `PORT=4399 node dist/server/entry.mjs`, y en otra terminal
   `npx lighthouse http://localhost:4399/app/lista …` con la cookie de sesión, o desde DevTools del navegador logueado):
   Performance y Accessibility ≥ 90 en mobile y desktop para `/app/planner` y `/app/lista` (requisito de `SPEC-core.md`).
   Cerrar el servidor con `fuser -k 4399/tcp` (no usar `pkill -f` con un patrón que aparezca en el propio comando).
5. Revisar que ninguna pantalla tenga scroll horizontal entre 360 y 1920 px.

## Hecho cuando
- [ ] Todo en verde; Success Criteria tildados con su prueba; recorrido completo hecho en los dos anchos; Lighthouse anotado.
- [ ] Reporte final con lo que quedó fuera o falló, para decidir si se arregla antes de dar por cerrada la v1.

## Commit
`docs(shopping-list): SL-12 checkpoint del módulo y cierre de la v1`
