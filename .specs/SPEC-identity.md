# Spec: identity — Cuentas y sesiones

> Estado: **APROBADA (2026-10-13).** Depende de: `core`.
> Stack, comandos, estilo, tests y límites: ver `SPEC-core.md`.

## Objective
Cada persona tiene su cuenta y ve solo sus recetas propias y sus planes. El login usa email y contraseña.

**User stories**
- Como visitante, quiero registrarme con email y contraseña para empezar a planificar.
- Como usuario, quiero iniciar sesión y que me recuerde por un tiempo largo, tanto en el celular como en la PC (cada dispositivo tiene su propia sesión).
- Como usuario, quiero cerrar sesión.
- Como visitante sin sesión, si entro a `/app/**` me lleva a `/login` y, después de entrar, vuelvo a donde quería ir.

## Datos
```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  password_hash TEXT NOT NULL,                       -- "scrypt$<salt hex>$<hash hex>"
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,                       -- SHA-256 (hex) del token; el token solo viaja en la cookie
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user_id ON sessions(user_id);
```

## Reglas
- Email: se guarda con `trim()` y en minúsculas, y tiene que ser válido según zod. Contraseña: entre 8 y 128 caracteres.
- Hash: `crypto.scrypt` con un salt aleatorio de 16 bytes y una clave de 64 bytes. Se compara con `timingSafeEqual`.
- Token de sesión: 32 bytes aleatorios en base64url. En la base se guarda solo su SHA-256.
- Cookie `pc_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 30 días. `Secure` solo cuando `import.meta.env.PROD` (en `npm run dev` se usa HTTP).
- Expiración deslizante: si a la sesión le quedan menos de 15 días, se extiende a 30 días.
- Las sesiones vencidas se borran al iniciar sesión (limpieza perezosa).
- Login fallido: siempre el mismo mensaje ("Email o contraseña incorrectos"), sin revelar si el email existe.
- `src/middleware.ts`:
  - Si la cookie es válida, carga `locals.user = { id, email, name }`.
  - `/app/**` sin sesión → 302 a `/login?next=<ruta>`. `next` solo acepta rutas internas que empiecen con `/app`.
  - `/api/**` sin sesión → 401 `UNAUTHENTICATED`, salvo `/api/auth/register`, `/api/auth/login` y `/api/health`.
  - `/login` y `/registro` con sesión → 302 a `/app/planner`.
- Rate limiting del login: en memoria, 10 intentos fallidos cada 15 minutos por IP+email; después responde 429 `RATE_LIMITED`.
- CSRF: alcanza con `SameSite=Lax` + el `security.checkOrigin` de Astro (activado por defecto), porque todas las mutaciones son POST/PUT/DELETE del mismo origen.

## API
| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| POST | `/api/auth/register` | `{ email, name, password }` | 201 `{ user }` + cookie · 409 si el email existe · 400 |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{ user }` + cookie · 401 |
| POST | `/api/auth/logout` | — | 204, borra la sesión y la cookie |
| GET  | `/api/auth/me` | — | 200 `{ user }` · 401 |

`user` = `{ "id": 1, "email": "ana@mail.com", "name": "Ana" }`

## Contrato que expone a otros módulos
- `locals.user: { id: number; email: string; name: string } | undefined`, cargado por el middleware.
  En `/app/**` y `/api/**` protegidos se garantiza que está definido.

## UI
- `/registro` y `/login`: formularios simples, con errores por campo y un link entre ambos. Ocupan todo el ancho en el celular y se muestran centrados en una tarjeta (`max-w-sm`) en la PC.
- En la navegación, "Salir" hace POST a `/api/auth/logout` y redirige a `/`.

## Success Criteria
- [ ] Registrarse crea el usuario, deja una sesión iniciada y redirige a `/app/planner`.
- [x] Registrar un email ya existente (aunque cambien mayúsculas o espacios) → 409.
- [x] Contraseña o email incorrectos → 401 con el mismo mensaje en ambos casos.
- [x] La base de datos no tiene contraseñas ni tokens en texto plano (verificado en test).
- [x] `/app/planner` sin sesión → 302 a `/login?next=/app/planner`; después del login, vuelve a esa ruta.
- [x] `?next=https://evil.com` se ignora (redirige a `/app/planner`).
- [x] `/api/recipes` sin cookie → 401 con la forma de error común.
- [x] Logout invalida la sesión en el servidor: reusar la cookie vieja → 401.
- [ ] Una sesión vencida → 401 y la fila se borra.

## Fuera de alcance (v1)
Recuperar contraseña por email (decidido: después de v1), verificar email, login social.

**Decidido (no es parte del producto):** compartir planes o recetas entre usuarios. Cada usuario tiene sus propios planes, recetas y listas.

## Open Questions
Ninguna.
