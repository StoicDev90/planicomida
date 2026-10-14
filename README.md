# PlaniComida

Aplicación web para **planificar las comidas de la semana** y obtener, con un clic, **la lista del súper** consolidada y ordenada por góndola.

Está pensada para usarse tanto en el celular (en el súper, con una mano) como en la PC (para planificar con calma). La interfaz está en español rioplatense.

## Qué hace

- **Cuentas de usuario.** Registro e ingreso con email y contraseña. Cada persona tiene su propio plan, sus recetas y sus listas: no hay nada compartido entre cuentas.
- **Recetas.**
  - Catálogo inicial de 14 recetas de solo lectura (desayuno, almuerzo, snack y cena).
  - Recetas propias con alta, edición y borrado. Cada ingrediente tiene cantidad, unidad y góndola; también se admite "a gusto" (por ejemplo, la sal).
  - Búsqueda sin distinguir tildes ni mayúsculas, y filtros por categoría y por "mis recetas".
  - Las cantidades son para **una persona**. Si comen más, hay que multiplicar: la app lo avisa pero no escala.
- **Planificador semanal.**
  - Grilla de lunes a domingo con cuatro turnos por día: desayuno, almuerzo, snack y cena.
  - Cada turno lleva una receta o una comida libre (por ejemplo, "Delivery").
  - Navegación entre semanas con historial.
  - "Copiar semana anterior": llena solo los turnos vacíos y saltea las recetas que ya fueron borradas.
  - En el celular, el día de hoy aparece primero.
- **Lista de compras.**
  - Suma los ingredientes de toda la semana: el mismo ingrediente aparece una sola vez, con la cantidad total (1 kg + 500 g = 1,5 kg).
  - Se agrupa por góndola, en el orden en que se recorre el súper.
  - Permite agregar ítems manuales ("Detergente") que no se mezclan con los de las recetas.
  - Se puede tachar lo que ya está en el carrito (el tachado se guarda en el navegador, por semana) y compartir la lista como texto.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework web | [Astro](https://astro.build) 7 en modo SSR (`output: 'server'`) con el adaptador `@astrojs/node` |
| Lenguaje | TypeScript (modo estricto) |
| Estilos | [Tailwind CSS](https://tailwindcss.com) 4 con tokens de diseño en `@theme` |
| Base de datos | SQLite mediante [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3), con migraciones SQL versionadas |
| Validación | [Zod](https://zod.dev) (incluido en Astro) |
| Autenticación | Propia: contraseñas con `scrypt` (`node:crypto`), sesiones por cookie `HttpOnly` |
| Tests | [Vitest](https://vitest.dev) con cobertura `v8` |
| Calidad | `astro check` (TypeScript), Prettier con `prettier-plugin-astro` |

No hay un servidor aparte: las páginas y la API REST viven en la misma aplicación Astro (`src/pages/api`).

## Requisitos

- Node.js **22.12 o superior**
- npm

No hace falta instalar ni configurar ninguna base de datos: SQLite crea el archivo solo.

## Puesta en marcha

```bash
git clone <url-del-repositorio>
cd planicomida
npm install
cp .env.example .env      # opcional: los valores por defecto ya funcionan
npm run db:reset          # crea la base y carga el catálogo de recetas
npm run dev
```

La aplicación queda disponible en <http://localhost:4321>. Para empezar, creá una cuenta desde la página de inicio.

### Variables de entorno

Se leen del archivo `.env` (hay un modelo en `.env.example`).

| Variable | Por defecto | Qué hace |
|----------|-------------|----------|
| `DATABASE_PATH` | `./data/planicomida.db` | Ubicación del archivo SQLite |
| `TZ` | `America/Argentina/Buenos_Aires` | Zona horaria para calcular "la semana actual" y "hoy" |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run build` | Compila la aplicación para producción en `dist/` |
| `npm test` | Corre todos los tests una vez |
| `npm run test:watch` | Tests en modo observador |
| `npm run check` | Verificación de tipos y de archivos `.astro` (`astro check`) |
| `npm run format` | Formatea el código con Prettier |
| `npm run db:seed` | Carga (o recarga) el catálogo de recetas, sin duplicar nada |
| `npm run db:reset` | **Borra** la base de datos, la recrea y carga el catálogo |

> `db:reset` elimina todos los datos locales (usuarios, recetas propias y planes). No se ejecuta si `NODE_ENV=production`.

> Las migraciones se aplican solas al abrir la base. Si agregás una migración con el servidor de desarrollo corriendo, reinicialo.

## Tests

```bash
npm test                                   # toda la suite
npx vitest run tests/services              # una carpeta
npx vitest run tests/services/plan-read.test.ts   # un archivo
npx vitest run --coverage                  # con reporte de cobertura (carpeta coverage/)
npm run check                              # tipos
```

Los tests no necesitan el servidor ni una base real: cada uno crea una base SQLite en memoria con todas las migraciones aplicadas. Hay tres niveles:

- **Services y utilidades** (`tests/services`, `tests/lib`): lógica pura, como la consolidación de ingredientes, el formato de cantidades o el armado de la grilla semanal.
- **Endpoints y middleware** (`tests/api`): llaman directamente a los handlers con un contexto simulado.
- **Esquema de base de datos** (`tests/db`): restricciones, claves foráneas y catálogo inicial.

El algoritmo de la lista de compras (`src/services/shopping-list.ts`) tiene 100 % de cobertura de ramas.

## Estructura del proyecto

```
db/
  migrations/        Migraciones SQL (una por módulo, versionadas con PRAGMA user_version)
  seed.sql           Catálogo inicial de 14 recetas
scripts/             Utilidades de base de datos (seed, reset)
src/
  components/        Componentes Astro (navegación, tarjetas, formulario de receta, selector de turno…)
  layouts/           Layout base
  lib/               Utilidades puras y compartidas (base de datos, HTTP, semanas, formato, cookies…)
  pages/
    index.astro      Página de inicio
    login.astro, registro.astro
    app/             Pantallas protegidas: planner, recetas, lista
    api/             Endpoints REST (auth, recipes, plan, shopping-list, health)
  services/          Lógica de negocio por módulo (auth, recipes, plan, shopping-list)
  middleware.ts      Sesión y protección de rutas
  styles/            Estilos globales y tokens de diseño
tests/               Suite de Vitest, organizada igual que src/
.specs/              Especificaciones funcionales de cada módulo
```

Los *services* reciben la conexión a la base como primer parámetro y no conocen nada de HTTP; los endpoints son delgados: validan, llaman al service y responden.

## API

Todas las rutas, salvo las de `auth` y `health`, requieren sesión (si no, responden `401`). Los errores tienen siempre el mismo formato:

```json
{ "error": { "code": "VALIDATION", "message": "…", "fields": { "campo": "…" } } }
```

| Método y ruta | Descripción |
|---------------|-------------|
| `GET /api/health` | Estado del servicio y versión del esquema |
| `POST /api/auth/register` | Crea una cuenta e inicia sesión |
| `POST /api/auth/login` | Inicia sesión |
| `POST /api/auth/logout` | Cierra la sesión |
| `GET /api/auth/me` | Usuario de la sesión actual |
| `GET /api/recipes` | Lista el catálogo y las recetas propias (`?category=`, `?q=`, `?mine=1`) |
| `POST /api/recipes` | Crea una receta propia |
| `GET` · `PUT` · `DELETE /api/recipes/:id` | Ver, editar o borrar una receta (el catálogo es de solo lectura) |
| `GET /api/plan?week=YYYY-MM-DD` | Plan de una semana (la fecha es el lunes) |
| `PUT` · `DELETE /api/plan/:week/:day/:meal` | Asignar o quitar una receta o comida libre en un turno |
| `POST /api/plan/:week/copy-from/:sourceWeek` | Copiar otra semana en los turnos vacíos |
| `GET /api/shopping-list?week=YYYY-MM-DD` | Lista de compras consolidada de la semana |
| `POST /api/shopping-list/:week/items` | Agregar un ítem manual |
| `DELETE /api/shopping-list/items/:id` | Borrar un ítem manual |

## Seguridad

- Las contraseñas se guardan con `scrypt` y sal propia; nunca en texto plano.
- La sesión es un token aleatorio en una cookie `HttpOnly` y `SameSite=Lax`, válida por 30 días con renovación deslizante. En la base solo se guarda su hash (SHA-256).
- El login tiene límite de intentos fallidos por IP y email (responde `429`).
- El parámetro `?next=` de la redirección posterior al login se valida para evitar redirecciones abiertas.
- Cada usuario solo puede ver y modificar sus propios datos: acceder al recurso de otra cuenta responde `404`.

## Puesta en producción

```bash
npm ci
npm run build
HOST=0.0.0.0 PORT=4321 node dist/server/entry.mjs
```

La aplicación se sirve como un proceso de Node y está pensada para ir detrás de un proxy inverso (por ejemplo, nginx) con HTTPS. En producción la cookie de sesión se marca como `Secure`, así que **necesita HTTPS**. Guardá el archivo de la base (`DATABASE_PATH`) en un directorio persistente y hacé copias de seguridad por tu cuenta.

## Fuera de alcance (por ahora)

- Recuperación de contraseña por email.
- Duplicar recetas del catálogo para modificarlas.
- Sincronizar el tachado de la lista entre dispositivos.
- Escalar cantidades según la cantidad de comensales.
- Aplicación instalable (PWA) o nativa.
