<#
.SYNOPSIS
  Stop and remove the local PostgreSQL container (data volume is kept).

.DESCRIPTION
  Stops the postgres service. To also delete the named volume run:
  docker compose -f infra/docker/docker-compose.yml down -v
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host 'Stopping local PostgreSQL container...' -ForegroundColor Cyan
docker compose -f "$root/infra/docker/docker-compose.yml" down postgres

if ($LASTEXITCODE -ne 0) {
  Write-Error 'Failed to stop the PostgreSQL container.'
  exit 1
}

Write-Host 'PostgreSQL container stopped (data volume preserved).' -ForegroundColor Green