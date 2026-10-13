# Capability Map: PlaniComida

> Estado: **APROBADA (2026-10-13).** Este mapa es el índice de las specs.
> Ninguna spec de módulo se implementa hasta que el mapa y esa spec estén aprobados.

PlaniComida es una app web responsive (funciona igual de bien en el navegador del celular y en el de la PC; en español rioplatense) para planificar
las comidas de cada semana (desayuno, almuerzo, snack y cena) y generar la lista del súper consolidada y agrupada por góndola.

| Module id       | Responsabilidad                                                                 | Depende de                 | Spec                    |
|-----------------|---------------------------------------------------------------------------------|----------------------------|-------------------------|
| `core`          | App Astro, conexión SQLite + migraciones, layout, helpers HTTP, setup de tests   | —                          | `SPEC-core.md`          |
| `identity`      | Registro, login, logout, sesiones por cookie, protección de rutas               | core                       | `SPEC-identity.md`      |
| `recipes`       | Catálogo de recetas semilla (solo lectura) + recetas propias (CRUD) con ingredientes | core, identity         | `SPEC-recipes.md`       |
| `planner`       | Plan por semana (lunes–domingo × 4 turnos), historial, navegación, copiar semana | core, identity, recipes  | `SPEC-planner.md`       |
| `shopping-list` | Consolidación de ingredientes de una semana, ítems manuales, agrupado por góndola, checklist | core, identity, planner, recipes | `SPEC-shopping-list.md` |

**Orden de construcción:** `core` → `identity` → `recipes` → `planner` → `shopping-list`

## Reglas del mapa
- Los ids de módulo son estables: no se renombran durante la iniciativa.
- Las dependencias van en un solo sentido (sin ciclos).
- El contrato entre módulos vive en la spec del módulo **proveedor**
  (ej.: `planner` consume `getRecipe()` definido en `SPEC-recipes.md`).
- Las decisiones transversales (stack, comandos, estilo, tests, límites) viven en `SPEC-core.md`
  y aplican a todos los módulos.

## Flujo por módulo
Specify → Plan → Tasks → Implement. Los planes y tareas de cada módulo se guardan en
`.plans/<module-id>.md` una vez aprobada su spec.

## Registro de decisiones
| Fecha | Decisión | Afecta |
|-------|----------|--------|
| 2026-10-13 | Varios usuarios con login (email + contraseña). Sin planes compartidos: todo es por usuario | identity, todos |
| 2026-10-13 | Historial por semana (`week_start` = lunes) | planner, shopping-list |
| 2026-10-13 | Una sola app Astro con endpoints de API; se descarta Express | core |
| 2026-10-13 | Recetas de catálogo (solo lectura) + recetas propias (CRUD) | recipes |
| 2026-10-13 | Turnos del plan: desayuno, almuerzo, snack y cena (mismos valores que las categorías de receta) | planner, recipes |
| 2026-10-13 | Ítems manuales en la lista de compras desde v1 | shopping-list |
| 2026-10-13 | Las cantidades de las recetas son para 1 persona; la app no escala por comensales, solo lo avisa | recipes, shopping-list |
| 2026-10-13 | v1 corre solo local con `npm run dev`; el deploy al VPS (nginx u otro) se especifica más adelante | core |
| 2026-10-13 | Sin backups en v1 | core |
| 2026-10-13 | Copiar semana en v1: solo llena turnos vacíos y saltea recetas borradas | planner |
| 2026-10-13 | Fuera de v1: recuperar contraseña, duplicar recetas del catálogo, sincronizar el tachado, plurales/sinónimos, E2E con navegador | identity, recipes, shopping-list, core |
| 2026-10-13 | Defaults aceptados: la semana empieza el lunes; rate limit del login en memoria; el tachado en `localStorage`; editar una receta afecta semanas pasadas | planner, identity, shopping-list, recipes |
| 2026-10-13 | Una migración por módulo (no hay una `001_init.sql` única); Node ≥ 22.12 / Astro 7 | core |
| 2026-10-13 | App web responsive: celular **y** PC son plataformas de primera clase (360 px a ≥ 1280 px). No es PWA ni app nativa en v1 | core, todos |
