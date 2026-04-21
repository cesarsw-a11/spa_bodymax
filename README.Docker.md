# SPA Bodymax — Guía Docker

Esta guía explica cómo levantar el proyecto con Docker en cualquier sistema que
tenga Docker Engine y Docker Compose. No requiere instalar Node.js, npm ni
MySQL en la máquina: todo corre en contenedores.

Para el flujo de desarrollo tradicional (sin Docker), ver
[`README.md`](README.md).

---

## Requisitos previos

Una vez por máquina:

- [Docker Engine](https://docs.docker.com/engine/install/) 20 o superior.
- Docker Compose v2 (incluido como subcomando `docker compose` en versiones
  modernas de Docker).
- [git](https://git-scm.com/).

Comprobar versiones:

```bash
docker --version
docker compose version
git --version
```

---

## 1. Clonar el repositorio

```bash
git clone <URL-del-repo> spa-bodymax
cd spa-bodymax
```

---

## 2. Crear el archivo `.env`

```bash
cp .env.example .env
```

Luego edita `.env` y ajusta como mínimo:

```env
NEXTAUTH_SECRET=pon-aqui-algo-largo-y-aleatorio
ADMIN_EMAIL=admin@spabodymax.com
ADMIN_PASSWORD=admin123
```

### Stripe (opcional en desarrollo)

Si vas a probar el flujo de pagos, añade las claves de prueba:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Credenciales de MySQL (opcional)

`docker-compose.yml` usa valores por defecto si no defines las variables. Si
quieres controlarlas, añade:

```env
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=spa_bodymax
MYSQL_USER=spa
MYSQL_PASSWORD=spapass
```

> No hace falta definir `DATABASE_URL`: compose la construye automáticamente
> apuntando al contenedor `db` con las credenciales anteriores.

---

## 3. Construir y levantar la aplicación

```bash
docker compose up -d --build
```

Qué hace internamente:

1. Descarga `mysql:8.0` y `node:20-bookworm-slim` si no están en la caché
   local.
2. Construye la imagen de la app en cuatro etapas: `deps`, `prod-deps`,
   `builder`, `runner`.
3. Arranca el servicio `db` y espera a su healthcheck.
4. Arranca el servicio `app`, que ejecuta `prisma migrate deploy` y luego
   `node server.js` (Next en modo standalone).

La primera ejecución tarda varios minutos (instala dependencias y corre
`next build`). Las siguientes son mucho más rápidas gracias a la caché de
Docker.

---

## 4. Verificar que todo arrancó correctamente

```bash
docker compose ps
```

Resultado esperado:

- `spa-bodymax-db`: `Up (healthy)`.
- `spa-bodymax-app`: `Up` (no `Restarting`).

Logs en vivo de la app:

```bash
docker compose logs -f app
```

Debe aparecer algo como `Listening on 0.0.0.0:3000` o `Ready in ...`. Ctrl+C
para salir de los logs sin detener el contenedor.

---

## 5. Crear el usuario administrador inicial (seed)

El seed crea un único usuario `ADMIN` con los valores de `ADMIN_EMAIL` y
`ADMIN_PASSWORD` del `.env`. Es idempotente: si ya existe, no se sobreescribe.

```bash
docker compose --profile tools run --rm seed
```

El servicio `seed` está marcado con `profiles: ["tools"]`, por lo que **no**
se levanta con `docker compose up`; solo cuando se invoca explícitamente.

---

## 6. Abrir la aplicación

- Sitio público: [http://localhost:3000/es](http://localhost:3000/es) (también
  `/en`).
- Login admin:
  [http://localhost:3000/es/auth/login](http://localhost:3000/es/auth/login).
- Panel admin:
  [http://localhost:3000/es/admin](http://localhost:3000/es/admin).

Credenciales: las definidas en `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`.

---

## Comandos útiles del día a día

| Qué quieres hacer                          | Comando                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Ver estado de contenedores                 | `docker compose ps`                                                                  |
| Logs en vivo de la app                     | `docker compose logs -f app`                                                         |
| Logs en vivo de MySQL                      | `docker compose logs -f db`                                                          |
| Detener (sin borrar datos)                 | `docker compose stop`                                                                |
| Volver a arrancar                          | `docker compose start`                                                               |
| Reiniciar solo la app                      | `docker compose restart app`                                                         |
| Detener y borrar contenedores (datos OK)   | `docker compose down`                                                                |
| Detener y borrar TAMBIÉN la BD y uploads   | `docker compose down -v`                                                             |
| Reconstruir tras cambios de código         | `docker compose up -d --build`                                                       |
| Entrar al contenedor de la app             | `docker compose exec app sh`                                                         |
| Entrar a MySQL                             | `docker compose exec db mysql -uspa -pspapass spa_bodymax`                           |
| Aplicar migraciones manualmente            | `docker compose exec app node ./node_modules/prisma/build/index.js migrate deploy`   |
| Volver a correr el seed                    | `docker compose --profile tools run --rm seed`                                       |

---

## Arquitectura de los contenedores

```
┌──────────────┐         ┌──────────────┐
│  Navegador   │ :3000 → │  app (Next)  │
└──────────────┘         │  server.js   │
                         └──────┬───────┘
                                │ Prisma
                                ▼
                         ┌──────────────┐
                         │  db (MySQL)  │ :3306
                         └──────┬───────┘
                                │
                        ┌───────┴────────┐
                        │                │
                  volumen db_data   volumen uploads_data
                  (datos MySQL)     (imágenes subidas)
```

- `db_data` persiste la base de datos entre reinicios y `down` (sin `-v`).
- `uploads_data` persiste las imágenes subidas por admin en
  `public/uploads/services`.

---

## Troubleshooting

### Puerto 3000 ocupado

Si tienes otro servicio escuchando en `3000` (por ejemplo un `npm run dev`
local), para el otro servicio o cambia el mapeo en `docker-compose.yml` a algo
como `"3001:3000"`.

### Puerto 3306 ocupado (MySQL local)

Si ya tienes un MySQL corriendo en el host en `3306`, comenta la sección
`ports:` del servicio `db` en `docker-compose.yml` o cámbiala a `"3307:3306"`.

### Build falla con `EAI_AGAIN fonts.googleapis.com`

El daemon de Docker no resuelve DNS durante el build. El `docker-compose.yml`
ya usa `network: host` en el build de `app` para mitigarlo. Si aún así falla,
configura DNS globalmente en el daemon:

```bash
sudo mkdir -p /etc/docker
echo '{"dns": ["1.1.1.1", "8.8.8.8"]}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

### App en bucle `Restarting`

Revisa el error real:

```bash
docker compose logs --tail 80 app
```

Causas típicas: migración de Prisma fallida, `DATABASE_URL` incorrecta, falta
de una variable obligatoria, o MySQL no llegó a estar `healthy` a tiempo.

### Error `Cannot find module 'effect'` al arrancar la app

Ya está cubierto por el Dockerfile, pero si reaparece tras cambios: asegúrate
de que la etapa `prod-deps` está presente en el Dockerfile y que el runner
copia `node_modules` desde ahí.

### Quiero empezar desde cero borrando la base de datos

```bash
docker compose down -v
docker compose up -d --build
docker compose --profile tools run --rm seed
```

---

## Consideraciones para producción

Si vas a desplegar esto en un servidor real (no en la laptop de desarrollo):

- Cambia todos los secretos del `.env` a valores fuertes y únicos
  (`NEXTAUTH_SECRET`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, etc.).
- Ajusta `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` a la URL pública real, con
  `https://`.
- Configura Stripe con claves `live` y crea el webhook apuntando a
  `https://tu-dominio/api/stripe/webhook`.
- Pon un reverse proxy (Nginx, Caddy, Traefik) delante del puerto 3000 para
  terminar TLS/HTTPS.
- Programa un backup periódico del volumen `db_data`, por ejemplo con
  `docker compose exec db mysqldump -uroot -p... spa_bodymax > backup.sql`.
- Considera usar secretos de Docker o un gestor externo (Vault, AWS Secrets
  Manager, etc.) en vez de un `.env` plano.

---

## Archivos clave de la contenerización

| Archivo                                      | Propósito                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| [`Dockerfile`](Dockerfile)                   | Imagen multi-etapa de la app (`deps`, `prod-deps`, `builder`, `runner`).|
| [`docker-compose.yml`](docker-compose.yml)   | Orquesta `db`, `app` y el servicio on-demand `seed`.                    |
| [`.dockerignore`](.dockerignore)             | Excluye del contexto de build lo que no debe llegar a la imagen.        |
| [`docker-entrypoint.sh`](docker-entrypoint.sh) | Ejecuta migraciones antes de lanzar `node server.js`.                  |
