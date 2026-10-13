# Spec: core — Arquitectura y decisiones transversales

> Estado: **APROBADA (2026-10-13).** Reemplaza a `01-system-architecture.md`.
> Todo lo definido acá aplica a todos los módulos del mapa (`00-capability-map.md`).

## Objective
Dar la base técnica sobre la que se construyen `identity`, `recipes`, `planner` y `shopping-list`:
una única app Astro con renderizado en servidor, API REST en endpoints de Astro y SQLite en el mismo proceso.

**Usuario objetivo:** personas no técnicas que planifican las comidas del hogar. Usan la app desde el navegador **del celular y de la PC**:
 típicamente planifican en la PC (pantalla grande) y compran con el celular (lista en el súper).

**Éxito del módulo:** `npm run dev` levanta la app, la base de datos se crea y migra sola,
`npm test` y `npm run check` pasan, y existe un layout responsive (celular y PC) con navegación entre secciones.

## Tech Stack
| Pieza          | Elección                                                        | Notas |
|----------------|-----------------------------------------------------------------|-------|
| Runtime        | Node.js ≥ 22.12 (`engines: ">=22.12"`; local: 22.23)              | Mínimo que exige Astro 7. Node 20 ya no tiene soporte |
| Framework      | Astro 7 con `output: 'server'` + `@astrojs/node` (modo `standalone`) | La landing usa `export const prerender = true` |
| API            | Endpoints de Astro en `src/pages/api/**`                         | Sin Express y sin CORS: mismo origen |
| Base de datos  | SQLite vía `better-sqlite3`, SQL a mano con prepared statements  | Sin ORM |
| Validación     | `astro/zod` (zod incluido en Astro)                              | Sin dependencia extra |
| Estilos        | Tailwind CSS v4 vía `@tailwindcss/vite`                          | |
| Interactividad | `<script>` de Astro con TypeScript vanilla                       | Sin React/Preact/Nanostores salvo aprobación |
| Auth           | `node:crypto` (scrypt + tokens aleatorios), ver `SPEC-identity.md` | Sin librería de auth |
| Tests          | Vitest                                                           | |
| Lenguaje       | TypeScript estricto (`astro/tsconfigs/strict`)                   | |

## Commands
```bash
npm install                 # instalar dependencias
npm run dev                 # astro dev → http://localhost:4321
npm run build               # astro build → dist/
npm test                    # vitest run
npm run test:watch          # vitest
npm run check               # astro check (tipos + diagnósticos .astro)
npm run format              # prettier --write . (con prettier-plugin-astro)
npm run db:seed             # node scripts/seed.ts → carga el catálogo de recetas (idempotente)
npm run db:reset            # borra data/planicomida.db, migra y siembra (solo desarrollo)
```
Variables de entorno (`.env`, ver `.env.example`):
```
DATABASE_PATH=./data/planicomida.db
TZ=America/Argentina/Buenos_Aires   # define qué día es "hoy" y cuál es la semana actual
```

## Project Structure
```
planicomida/
├── .specs/                    → specs (este directorio)
├── .plans/                    → plan y tareas por módulo (después de aprobar cada spec)
├── db/
│   ├── migrations/            → una por módulo: 001_identity.sql, 002_recipes.sql… (en orden, una sola vez)
│   └── seed.sql               → recetas del catálogo
├── data/                      → archivo .db (en .gitignore)
├── scripts/                   → seed.ts, reset.ts
├── src/
│   ├── middleware.ts          → resuelve sesión → locals.user; protege /app/** y /api/**
│   ├── lib/
│   │   ├── db.ts              → getDb() (conexión única, perezosa) + runner de migraciones (PRAGMA user_version)
│   │   ├── http.ts            → json(), errorResponse(), parseBody()
│   │   └── week.ts            → weekStartOf(date), addWeeks(), validación de YYYY-MM-DD lunes
│   ├── services/              → lógica de dominio pura: reciben `db` + argumentos, sin Request/Response
│   │   ├── auth.ts
│   │   ├── recipes.ts
│   │   ├── plan.ts
│   │   └── shopping-list.ts
│   ├── pages/
│   │   ├── index.astro        → landing (prerender)
│   │   ├── login.astro, registro.astro
│   │   ├── app/               → páginas privadas (planner, recetas, lista)
│   │   └── api/               → endpoints REST
│   ├── components/
│   └── layouts/Layout.astro
├── tests/                     → espeja src/: tests/services/plan.test.ts, tests/lib/week.test.ts…
├── astro.config.mjs
├── vitest.config.ts
└── package.json
```
Alias de imports: `@/*` → `src/*` (en `tsconfig.json`).

## Base de datos — reglas comunes
- Una conexión por proceso (`src/lib/db.ts`), con `PRAGMA journal_mode = WAL` y `PRAGMA foreign_keys = ON`.
- Migraciones: archivos `db/migrations/NNN_nombre.sql`; `db.ts` aplica las que tengan número mayor que
  `PRAGMA user_version` dentro de una transacción y actualiza `user_version`. Se ejecuta al arrancar.
- Fechas: `TEXT` en ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:MM:SSZ`, UTC para timestamps).
- SQL en `snake_case`; JS/JSON en `camelCase`. El mapeo se hace en el service.
- Las tablas de cada módulo se definen en su spec. Cada módulo agrega **su propia** migración numerada al implementarse
  (`001_identity.sql`, `002_recipes.sql`, `003_planner.sql`, `004_shopping_list.sql`). `core` no crea tablas.
- Tests: cada test crea una base `:memory:` con todas las migraciones aplicadas.

## Contrato HTTP común
- Request y response en JSON (`Content-Type: application/json`).
- Errores, siempre con esta forma:
  ```json
  { "error": { "code": "VALIDATION", "message": "El título es obligatorio", "fields": { "title": "Requerido" } } }
  ```
  | Status | `code`          | Cuándo |
  |--------|-----------------|--------|
  | 400    | `VALIDATION`    | El body o los parámetros no pasan zod |
  | 401    | `UNAUTHENTICATED` | No hay sesión válida |
  | 403    | `FORBIDDEN`     | El recurso existe pero no es del usuario (ej.: editar una receta del catálogo) |
  | 404    | `NOT_FOUND`     | No existe, o es privado de otro usuario (no se revela que existe) |
  | 409    | `CONFLICT`      | Email ya registrado, etc. |
  | 429    | `RATE_LIMITED`  | Demasiados intentos de login fallidos |
  | 500    | `INTERNAL`      | Error no previsto (se loguea; el mensaje al cliente es genérico) |
- Toda query de datos privados filtra por `locals.user.id`. Nunca se toma el `userId` del body.

## Code Style
```ts
// src/pages/api/plan/[week]/[day]/[meal].ts
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import { SlotParams, setMeal } from '@/services/plan';

const Body = z.union([
  z.object({ recipeId: z.number().int().positive() }),
  z.object({ customMealName: z.string().trim().min(1).max(80) }),
]);

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const slot = SlotParams.safeParse(params);
  if (!slot.success) return errorResponse(400, 'VALIDATION', 'Semana, día o comida inválidos');

  const body = await parseBody(request, Body);
  if (!body.ok) return body.response;

  const entry = setMeal(getDb(), locals.user!.id, slot.data, body.data);
  return json(entry);
};
```
Convenciones:
- Endpoints finos: validan, llaman a un service y responden. La lógica vive en `src/services/` y no conoce `Request`.
- Identificadores de código en inglés; textos de UI, mensajes de error y rutas de página en español (`/app/lista`, `/app/recetas`).
- Funciones con nombre y sin clases salvo que haga falta. Sin `any`.
- Componentes `.astro` en PascalCase (`WeekGrid.astro`); el resto de los archivos en kebab-case.
- Prettier con su configuración por defecto + `prettier-plugin-astro`.

## Testing Strategy
| Nivel | Qué se prueba | Dónde | Herramienta |
|-------|---------------|-------|-------------|
| Unit | Funciones puras: `week.ts`, consolidación y normalización de ingredientes, hashing | `tests/lib`, `tests/services` | Vitest |
| Integración | Services contra SQLite `:memory:` con migraciones reales (aislamiento por usuario, upserts, borrado lógico) | `tests/services` | Vitest |
| API | Handlers de endpoints invocados con un `Request` construido y `locals` simulados: status, forma del JSON, 401/403/404 | `tests/api` | Vitest |
| Manual | Flujo completo a 360 px (celular) **y** a 1280 px (PC): registro → crear receta → planificar → lista → tachar | checklist en cada spec | — |

- Se escribe el test antes o junto con el código (TDD para la consolidación y para las reglas de semana).
- Cobertura: 100 % de ramas en `services/shopping-list.ts` y `lib/week.ts`; ≥ 80 % de líneas en `src/services/`.
- `npm test && npm run check` deben pasar antes de dar una tarea por terminada.
- E2E con navegador (Playwright): fuera de alcance en v1 (decidido).

## Ejecución y deploy
- **v1: solo local con `npm run dev`** (`http://localhost:4321`). Es el único entorno con criterios de éxito en esta versión.
- `@astrojs/node` se incluye igual, porque Astro lo necesita para el renderizado en servidor; `npm run build` tiene que compilar sin errores.
- **El deploy al VPS queda fuera de alcance de v1.** Cuando llegue el momento se decide el servidor web (nginx u otro) y se escribe una spec aparte.
- **Backups:** fuera de alcance (decidido).
- **PWA / app instalable / modo offline:** fuera de alcance en v1. Es una web responsive que se usa desde el navegador.

## Requisitos no funcionales (medibles)
- Endpoints de la API: p95 < 100 ms en local con la base sembrada y 50 recetas por usuario.
- **Responsive, celular y PC como plataformas de primera clase.** Se diseña mobile-first en CSS y se aprovecha el espacio en pantallas grandes.
  Breakpoints de Tailwind: base (celular, ≥ 360 px), `md` (≥ 768 px, tablet / PC chica) y `lg` (≥ 1024 px, PC).
  - Sin scroll horizontal en ningún ancho entre 360 px y 1920 px.
  - En la PC el contenido tiene un ancho máximo legible (`max-w-6xl`, centrado). Nada se estira a todo el monitor.
  - Navegación: barra inferior fija en el celular y barra superior en `md+`.
  - Interacción: táctil en el celular (objetivos ≥ 44×44 px); mouse y teclado en la PC (estados `hover` y `focus-visible`, todo accesible con Tab y Enter, y Esc cierra los diálogos).
  - Navegadores: las 2 últimas versiones de Chrome, Firefox, Safari (iOS y macOS) y Edge.
- Lighthouse ≥ 90 en Performance y Accessibility, en modo mobile **y** en modo desktop, para `/`, `/app/planner` y `/app/lista`.
- Todos los inputs con `<label>`; la app se puede usar con teclado.
- Idioma `es-AR` (`<html lang="es-AR">`), fechas como "lun 12 oct".

## Boundaries
- **Always:** correr `npm test && npm run check` antes de cerrar una tarea; validar toda entrada con zod;
  usar prepared statements; filtrar por `user_id` de la sesión; actualizar la spec antes de cambiar una decisión.
- **Ask first:** agregar dependencias; cambiar el esquema más allá de lo que dicen las specs; sumar un framework de UI;
  cambiar el mecanismo de auth; modificar una migración ya aplicada (se crea una nueva).
- **Never:** commitear `data/*.db` o `.env`; guardar contraseñas o tokens de sesión en texto plano;
  armar SQL concatenando strings; devolver datos de otro usuario; borrar o saltear tests que fallan sin aprobación.

## Success Criteria
- [ ] `npm install && npm run dev` en un clon limpio crea `data/planicomida.db` y responde en `http://localhost:4321`.
- [ ] Al reiniciar, las migraciones no se reaplican (`user_version` correcto); una migración nueva sí se aplica.
- [ ] `npm run build` compila sin errores (verifica que el adapter está bien configurado).
- [ ] `npm test` y `npm run check` pasan sin errores.
- [ ] `Layout.astro` tiene navegación (Planner · Recetas · Lista · Salir) y se ve y funciona bien a 360, 768 y 1280 px (barra inferior en el celular, superior en la PC), con accesibilidad por teclado.
- [ ] `GET /api/health` responde `{ ok: true, schemaVersion }` (público; sirve para verificar la base).
- [ ] Un endpoint que lanza una excepción responde 500 con la forma de error común.

## Open Questions
Ninguna. E2E con navegador: decidido que no (checklist manual).
