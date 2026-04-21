# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# Etapa 1: dependencias
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------------------------------------------------------
# Etapa 2: dependencias solo de producción (con todas sus transitivas)
# Se usa en el runner para que el CLI de Prisma encuentre sus deps
# (p. ej. `effect`, que @prisma/config requiere y que el standalone
# tree-shake de Next excluye por no ser parte del runtime de la app).
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ----------------------------------------------------------------------------
# Etapa 3: build (genera cliente Prisma + compila Next en modo standalone)
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1
# Dummy: prisma generate no conecta a la BD; este valor es solo para satisfacer la validación.
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate \
    && npx next build

# ----------------------------------------------------------------------------
# Etapa 4: runner (imagen mínima de ejecución)
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Salida standalone de Next (trae server.js y un node_modules tree-shaken).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Sobreescribimos node_modules con todas las deps de producción para que el
# CLI de Prisma (migrate deploy) encuentre sus transitivas (p. ej. `effect`).
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# Cliente Prisma generado por `prisma generate` durante el build.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Esquema y migraciones de Prisma para `migrate deploy` en arranque.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
