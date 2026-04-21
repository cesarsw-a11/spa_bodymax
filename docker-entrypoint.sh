#!/bin/sh
set -e

echo "[entrypoint] Aplicando migraciones de Prisma (migrate deploy)..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Migraciones aplicadas. Iniciando Next.js..."
exec "$@"
