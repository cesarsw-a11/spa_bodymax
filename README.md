# SPA Bodymax

Aplicación web full stack para reservas de un spa: **Next.js 15** (App Router, React 19), **Prisma** y **MySQL**, autenticación con **NextAuth**, pagos con **Stripe** e internacionalización **ES/EN** (`next-intl`).

El frontend y el backend viven en el mismo proyecto: las rutas bajo `src/app/api` son la API REST y el resto son páginas y componentes.

---

## Requisitos previos

Instala en tu máquina:

| Herramienta | Notas |
|-------------|--------|
| **Node.js** | Versión **20 LTS** o superior (recomendado la misma familia que en producción). |
| **pnpm** | Gestor de paquetes usado en el repo. `npm install -g pnpm` |
| **MySQL** | **8.x** (local, Docker o remoto). El `schema` de Prisma usa `provider = "mysql"`. |

Comprueba versiones:

```bash
node -v
pnpm -v
mysql --version
```

---

## 1. Obtener el código

```bash
git clone <url-del-repositorio> spa-bodymax
cd spa-bodymax
```

---

## 2. Base de datos MySQL

1. Crea una base de datos vacía, por ejemplo `spa_bodymax`.
2. Crea un usuario con permisos sobre esa base (o usa `root` solo en desarrollo).

Ejemplo en cliente MySQL:

```sql
CREATE DATABASE spa_bodymax CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spa'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON spa_bodymax.* TO 'spa'@'localhost';
FLUSH PRIVILEGES;
```

Anota usuario, contraseña, host y puerto para el siguiente paso.

---

## 3. Variables de entorno

En la raíz del proyecto existe `.env.example`. Cópialo a `.env` y ajusta los valores.

```bash
cp .env.example .env
```

### Variables obligatorias para desarrollo local

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión Prisma a MySQL. Ejemplo: `mysql://usuario:password@localhost:3306/spa_bodymax` |
| `NEXTAUTH_URL` | URL pública de la app. En local: `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Cadena larga y aleatoria para firmar sesiones. En desarrollo puede ser temporal; en producción debe ser secreta y estable. |
| `ADMIN_EMAIL` | Email del usuario administrador inicial (se crea/actualiza con el seed). |
| `ADMIN_PASSWORD` | Contraseña en texto plano **solo para el seed**; en la base se guarda con hash. |

### Stripe (pagos)

Para probar reservas con pago en local necesitas claves de prueba:

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (necesario si pruebas webhooks; en local suele usarse Stripe CLI). |

Sin Stripe configurado, parte del flujo de pago puede fallar; el resto del sitio (catálogo, admin, reservas sin cobro según tu lógica) puede seguir siendo útil para desarrollo.

### URL pública de la app

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Base URL para enlaces (checkout, etc.). Si no existe, el código usa `NEXTAUTH_URL`. |

### Opcionales (contacto, chat, WhatsApp)

Revisa `.env.example`: `NEXT_PUBLIC_TAWK_*`, `NEXT_PUBLIC_WHATSAPP_E164`, `NEXT_PUBLIC_CONTACT_*`, etc. Si no las defines, algunas secciones usan valores por defecto o se ocultan.

### Subida de imágenes

En **local**, las imágenes de servicios se guardan en disco (`public/uploads/...`). En **Vercel**, si conectas Blob y existe `BLOB_READ_WRITE_TOKEN`, el código puede usar almacenamiento Blob. No hace falta token Blob en tu PC.

---

## 4. Instalar dependencias

```bash
pnpm install
```

---

## 5. Esquema de base de datos y migraciones

Genera el cliente de Prisma y aplica las migraciones sobre tu base **vacía** (primera vez) o actualizada.

**Desarrollo local (recomendado la primera vez):**

```bash
pnpm exec prisma migrate dev
```

Esto aplica todas las carpetas en `prisma/migrations/`, mantiene el historial y regenera `@prisma/client`.

**Solo generar el cliente** (si la base ya está migrada):

```bash
pnpm exec prisma generate
```

**Entorno tipo producción / CI** (sin crear migraciones nuevas):

```bash
pnpm exec prisma migrate deploy
```

El script `pnpm run build` del proyecto ejecuta `prisma generate`, `prisma migrate deploy` y `next build`, pensado para despliegues donde la base ya existe.

---

## 6. Datos iniciales (seed)

El archivo `prisma/seed.ts` solo crea el usuario **ADMIN** inicial (superadmin: sin `adminRoleId`). **No** inserta servicios, complementos ni testimonios: el catálogo queda vacío hasta que lo cargues desde el panel.

```bash
pnpm exec prisma db seed
```

Credenciales de acceso al panel: los valores de `ADMIN_EMAIL` y `ADMIN_PASSWORD` de tu `.env`.

Puedes ejecutar el seed más de una vez: si ya existe un usuario con ese email, no se sobrescribe la contraseña ni otros datos (`upsert` con `update` vacío). Para un admin distinto, cambia `ADMIN_EMAIL` en `.env` y vuelve a ejecutar el seed.

---

## 7. Arrancar en desarrollo

```bash
pnpm dev
```

Abre el navegador en [http://localhost:3000](http://localhost:3000). Con `next-intl` y `localePrefix: "always"`, las rutas públicas incluyen idioma:

- Español (por defecto): [http://localhost:3000/es](http://localhost:3000/es)
- Inglés: [http://localhost:3000/en](http://localhost:3000/en)

**Inicio de sesión admin:** [http://localhost:3000/es/auth/login](http://localhost:3000/es/auth/login) (también válido con `/en/...`).

**Panel administración:** rutas bajo `/es/admin/...` (por ejemplo `/es/admin`).

### Superadmin vs empleados con rol

- **Superadmin:** usuario `ADMIN` **sin** `adminRoleId` (o no asignado). Puede gestionar roles, empleados y tiene acceso completo a módulos.
- **Admin con rol:** usuario `ADMIN` con un `AdminRole` en base de datos; solo ve y usa los módulos permitidos en ese rol.

---

## 8. Comprobación rápida “todo OK”

1. `pnpm dev` sin errores en consola.
2. `/es` carga inicio; si hay servicios en BD, aparecen en zonas/testimonios según datos.
3. Login admin con el usuario del seed.
4. `/es/admin` muestra enlaces según permisos (superadmin ve todo).
5. Crear una reserva de prueba (y pago test si Stripe está configurado).

---

## 9. Lint y build local

```bash
pnpm lint
pnpm build
```

`pnpm build` aplica migraciones con `migrate deploy`; úsalo contra una base que puedas migrar (no necesariamente la misma que `migrate dev` si gestionas varios entornos).

---

## 10. Despliegue (referencia)

En **Vercel** (u otro host) configura las mismas variables de entorno, incluida `DATABASE_URL` de tu MySQL gestionado, `NEXTAUTH_URL` con la URL real del sitio, `NEXTAUTH_SECRET` seguro y claves Stripe de entorno correspondiente. El comando de build del proyecto ya incluye `prisma migrate deploy` antes de `next build`.

Si una migración falló en producción y quedó el historial bloqueado, revisa la documentación de Prisma sobre `prisma migrate resolve` y el estado en `_prisma_migrations`; no mezcles comandos de recuperación en el build permanente sin necesidad.

---

## Estructura útil del proyecto

| Ruta | Contenido |
|------|-----------|
| `src/app/[locale]/` | Páginas públicas y admin por idioma |
| `src/app/api/` | Rutas API |
| `prisma/schema.prisma` | Modelos y migraciones |
| `messages/es.json`, `messages/en.json` | Textos i18n |

---

## Solución de problemas

- **Error de conexión a MySQL:** revisa `DATABASE_URL`, que el servidor MySQL esté en marcha y que el usuario tenga permisos sobre la base.
- **Prisma Client desactualizado:** `pnpm exec prisma generate`.
- **Migraciones pendientes o fallidas:** `pnpm exec prisma migrate status`; en desarrollo a veces ayuda `migrate dev` tras resolver conflictos.
- **Sesión / login:** `NEXTAUTH_URL` debe coincidir con la URL desde la que abres el sitio (incluido `http` vs `https` y puerto).

Para más detalle sobre Next.js: [documentación de Next.js](https://nextjs.org/docs).
