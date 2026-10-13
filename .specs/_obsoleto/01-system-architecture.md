# Spec 01: Arquitectura del Sistema - PlaniComida

## 1. Contexto y Visión General
PlaniComida es una aplicación web intuitiva para usuarios no técnicos que permite planificar menús semanales de comida y generar automáticamente listas de supermercado consolidadas.

## 2. Stack Tecnológico
- **Entorno Local:** Linux Mint / VS Code / Claude Code CLI.
- **Frontend:** Astro (SSR + SSG con islas de interactividad usando UI components simples o Vanilla JS/Nanostores según necesidad).
- **Backend:** Node.js v20+ con Express.js.
- **Base de Datos:** SQLite3 (vía `better-sqlite3` o Kysely/Prisma de bajo overhead).
- **Estilos:** Tailwind CSS.

## 3. Arquitectura del Proyecto (Monorepo o Carpeta Única)
planicomida/
├── .specs/
├── backend/
│   ├── src/
│   │   ├── config/ (db.js)
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── app.js
│   ├── db/ (schema.sql, migrations)
│   └── package.json
└── frontend/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/ (index.astro, app/planner.astro, app/lista.astro)
│   └── services/ (api.ts)
└── package.json

## 4. Requisitos No Funcionales
- Tiempo de respuesta de API < 100ms.
- Renderizado inicial ultrarrápido vía Astro SSG/SSR.
- Persistencia local y simple en SQLite.