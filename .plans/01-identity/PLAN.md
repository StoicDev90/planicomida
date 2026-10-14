# Plan maestro: identity

> Spec: `.specs/SPEC-identity.md` (aprobada) · Depende de: `core` (terminado) · Estado: **TERMINADO (2026-10-13)** · pendiente solo la prueba manual en el navegador (ID-15, paso 3)

## Objetivo
Cuentas con email y contraseña, sesiones por cookie (`pc_session`, 30 días, deslizante) y protección de rutas:
`/app/**` redirige a `/login` y `/api/**` responde 401 si no hay sesión. Al terminar, cualquier módulo puede usar
`locals.user` con la garantía de que existe en rutas protegidas.

## Decisiones de diseño (tomadas acá para que las tareas no tengan que decidir)
- **Lógica en capas:** `lib/password.ts` (hash) → `services/auth.ts` (usuarios y sesiones) →
  `services/auth-flows.ts` (esquemas zod + registro y login completos, con validación y rate limit) → endpoints y páginas.
  Los endpoints JSON y los formularios HTML usan **los mismos flows**, así no se duplica lógica.
- **Formularios sin JS:** `/registro` y `/login` son páginas SSR que procesan su propio POST
  (`Astro.request.formData()`), setean la cookie y redirigen con 303. Funcionan sin JavaScript.
- **Logout:** `POST /api/auth/logout` responde 204 a pedidos JSON y **303 a `/`** si viene de un formulario HTML
  (el botón "Salir" de la NavBar es un `<form>`).
- **Tests de endpoints:** `setDb(db)` en `src/lib/db.ts` permite inyectar una base en memoria, y
  `tests/helpers/api.ts` arma un `APIContext` falso (request, cookies, locals, redirect).
- **Middleware:** se saltea en páginas prerenderizadas (`context.isPrerendered`), porque la landing no tiene cookies.
- **Tiempo inyectable:** las funciones de sesión y rate limit reciben `now` como parámetro (por defecto `new Date()`),
  para testear vencimientos sin esperar.

## Componentes y dependencias
```
ID-01 infra de tests ─┬─ ID-02 migración + fixture ─┬─ ID-04 usuarios ──┐
                      │                             └─ ID-05 sesiones ──┤
                      ├─ ID-03 password ────────────── (ID-04 la usa)   │
                      ├─ ID-06 cookie                                    ├─ ID-09 middleware
                      ├─ ID-07 rate limit                                ├─ ID-10 flows ─┬─ ID-11 API register/login
                      └─ ID-08 safe-next ───────────────────────────────┘               ├─ ID-12 API logout/me
                                                                                         ├─ ID-13 página /registro
                                                                                         └─ ID-14 página /login
                                                                     ID-15 checkpoint (al final)
```
- **Secuencial obligatorio:** ID-01 → ID-02 → ID-03 → ID-04 → ID-05.
- **En paralelo** (después de ID-01): ID-06, ID-07, ID-08 (no comparten archivos).
- ID-09 necesita ID-05, ID-06 y ID-08. ID-10 necesita ID-04, ID-05 y ID-07.
- ID-11, ID-12, ID-13 y ID-14 necesitan ID-10 (y se pueden hacer en paralelo entre sí, salvo ID-13 → ID-14,
  porque ID-14 reusa los estilos que crea ID-13).

## Tareas
| ID | Tarea | Archivos | Depende de | Modelo sugerido |
|----|-------|----------|------------|-----------------|
| [ID-01](ID-01-infra-tests.md) | `setDb()` + helper `apiContext` | `src/lib/db.ts`, `tests/helpers/api.ts`, `tests/helpers/api.test.ts` | — | chico |
| [ID-02](ID-02-migracion.md) | Migración `001_identity.sql` + fixture `createUser` | `db/migrations/001_identity.sql`, `tests/helpers/fixtures.ts`, `tests/db/identity-schema.test.ts` | ID-01 | chico |
| [ID-03](ID-03-password.md) | Hash de contraseñas (scrypt) | `src/lib/password.ts`, `tests/lib/password.test.ts` | — | chico |
| [ID-04](ID-04-usuarios.md) | `registerUser`, `authenticate` | `src/services/auth.ts`, `tests/services/auth-users.test.ts` | ID-02, ID-03 | chico |
| [ID-05](ID-05-sesiones.md) | Sesiones (crear, validar, renovar, borrar) | `src/services/auth.ts`, `tests/services/auth-sessions.test.ts` | ID-04 | medio |
| [ID-06](ID-06-cookie.md) | Cookie `pc_session` | `src/lib/session-cookie.ts`, `tests/lib/session-cookie.test.ts` | ID-01 | chico |
| [ID-07](ID-07-rate-limit.md) | Rate limit de login en memoria | `src/lib/rate-limit.ts`, `tests/lib/rate-limit.test.ts` | — | chico |
| [ID-08](ID-08-safe-next.md) | Validar `?next=` | `src/lib/safe-next.ts`, `tests/lib/safe-next.test.ts` | — | chico |
| [ID-09](ID-09-middleware.md) | Middleware de sesión y protección | `src/middleware.ts`, `tests/api/middleware.test.ts` | ID-05, ID-06, ID-08 | medio |
| [ID-10](ID-10-flows.md) | Esquemas zod + flows de registro y login | `src/lib/http.ts`, `src/services/auth-flows.ts`, `tests/services/auth-flows.test.ts` | ID-04, ID-05, ID-07 | medio |
| [ID-11](ID-11-api-register-login.md) | `POST /api/auth/register` y `/login` | `src/pages/api/auth/register.ts`, `src/pages/api/auth/login.ts`, `tests/api/auth.test.ts` | ID-06, ID-10 | chico |
| [ID-12](ID-12-api-logout-me.md) | `POST /api/auth/logout` y `GET /api/auth/me` | `src/pages/api/auth/logout.ts`, `src/pages/api/auth/me.ts`, `tests/api/auth-session.test.ts` | ID-06, ID-10 | chico |
| [ID-13](ID-13-pagina-registro.md) | Estilos de formulario + `/registro` + `/app` | `src/styles/global.css`, `src/pages/registro.astro`, `src/pages/app/index.astro` | ID-10 | medio |
| [ID-14](ID-14-pagina-login.md) | Página `/login` | `src/pages/login.astro` | ID-13 | medio |
| [ID-15](ID-15-checkpoint.md) | Checkpoint del módulo | `.specs/SPEC-identity.md`, `.plans/01-identity/PLAN.md` | todas | el más capaz |

## Checkpoints
- **Después de ID-09:** `npx vitest run` en verde; `curl -i localhost:4321/app/planner` → 302 a `/login?next=%2Fapp%2Fplanner`.
- **ID-15:** todos los Success Criteria de `SPEC-identity.md` verificados (ver la tarea).

## Riesgos
| Riesgo | Mitigación |
|--------|------------|
| `astro check` no reconoce `setDb(undefined)` u otros tipos del helper falso | El helper castea a `APIContext` con `as unknown as`; está escrito en ID-01 |
| `security.checkOrigin` bloquea POST de formularios en pruebas con curl | Mandar `-H 'Origin: http://localhost:4321'` (README) |
| scrypt es lento y hace lentos los tests | Costo por defecto de Node (N=16384) ≈ 50 ms por hash: aceptable; no bajar el costo en producción |
| El rate limit en memoria se pierde al reiniciar | Aceptado en la spec (v1) |
