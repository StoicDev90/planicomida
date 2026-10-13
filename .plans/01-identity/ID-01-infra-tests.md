# ID-01 · Infraestructura de tests: `setDb()` y `apiContext()`

- **Módulo:** identity · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.plans/README.md` → "Reglas" y "Cómo testear un endpoint".
- `src/lib/db.ts` (completo, son ~80 líneas).

## Archivos
- Modificar: `src/lib/db.ts` (agregar `setDb`, nada más)
- Crear: `tests/helpers/api.ts`
- Crear: `tests/helpers/api.test.ts`

## Contrato

### `src/lib/db.ts` — agregar al final, debajo de `getDb()`
```ts
/** Solo para tests: reemplaza la conexión única (o la limpia con `undefined`). */
export function setDb(db: Db | undefined): void {
  instance = db;
}
```

### `tests/helpers/api.ts` — copiar tal cual
```ts
import type { APIContext } from 'astro';

export interface TestUser {
  id: number;
  email: string;
  name: string;
}

export interface CookieEntry {
  value: string;
  options: Record<string, unknown>;
}

interface ApiContextOptions {
  /** Ruta con query incluida, ej. '/api/recipes?category=cena'. */
  path: string;
  method?: string;
  /** Se envía como JSON. */
  body?: unknown;
  /** Se envía como application/x-www-form-urlencoded. */
  form?: Record<string, string>;
  /** Cuerpo crudo (para probar JSON roto). Requiere `contentType`. */
  rawBody?: string;
  contentType?: string;
  params?: Record<string, string>;
  user?: TestUser;
  /** Cookies que trae el pedido. */
  cookies?: Record<string, string>;
  ip?: string;
}

/**
 * Contexto falso de Astro para llamar endpoints y el middleware en tests.
 * `jar` registra las cookies que el código setea (`null` = borrada).
 */
export function apiContext(opts: ApiContextOptions) {
  const url = new URL(opts.path, 'http://localhost:4321');
  const headers = new Headers();
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(opts.body);
  } else if (opts.form) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    body = new URLSearchParams(opts.form).toString();
  } else if (opts.rawBody !== undefined) {
    headers.set('Content-Type', opts.contentType ?? 'application/json');
    body = opts.rawBody;
  }
  const request = new Request(url, { method: opts.method ?? 'GET', headers, body });

  const incoming = new Map(Object.entries(opts.cookies ?? {}));
  const jar = new Map<string, CookieEntry | null>();
  const cookies = {
    get(name: string) {
      if (jar.has(name)) {
        const entry = jar.get(name);
        return entry ? { value: entry.value } : undefined;
      }
      const value = incoming.get(name);
      return value === undefined ? undefined : { value };
    },
    has(name: string) {
      return cookies.get(name) !== undefined;
    },
    set(name: string, value: string, options: Record<string, unknown> = {}) {
      jar.set(name, { value, options });
    },
    delete(name: string) {
      jar.set(name, null);
    },
  };

  const context = {
    request,
    url,
    params: opts.params ?? {},
    cookies,
    locals: { user: opts.user } as App.Locals,
    clientAddress: opts.ip ?? '127.0.0.1',
    isPrerendered: false,
    redirect: (path: string, status = 302) =>
      new Response(null, { status, headers: { Location: path } }),
  } as unknown as APIContext;

  return { context, jar };
}
```

## Tests primero — `tests/helpers/api.test.ts`
Escribir estos casos (todos con `apiContext` y `expect`):
1. `path: '/api/x?a=1'` → `context.url.pathname === '/api/x'` y `context.url.searchParams.get('a') === '1'`.
2. `method: 'POST', body: { a: 1 }` → `await context.request.json()` es `{ a: 1 }` y el header `Content-Type` es `application/json`.
3. `form: { email: 'a@b.com' }` → `(await context.request.formData()).get('email') === 'a@b.com'`.
4. `cookies: { pc_session: 'abc' }` → `context.cookies.get('pc_session')?.value === 'abc'`;
   después de `context.cookies.delete('pc_session')`, `get` devuelve `undefined` y `jar.get('pc_session') === null`.
5. `context.cookies.set('x', '1', { path: '/' })` → `jar.get('x')` es `{ value: '1', options: { path: '/' } }`.
6. `context.redirect('/login', 303)` → `status === 303` y `headers.get('Location') === '/login'`.
7. Sin `user` → `context.locals.user === undefined`; con `user: { id: 1, email: 'a@b.com', name: 'A' }` → igual a ese objeto.
8. `setDb`: `const db = createTestDb(); setDb(db); expect(getDb()).toBe(db); setDb(undefined);`
   (importar `createTestDb`, `getDb`, `setDb` de `@/lib/db`).

## Verificación
```bash
npx vitest run tests/helpers/api.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 8 casos pasan.
- [ ] `npx vitest run` completo en verde y `npm run check` con 0 errores.
- [ ] `src/lib/db.ts` solo cambió por el agregado de `setDb`.

## Commit
`test(identity): ID-01 setDb y helper apiContext para tests de endpoints`
