# Planes de PlaniComida

Índice de planes y tareas. Cada módulo tiene un `PLAN.md` (plan maestro) y una tarea por archivo,
pensada para que la ejecute un subagente **sin tener que entender la spec entera**.

| Orden | Módulo | Plan | Tareas | Estado |
|-------|--------|------|--------|--------|
| 0 | `core` | [00-core/PLAN.md](00-core/PLAN.md) | T1–T8 | Terminado |
| 1 | `identity` | [01-identity/PLAN.md](01-identity/PLAN.md) | ID-01 … ID-15 | Pendiente |
| 2 | `recipes` | [02-recipes/PLAN.md](02-recipes/PLAN.md) | RC-01 … RC-14 | Pendiente (necesita identity) |
| 3 | `planner` | [03-planner/PLAN.md](03-planner/PLAN.md) | PL-01 … PL-13 | Pendiente (necesita recipes) |
| 4 | `shopping-list` | [04-shopping-list/PLAN.md](04-shopping-list/PLAN.md) | SL-01 … SL-12 | Pendiente (necesita planner) |

Las tareas de un módulo se ejecutan **en el orden de su número**, salvo que el `PLAN.md` diga que dos se pueden
hacer en paralelo. Un módulo no empieza hasta que el anterior pasó su tarea de checkpoint (la última).

---

## Protocolo para subagentes

### Prompt para lanzar una tarea
```
Ejecutá la tarea descrita en .plans/<carpeta>/<ID>.md del proyecto PlaniComida.
Antes de empezar, leé .plans/README.md (sección "Reglas") y SOLO las secciones de spec que la tarea indica.
Seguí la tarea al pie de la letra: tests primero, después la implementación, después la verificación.
No toques archivos que no estén en la lista "Archivos" de la tarea.
Si algo de la tarea no se puede cumplir tal como está escrito, NO improvises: frená y reportá qué pasó.
Al terminar, hacé el commit con el mensaje indicado y reportá: archivos tocados, salida de la verificación y el hash del commit.
```

### Reglas
1. **Alcance cerrado.** Solo se crean o modifican los archivos listados en la tarea. Si hace falta tocar otro, frenar y reportar.
2. **TDD.** Primero se escriben los tests de la sección "Tests primero" y se corre el comando para ver que **fallan**.
   Después se implementa hasta que pasen. No se borran ni se debilitan tests para que pasen.
3. **Contratos exactos.** Los nombres, firmas, SQL, JSON y mensajes de error de la tarea se copian tal cual.
   No se renombran ni se "mejoran".
4. **Verificación obligatoria.** Antes del commit tienen que pasar: el comando de verificación de la tarea,
   `npx vitest run` (todos los tests) y `npm run check` (0 errores).
5. **Un commit por tarea**, con el mensaje indicado más la línea de coautoría:
   ```
   git add <archivos de la tarea>
   git commit -m "<mensaje de la tarea>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
   ```
   No se usa `git add -A` (para no subir archivos ajenos a la tarea).
6. **Sin dependencias nuevas.** No se ejecuta `npm install <paquete>`. Todo se hace con lo que ya está instalado.
7. **Nunca** se commitea `data/`, `.env` ni archivos de `.taste-skill/`.

### Convenciones del código (resumen de `.specs/SPEC-core.md`)
- TypeScript estricto, sin `any` en `src/` (en tests se tolera el `any` que devuelve `res.json()`).
- Identificadores en inglés; textos de UI y mensajes de error en español rioplatense (voseo: "Probá", "Tenés").
- SQL en `snake_case`, JSON en `camelCase`. El mapeo se hace en el service.
- Imports con alias `@/` → `src/` (salvo `src/lib/db.ts`, que usa imports relativos).
- Los services (`src/services/*.ts`) reciben `db` como primer parámetro y no conocen `Request`/`Response`.
- Los endpoints (`src/pages/api/**`) validan, llaman al service y responden con `json()` / `errorResponse()` de `@/lib/http`.
- Formato de error: `{ "error": { "code", "message", "fields"? } }` (ver `.specs/SPEC-core.md` líneas 93–112).
- Prettier: después de escribir, correr `npx prettier --write <archivos de la tarea>`.

### Herramientas ya disponibles (no reescribir)
| Qué | Dónde | Uso |
|-----|-------|-----|
| `getDb()`, `createTestDb()`, `Db`, `setDb()`* | `src/lib/db.ts` | `setDb` lo agrega ID-01 |
| `json(data, status)`, `errorResponse(status, code, message, fields?)`, `parseBody(request, schema)`, `fieldErrors(zodError)`* | `src/lib/http.ts` | `fieldErrors` se exporta en ID-10 |
| `WeekStart` (zod), `weekStartOf(date)`, `addWeeks(week, n)`, `isWeekStart(v)`, `formatDayLabel(week, day)` | `src/lib/week.ts` | semanas = fecha del lunes `YYYY-MM-DD` |
| `apiContext({...})` | `tests/helpers/api.ts` | lo crea ID-01: contexto falso para testear endpoints y middleware |
| `createUser(db, email?, name?)` | `tests/helpers/fixtures.ts` | lo crea ID-02 |
| `Layout` | `src/layouts/Layout.astro` | `<Layout title="…">`; muestra la NavBar si hay sesión |
| Clases CSS | `src/styles/global.css` | `.btn`, `.link`; tokens `bg-paper bg-surface bg-field text-ink text-muted text-accent`, `font-display`, `text-small/body/lead/head/display` |

### Cómo testear un endpoint (patrón)
```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { apiContext } from '../helpers/api';
import { createUser } from '../helpers/fixtures';
import { GET } from '@/pages/api/recipes/index';

let db: Db;
beforeEach(() => { db = createTestDb(); setDb(db); });
afterEach(() => setDb(undefined));

it('lista recetas', async () => {
  const user = createUser(db);
  const { context } = apiContext({ path: '/api/recipes', user });
  const res = await GET(context);
  expect(res.status).toBe(200);
  expect((await res.json()).recipes).toEqual([]);
});
```
El middleware **no** corre cuando se llama al handler directo: en los tests de endpoints se pasa `user` en `apiContext`.

### Servidor de desarrollo (para verificar páginas)
Astro 7, cuando no corre en una terminal interactiva, levanta `astro dev` en segundo plano:
```bash
npx astro dev status            # ¿ya está corriendo?
npm run dev                     # lo levanta en http://localhost:4321 y devuelve el control
npx astro dev logs              # ver logs
npx astro dev stop              # detenerlo
```
- Después de agregar una migración nueva, **reiniciar** el servidor (stop + dev): la base se migra al abrirse.
- Los formularios HTML con POST necesitan el header `Origin` (Astro bloquea POST de otro origen):
  `curl -i -X POST -H 'Origin: http://localhost:4321' -d 'email=a@b.com&password=12345678' http://localhost:4321/login`
- Para probar páginas con sesión:
  ```bash
  curl -s -c /tmp/pc.txt -H 'Content-Type: application/json' \
    -d '{"email":"prueba@mail.com","name":"Prueba","password":"12345678"}' http://localhost:4321/api/auth/register
  curl -s -c /tmp/pc.txt -H 'Content-Type: application/json' \
    -d '{"email":"prueba@mail.com","password":"12345678"}' http://localhost:4321/api/auth/login
  curl -s -b /tmp/pc.txt http://localhost:4321/app/planner | grep -c 'Planner'
  ```

### Guía visual para pantallas de la app
La landing usa la skill `design-taste-frontend`; las pantallas de la app **no** (es para páginas públicas),
pero respetan las mismas reglas de casa para que todo se vea igual:
- Fondo `bg-paper`, texto `text-ink`, superficies `bg-surface`, un solo color de acción `accent` (botón `.btn`).
- Títulos de página: `font-display text-head uppercase leading-[0.95]`. Texto: `text-body`. Notas: `text-small text-muted`.
- Contenedor de página: `<main class="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">`.
- Sin degradados, sin sombras (salvo en `<dialog>`), sin bordes finos decorativos, sin emojis, sin íconos de adorno.
  Separar con espacio o con `bg-surface`.
- Formularios: clases `.label`, `.input`, `.field-error` (las crea ID-13 en `global.css`).
- Objetivos táctiles ≥ 44 px (`min-h-11`). Todo usable con teclado; foco visible (ya está en `global.css`).
- Responsive: base = celular (360 px), `md:` ≥ 768, `lg:` ≥ 1024. Sin scroll horizontal.
