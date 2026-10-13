# ID-15 · Checkpoint del módulo identity

- **Módulo:** identity · **Depende de:** ID-01 … ID-14 · **Modelo sugerido:** el más capaz disponible

## Leé antes
- `.specs/SPEC-identity.md` completo.
- `.plans/01-identity/PLAN.md`.

## Archivos
- Modificar: `.specs/SPEC-identity.md` (solo tildar `[x]` los Success Criteria verificados)
- Modificar: `.plans/01-identity/PLAN.md` (Estado → `TERMINADO (<fecha>)`)
- Modificar: `.plans/README.md` (fila de identity → `Terminado`)

## Pasos
1. Suite completa y build:
   ```bash
   npx vitest run --coverage
   npm run check
   npm run build
   ```
   Cobertura: ≥ 80 % de líneas en `src/services/` y `src/lib/`.
2. Recorrer cada Success Criterion de `SPEC-identity.md` (líneas 68–76) y marcar con qué test o comando quedó probado.
   Si alguno no tiene prueba, **no tildarlo** y reportarlo.
3. Prueba manual de punta a punta con el servidor de desarrollo, en el navegador, a 360 px y a 1280 px
   (DevTools → modo responsive):
   - Entrar a `/app/planner` sin sesión → login → ingresar → vuelve a `/app/planner` (todavía es 404: es del módulo planner; lo que importa es la URL).
   - Registrarse desde la landing ("Crear cuenta") y desde el formulario de cierre (`?email=` precargado).
   - "Salir" en la barra de navegación → vuelve a `/` y `/api/auth/me` da 401.
   - Sin scroll horizontal en `/login` y `/registro` en ningún ancho; todo usable con Tab y Enter.
4. Revisar que la base no tenga contraseñas ni tokens en texto plano:
   ```bash
   sqlite3 data/planicomida.db "SELECT password_hash FROM users LIMIT 3; SELECT id FROM sessions LIMIT 3;"
   ```
   (si `sqlite3` no está instalado: `node -e "const D=require('better-sqlite3');const d=new D('data/planicomida.db');console.log(d.prepare('select password_hash from users').all(), d.prepare('select id from sessions').all())"`).

## Hecho cuando
- [ ] Suite, check y build en verde; cobertura ≥ 80 %.
- [ ] Todos los Success Criteria de identity tildados con su prueba, o reportados.
- [ ] Prueba manual hecha en los dos anchos.

## Commit
`docs(identity): ID-15 checkpoint del módulo identity`
