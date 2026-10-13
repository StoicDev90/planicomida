# Plan: core

> Spec: `.specs/SPEC-core.md` (aprobada 2026-10-13) · Estado: **APROBADO (2026-10-13) — en ejecución**
> Siguiente módulo después de este: `identity`.

## Alcance
Esqueleto de la app sobre el que se construyen los demás módulos:
- Proyecto Astro 7 en SSR con Tailwind 4.
- Conexión a SQLite con un runner de migraciones.
- Helpers HTTP con la forma de error común.
- Utilidades de semana.
- Layout responsive (celular y PC) y landing.
- Scripts de base de datos.
- Vitest configurado.

**No incluye:** tablas de dominio, login, ni páginas de `/app/**`. Eso lo agrega cada módulo.

## Versiones de referencia (npm, 2026-10-13)
`astro 7.3` · `@astrojs/node 11.1` · `@astrojs/check 0.9` · `tailwindcss` / `@tailwindcss/vite 4.3` · `better-sqlite3 13.0` ·
`vitest 5.0` · `@vitest/coverage-v8` · `prettier 3.9` + `prettier-plugin-astro 1.1` · `typescript`. Las versiones exactas quedan fijadas en `package-lock.json`.

## Componentes y dependencias
```
T1 scaffold ──┬── T2 vitest ──┬── T3 week.ts
              │               ├── T4 db.ts + migraciones ── T6 scripts db:seed / db:reset
              │               └── T5 http.ts + middleware de errores + /api/health
              └── T7 layout + landing
                                   ↓
                          T8 checkpoint final
```
- **Se pueden hacer en paralelo:** T3, T4 y T5 (después de T2); T7 (después de T1).
- **Orden en que los implemento** (uno por vez): T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8.

## Tareas

- [ ] **T1 — Scaffold del proyecto**
  - Qué: `package.json` con scripts (`dev`, `build`, `test`, `test:watch`, `check`, `format`, `db:seed`, `db:reset`) y `engines.node >=22.12`.
    `astro.config.mjs` con `output: 'server'`, `adapter: node({ mode: 'standalone' })` y `vite.plugins: [tailwindcss()]`.
    `tsconfig.json` que extiende `astro/tsconfigs/strict` y define el alias `@/*` → `src/*`. `src/styles/global.css` con `@import "tailwindcss"`.
    `.gitignore` (`node_modules`, `dist`, `data/`, `.env`, `.astro`), `.env.example` y `.prettierrc` con el plugin de Astro.
  - Acceptance: `npm run dev` responde 200 en `http://localhost:4321`, con una página temporal que usa una clase de Tailwind y se ve aplicada.
  - Verify: `npm run dev` + `curl -s -o /dev/null -w '%{http_code}' localhost:4321` → `200`; `npm run build` y `npm run check` sin errores.
  - Files: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/styles/global.css`, `.gitignore`, `.env.example`, `.prettierrc`

- [ ] **T2 — Setup de Vitest**
  - Qué: `vitest.config.ts` con `getViteConfig` de `astro/config` (así toma el alias `@/` y la config de Astro); `environment: 'node'`; cobertura v8.
    Un test humo `tests/smoke.test.ts`.
  - Acceptance: `npm test` corre y pasa; `npx vitest run --coverage` genera el reporte.
  - Verify: `npm test`
  - Files: `vitest.config.ts`, `tests/smoke.test.ts`, `package.json`

- [ ] **T3 — `src/lib/week.ts` (con TDD)**
  - Qué: funciones puras:
    - `weekStartOf(date: Date, timeZone = process.env.TZ ?? 'America/Argentina/Buenos_Aires'): string` (devuelve `YYYY-MM-DD` del lunes).
    - `addWeeks(weekStart, n): string`.
    - `isWeekStart(value): boolean` (fecha real con formato `YYYY-MM-DD` que cae en lunes).
    - `WeekStart`: esquema zod que usa `isWeekStart`.
    - `formatDayLabel(weekStart, day)`: devuelve "lun 13 oct" en `es-AR`.
  - Acceptance:
    - Domingo 18/10/2026 23:30 en Buenos Aires (02:30Z del lunes 19) → `2026-10-12`, porque se respeta la zona horaria.
    - Lunes → el mismo día.
    - `isWeekStart('2026-10-13')` es `false` (martes); `isWeekStart('2026-02-30')` y `'2026-1-5'` son `false`.
    - `addWeeks` cruza correctamente fin de mes y de año (`2026-12-28` + 1 → `2027-01-04`).
    - 100 % de ramas cubiertas.
  - Verify: `npx vitest run tests/lib/week.test.ts --coverage`
  - Files: `src/lib/week.ts`, `tests/lib/week.test.ts`

- [ ] **T4 — `src/lib/db.ts` + runner de migraciones**
  - Qué:
    - `openDb(path, migrationsDir = 'db/migrations')`: abre `better-sqlite3` y aplica los pragmas (`journal_mode = WAL` salvo en `:memory:`, `foreign_keys = ON`).
      Después corre las migraciones `NNN_*.sql` con número mayor que `user_version`, ordenadas y cada una en su propia transacción, y actualiza `user_version`.
    - Si la carpeta de `DATABASE_PATH` no existe, la crea.
    - Exporta un singleton `db` (abierto de forma perezosa con `DATABASE_PATH`, por defecto `./data/planicomida.db`) y `createTestDb()` (`:memory:` + migraciones reales).
    - Crea `db/migrations/` vacía (con `.gitkeep`); las migraciones las agrega cada módulo.
    - Sin imports con alias, para que `scripts/` lo pueda usar desde Node puro.
  - Acceptance (tests con una carpeta de migraciones de prueba `tests/fixtures/migrations/`):
    - Una base nueva aplica 001 y 002, y queda con `user_version = 2`.
    - Reabrir la base no reaplica nada.
    - Agregar 003 aplica solo la 003.
    - Una migración con SQL inválido hace rollback: `user_version` no cambia y se lanza un error que dice qué archivo falló.
    - `foreign_keys` queda en 1.
  - Verify: `npx vitest run tests/lib/db.test.ts`
  - Files: `src/lib/db.ts`, `db/migrations/.gitkeep`, `tests/lib/db.test.ts`, `tests/fixtures/migrations/*.sql`

- [ ] **T5 — `src/lib/http.ts`, middleware de errores y `/api/health`**
  - Qué:
    - `json(data, status = 200)` y `errorResponse(status, code, message, fields?)`.
    - `parseBody(request, schema)`, que devuelve `{ ok: true, data }` o `{ ok: false, response }`. Un JSON inválido o un body que no pasa zod da 400 `VALIDATION`, con `fields` sacados de los issues de zod.
    - `src/middleware.ts` con un `try/catch` alrededor de `next()`: si una excepción no se captura en `/api/**`, responde 500 `INTERNAL` con un mensaje genérico y loguea el error. `identity` lo va a extender después.
    - `GET /api/health` → `{ ok: true, schemaVersion }`, para confirmar que la base existe y migró. Queda público.
  - Acceptance: tests de `parseBody` (body válido, JSON roto, error de zod con `fields`).
    Un test que invoca el middleware con un `next` que lanza una excepción recibe 500 con la forma de error común y sin el stack.
    `/api/health` responde 200.
  - Verify: `npx vitest run tests/lib/http.test.ts tests/api/health.test.ts`; `curl localhost:4321/api/health`
  - Files: `src/lib/http.ts`, `src/middleware.ts`, `src/pages/api/health.ts`, `tests/lib/http.test.ts`, `tests/api/health.test.ts`

- [ ] **T6 — Scripts `db:seed` y `db:reset`**
  - Qué:
    - `scripts/seed.ts`: abre la base (con lo que migra) y ejecuta `db/seed.sql` si existe. Si no existe, avisa y termina con código 0. El contenido del seed lo agrega `recipes`.
    - `scripts/reset.ts`: borra el archivo `.db` (y sus `-wal` / `-shm`), migra y siembra. Se niega a correr si `NODE_ENV=production`.
    - Se ejecutan con `node scripts/x.ts` (Node 22.18+ entiende TypeScript sin compilar).
  - Acceptance: `npm run db:reset` deja la base con `user_version` igual a la cantidad de migraciones; correr `npm run db:seed` dos veces no falla.
  - Verify: correr los dos comandos y `curl localhost:4321/api/health`
  - Files: `scripts/seed.ts`, `scripts/reset.ts`, `package.json`

- [ ] **T7 — Layout y landing**
  - Qué:
    - `src/layouts/Layout.astro`: `<html lang="es-AR">`, meta viewport, título por página, estilos globales.
      Navegación responsive: barra inferior fija en el celular y barra superior en `md+`. Contenido en `max-w-6xl` centrado. Estados `hover` y `focus-visible`.
      Links: Planner · Recetas · Lista · Salir. La nav se muestra solo si hay `Astro.locals.user`, que antes de `identity` nunca existe.
    - `src/pages/index.astro` con `export const prerender = true`: landing que explica la app en 3 pasos (recetas → plan → lista) y tiene botones "Crear cuenta" e "Ingresar".
      Esos botones apuntan a `/registro` y `/login`, que va a crear `identity`.
  - Acceptance:
    - Sin scroll horizontal a 360, 768 y 1280 px; en la PC el contenido no se estira más allá de `max-w-6xl`.
    - Los objetivos táctiles miden ≥ 44 px.
    - Lighthouse ≥ 90 en Performance y en Accessibility para `/`, en modo mobile y en desktop.
    - La landing se diseña con la skill `design-taste-frontend`.
  - Verify: capturas a 360, 768 y 1280 px + Lighthouse en mobile y desktop; `npm run check`
  - Files: `src/layouts/Layout.astro`, `src/components/NavBar.astro`, `src/pages/index.astro`

- [ ] **T8 — Checkpoint final de `core`**
  - Acceptance: todos los Success Criteria de `SPEC-core.md`:
    - Borrar `node_modules` y `data/`, después `npm install && npm run dev` → crea la base y responde.
    - `npm test`, `npm run check` y `npm run build` sin errores.
    - Cobertura del 100 % de ramas en `week.ts`.
  - Verify: correr la secuencia completa y pegar la salida en el resumen.
  - Files: — (si aparece un ajuste, se corrige en la tarea correspondiente)

## Checkpoints con vos
- **Después de T1:** ves la página temporal con `npm run dev` y confirmas que el setup arranca en tu máquina.
- **Después de T8:** revisión del módulo completo antes de pasar a la spec y el plan de `identity`.

## Riesgos
| Riesgo | Mitigación |
|--------|------------|
| `better-sqlite3` es un módulo nativo: puede pedir compilar si no hay binario para tu Node/arquitectura | Se verifica en T1/T4. Si falla, hay que instalar `build-essential` y `python3`, o usar como alternativa `node:sqlite` (incluido en Node, sin dependencias). Cambiarlo requiere tu OK |
| TypeScript 7 (versión nueva) podría no ser compatible con `astro check` | Si `npm run check` falla por la versión, se fija `typescript@^5` |
| Astro 7 cambió APIs respecto de lo que conozco (middleware, `astro/zod`, `getViteConfig`) | Antes de T1 y T5 reviso la documentación oficial de Astro 7 y no asumo nada |
| La TZ del sistema y la de los tests difieren | `weekStartOf` recibe la zona horaria explícita; los tests la fijan |

## Preguntas para la revisión
1. ~~Git~~: se aprobó `git init` con un commit por tarea.
2. ~~`/api/health`~~: se incluye (es una herramienta de verificación de `core`).
