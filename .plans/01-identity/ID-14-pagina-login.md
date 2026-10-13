# ID-14 · Página `/login`

- **Módulo:** identity · **Depende de:** ID-13 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-identity.md` líneas 40, 43, 63–64 y 72–73.
- `src/pages/registro.astro` (lo creó ID-13): esta página sigue **la misma estructura y clases**.

## Archivos
- Crear: `src/pages/login.astro`

## Contrato — `src/pages/login.astro`
Frontmatter (copiar tal cual):
```astro
---
import Layout from '@/layouts/Layout.astro';
import { getDb } from '@/lib/db';
import { safeNext } from '@/lib/safe-next';
import { setSessionCookie } from '@/lib/session-cookie';
import { loginFlow } from '@/services/auth-flows';

let next = safeNext(Astro.url.searchParams.get('next'));
let email = '';
let fields: Record<string, string> = {};
let message = '';

if (Astro.request.method === 'POST') {
  const form = Object.fromEntries(await Astro.request.formData());
  next = safeNext(String(form.next ?? ''));
  email = String(form.email ?? '');
  const result = await loginFlow(getDb(), form, Astro.clientAddress);
  if (result.ok) {
    setSessionCookie(Astro.cookies, result.token, result.expiresAt);
    return Astro.redirect(next, 303);
  }
  fields = result.fields ?? {};
  message = result.message;
  Astro.response.status = result.status;
}
---
```
Markup: copiar el de `registro.astro` con estos cambios:
- `title="Ingresar · PlaniComida"`, `<h1>`: "Ingresar".
- Campos: solo `email` (`autocomplete="email"`, `value={email}`) y `password` (`autocomplete="current-password"`, sin el texto "Mínimo 8 caracteres").
- Agregar `<input type="hidden" name="next" value={next} />` dentro del form.
- Botón: "Ingresar".
- Pie: `¿No tenés cuenta? <a href="/registro" class="link">Creá una</a>`.
- El `message` (401 o 429) se muestra arriba del form con `role="alert"`, igual que en registro.

## Verificación
```bash
npm run check
npx vitest run
# Servidor levantado; existe el usuario reg1@mail.com / 12345678 (lo creó la verificación de ID-13; si no, registrarlo):
curl -s 'http://localhost:4321/login?next=/app/lista' | grep -c 'value="/app/lista"'          # 1
curl -s 'http://localhost:4321/login?next=https://evil.com' | grep -c 'value="/app/planner"'  # 1
curl -s -i -X POST -H 'Origin: http://localhost:4321' \
  -d 'email=reg1@mail.com&password=12345678&next=/app/lista' http://localhost:4321/login | grep -iE '^(HTTP|location)'
# → HTTP/1.1 303 y location: /app/lista
curl -s -i -X POST -H 'Origin: http://localhost:4321' \
  -d 'email=reg1@mail.com&password=mala&next=' http://localhost:4321/login | grep -E '^HTTP|Email o contraseña incorrectos'
# → HTTP/1.1 401 y el mensaje
npm run build
```

## Hecho cuando
- [ ] Todos los comandos dan lo indicado y `npm run build` pasa.

## Commit
`feat(identity): ID-14 página de login con redirección a next`
