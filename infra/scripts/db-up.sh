#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Starting local PostgreSQL container..."
docker compose -f "$ROOT/infra/docker/docker-compose.yml" up -d postgres

echo "Waiting for PostgreSQL to become healthy..."
docker compose -f "$ROOT/infra/docker/docker-compose.yml" ps postgres

echo "PostgreSQL ready: postgresql://cybelinx:cybelinx_dev_password@localhost:5432/cybelinx_platform"