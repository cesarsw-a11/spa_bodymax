# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# Etapa 1: dependencias
# ----------------------------------------------------------------------------
# Empezamos con una imagen que ya trae Node.js 20 y Debian liviano.
FROM node:20-bookworm-slim AS deps
# Esta sera la carpeta principal de trabajo dentro del contenedor.
WORKDIR /app

# Actualizamos lista de paquetes, instalamos lo necesario y limpiamos cache para no engordar la imagen.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copiamos solo archivos de dependencias para aprovechar la cache de Docker.
COPY package.json package-lock.json ./
# Instalamos dependencias exactas usando package-lock.json.
RUN npm ci

# ----------------------------------------------------------------------------
# Etapa 2: dependencias solo de producción (con todas sus transitivas)
# Se usa en el runner para que el CLI de Prisma encuentre sus deps
# (p. ej. `effect`, que @prisma/config requiere y que el standalone
# tree-shake de Next excluye por no ser parte del runtime de la app).
# ----------------------------------------------------------------------------
# Nueva etapa para tener un node_modules solo de produccion.
FROM node:20-bookworm-slim AS prod-deps
# Usamos /app como carpeta de trabajo.
WORKDIR /app

# Instalamos paquetes del sistema necesarios y limpiamos residuos.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copiamos manifiestos de npm.
COPY package.json package-lock.json ./
# Instalamos unicamente dependencias de produccion (sin devDependencies).
RUN npm ci --omit=dev

# ----------------------------------------------------------------------------
# Etapa 3: build (genera cliente Prisma + compila Next en modo standalone)
# ----------------------------------------------------------------------------
# Etapa de construccion de la app.
FROM node:20-bookworm-slim AS builder
# Carpeta de trabajo para compilar.
WORKDIR /app

# Preparamos el sistema base para build.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Desactivamos telemetria de Next.js.
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy: prisma generate no conecta a la BD; este valor es solo para satisfacer la validación.
# Variable "de mentira" para que Prisma pase validaciones durante el build.
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"

# Reutilizamos node_modules instalado en la etapa deps para acelerar.
COPY --from=deps /app/node_modules ./node_modules
# Copiamos todo el codigo del proyecto.
COPY . .

# Generamos cliente de Prisma y luego compilamos Next.js.
RUN npx prisma generate \
    && npx next build

# ----------------------------------------------------------------------------
# Etapa 4: runner (imagen mínima de ejecución)
# ----------------------------------------------------------------------------
# Etapa final: la imagen que realmente correra en produccion.
FROM node:20-bookworm-slim AS runner
# Carpeta de trabajo de la app final.
WORKDIR /app

# Instalamos lo minimo, limpiamos cache y creamos usuario no-root por seguridad.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Indicamos modo produccion para Node.js.
ENV NODE_ENV=production
# Desactivamos telemetria de Next.js.
ENV NEXT_TELEMETRY_DISABLED=1
# Puerto interno donde escuchara la app.
ENV PORT=3000
# Hacemos que la app escuche en todas las interfaces de red.
ENV HOSTNAME=0.0.0.0

# Salida standalone de Next (trae server.js y un node_modules tree-shaken).
# Copiamos el build standalone generado por Next y asignamos propietario correcto.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Sobreescribimos node_modules con todas las deps de producción para que el
# CLI de Prisma (migrate deploy) encuentre sus transitivas (p. ej. `effect`).
# Copiamos dependencias de produccion completas desde prod-deps.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# Cliente Prisma generado por `prisma generate` durante el build.
# Copiamos archivos generados de Prisma necesarios en runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# Copiamos assets estaticos de Next.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copiamos carpeta publica (imagenes, iconos, etc).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Esquema y migraciones de Prisma para `migrate deploy` en arranque.
# Copiamos esquema y migraciones para poder ejecutar migrate deploy al iniciar.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copiamos script de arranque al PATH del contenedor.
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Damos permiso de ejecucion al script de arranque.
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Ejecutamos la app como usuario no-root (mas seguro).
USER nextjs

# Documentamos que el contenedor usa el puerto 3000.
EXPOSE 3000

# Comando fijo de entrada: primero corre el script.
ENTRYPOINT ["docker-entrypoint.sh"]
# Comando por defecto: inicia el servidor de Next standalone.
CMD ["node", "server.js"]
