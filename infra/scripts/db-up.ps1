<#
.SYNOPSIS
  Start the local PostgreSQL container via Docker Compose.

.DESCRIPTION
  Starts the postgres service defined in infra/docker/docker-compose.yml.
  The script assumes Docker Desktop is running.
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host 'Starting local PostgreSQL container...' -ForegroundColor Cyan
docker compose -f "$root/infra/docker/docker-compose.yml" up -d postgres

if ($LASTEXITCODE -ne 0) {
  Write-Error 'Failed to start the PostgreSQL container.'
  exit 1
}

Write-Host ''
Write-Host 'Waiting for PostgreSQL to become healthy...' -ForegroundColor Cyan
docker compose -f "$root/infra/docker/docker-compose.yml" exec -T postgres pg_isready -U cybelinx -d cybelinx_platform 2>&1

if ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host 'PostgreSQL is ready:  postgresql://cybelinx:cybelinx_dev_password@localhost:5432/cybelinx_platform' -ForegroundColor Green
} else {
  Write-Host ''
  Write-Host 'PostgreSQL may still be starting — run: docker compose -f "$root/infra/docker/docker-compose.yml" ps' -ForegroundColor Yellow
}