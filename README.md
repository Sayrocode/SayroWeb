Vercel App (sin scrapers)

Este directorio contiene una app Next.js lista para desplegar en Vercel.
Se apoya en el código del directorio raíz (`src/**`) mediante `experimental.externalDir=true`,
pero NO incluye las rutas de scrapers de EgoRealEstate.

Cómo desplegar

1) En Vercel, configura "Root Directory" = `vercel-app`.
2) Variables de entorno necesarias (en el proyecto de Vercel):
   - TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
   - DATABASE_URL (solo si usas SQLite local)
   - META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID, META_GRAPH_VERSION (opcional)
   - EASYBROKER_API_KEY (para importar contactos y propiedades desde EasyBroker)
   - SITE_BASE_URL (https://tu-dominio)
   - ADMIN_USERNAME, ADMIN_PASSWORD (solo para bootstrap inicial)
3) Vercel ejecutará `yarn install` y `prisma generate` (postinstall) en `vercel-app`.
4) La app expone:
   - Catálogo público: `/`, `/propiedades`, `/propiedades/[id]`
   - Admin: `/admin` (panel), `/admin/leads`, `/admin/contacts`
   - API de administración (propiedades, leads, contactos, meta ads), sin scrapers (no existen rutas `/api/admin/ego/*`).
