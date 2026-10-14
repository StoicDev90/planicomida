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
