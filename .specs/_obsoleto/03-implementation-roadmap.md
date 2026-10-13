# Spec 03: Hoja de Ruta para Claude Code - PlaniComida

## Instrucciones para el Agente Claude Code:
Sigue estas tareas en orden secuencial. Ejecuta tests o verificaciones tras cada paso.

### Fase 1: Setup Backend
1. Inicializar `backend/` con Node.js, Express, `cors`, `dotenv` y `better-sqlite3`.
2. Crear script de inicialización de la base de datos `db/init.sql` e insertar 5 recetas por defecto.
3. Crear endpoints REST para `/api/recipes` y `/api/plan`.
4. Implementar el algoritmo de consolidación en `/api/shopping-list`.

### Fase 2: Setup Frontend (Astro)
1. Inicializar `frontend/` usando Astro + Tailwind CSS.
2. Crear un Layout limpio y responsive enfocado en dispositivos móviles.
3. Crear la vista `/` (Landing explicativa SSG).
4. Crear la vista `/planner` (Grid semanal interactivo SSR para asignar comidas).
5. Crear la vista `/lista` (Lista de compras interactiva con checkboxes para ir tachando items en el supermercado).

### Fase 3: Integración y Verificación
1. Conectar las islas de Astro con la API del backend.
2. Verificar que no haya errores de CORS y que la consolidación de ingredientes sume correctamente cantidades del mismo tipo.