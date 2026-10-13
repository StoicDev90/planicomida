# ID-13 · Estilos de formulario, página `/registro` y redirección de `/app`

- **Módulo:** identity · **Depende de:** ID-10 (y ID-09 para que la redirección con sesión funcione) · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-identity.md` líneas 63–65 (UI) y 68 (Success Criteria del registro).
- `.plans/README.md` → "Guía visual para pantallas de la app".
- `src/styles/global.css` (completo) y `src/layouts/Layout.astro`.

## Archivos
- Modificar: `src/styles/global.css` (agregar un token y tres clases)
- Crear: `src/pages/registro.astro`
- Crear: `src/pages/app/index.astro`

## Contrato

### `src/styles/global.css`
1. Dentro de `@theme`, debajo de `--color-field-ink`, agregar: `--color-danger: #b42318;`
2. Dentro de `@layer components`, al final, agregar:
```css
  .label {
    display: block;
    margin-bottom: 0.375rem;
    font-weight: 500;
  }
  .input {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    color: var(--color-ink);
    font: inherit;
    border: 0;
    border-radius: 0;
  }
  .input[aria-invalid='true'] {
    outline: 2px solid var(--color-danger);
    outline-offset: 0;
  }
  .field-error {
    margin-top: 0.375rem;
    color: var(--color-danger);
    font-size: var(--text-small);
  }
```

### `src/pages/app/index.astro` (copiar tal cual)
```astro
---
// /app sin sección: va al planner (el middleware ya exige sesión).
return Astro.redirect('/app/planner', 302);
---
```

### `src/pages/registro.astro` (copiar y completar solo donde dice)
```astro
---
import Layout from '@/layouts/Layout.astro';
import { getDb } from '@/lib/db';
import { setSessionCookie } from '@/lib/session-cookie';
import { registerFlow } from '@/services/auth-flows';

let values = { name: '', email: Astro.url.searchParams.get('email') ?? '' };
let fields: Record<string, string> = {};
let message = '';

if (Astro.request.method === 'POST') {
  const form = Object.fromEntries(await Astro.request.formData());
  values = { name: String(form.name ?? ''), email: String(form.email ?? '') };
  const result = await registerFlow(getDb(), form);
  if (result.ok) {
    setSessionCookie(Astro.cookies, result.token, result.expiresAt);
    return Astro.redirect('/app/planner', 303);
  }
  fields = result.fields ?? {};
  message = result.message;
  Astro.response.status = result.status;
}
---

<Layout title="Crear cuenta · PlaniComida">
  <main class="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-8 md:px-6">
    <a href="/" class="font-display text-lead uppercase">PlaniComida</a>
    <section class="mx-auto mt-10 w-full max-w-sm md:mt-20" aria-labelledby="titulo">
      <h1 id="titulo" class="font-display text-head leading-[0.95] uppercase">Crear cuenta</h1>
      {message && <p role="alert" class="field-error mt-4 text-body">{message}</p>}
      <form method="post" class="mt-8 space-y-5" novalidate>
        <!-- 3 campos, cada uno con este patrón (name, email, password): -->
        <div>
          <label for="name" class="label">Nombre</label>
          <input id="name" name="name" class="input" autocomplete="name" required maxlength="60"
            value={values.name} aria-invalid={fields.name ? 'true' : undefined}
            aria-describedby={fields.name ? 'name-error' : undefined} />
          {fields.name && <p id="name-error" class="field-error">{fields.name}</p>}
        </div>
        <!-- email: type="email", autocomplete="email", value={values.email} -->
        <!-- password: type="password", autocomplete="new-password", minlength="8", sin value;
             debajo, siempre visible: <p class="mt-1.5 text-small text-muted">Mínimo 8 caracteres.</p> -->
        <button type="submit" class="btn w-full">Crear cuenta</button>
      </form>
      <p class="mt-6">¿Ya tenés cuenta? <a href="/login" class="link">Ingresá</a></p>
    </section>
  </main>
</Layout>
```
Completar los campos `email` y `password` con el mismo patrón que `name` (label, input, error con `aria-describedby`).
Textos de los labels: "Nombre", "Email", "Contraseña". No agregar nada más (ni íconos, ni sombras, ni imágenes).

## Tests
Las páginas `.astro` no se testean con Vitest; se verifican con el servidor de desarrollo.

## Verificación
```bash
npm run check
npx vitest run
# Servidor levantado (reiniciarlo si ya estaba corriendo):
curl -s http://localhost:4321/registro | grep -c 'Crear cuenta'                     # ≥ 1
curl -s 'http://localhost:4321/registro?email=x@mail.com' | grep -c 'value="x@mail.com"'   # 1
curl -s -i -X POST -H 'Origin: http://localhost:4321' \
  -d 'name=Reg&email=reg1@mail.com&password=12345678' http://localhost:4321/registro | grep -iE '^(HTTP|location|set-cookie)'
# → HTTP/1.1 303, location: /app/planner, set-cookie: pc_session=...
curl -s -i -X POST -H 'Origin: http://localhost:4321' \
  -d 'name=Reg&email=reg1@mail.com&password=12345678' http://localhost:4321/registro | grep -E '^HTTP|Ya hay una cuenta'
# → HTTP/1.1 409 y el mensaje
curl -s -i -X POST -H 'Origin: http://localhost:4321' -d 'name=&email=x&password=1' http://localhost:4321/registro | grep -c 'field-error'
# → 3 o más
npm run build
```

## Hecho cuando
- [ ] Todos los comandos dan lo indicado.
- [ ] Con sesión iniciada, `curl -s -o /dev/null -w '%{http_code}' -b /tmp/pc.txt http://localhost:4321/registro` → `302`.
- [ ] `npm run build` sin errores.

## Commit
`feat(identity): ID-13 estilos de formulario y página de registro`
