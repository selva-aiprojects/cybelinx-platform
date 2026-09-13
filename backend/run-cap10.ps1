$ErrorActionPreference = 'Stop'
$jdk = 'C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot'
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;" + $env:Path
Set-Location -LiteralPath 'D:\Training\working\Cybelinx-platform\backend'
& .\mvnw.cmd -f 'D:\Training\working\Cybelinx-platform\backend\pom.xml' -o -q -pl central-api -am -Dtest=TenantStorageIsolationIT -Dsurefire.failIfNoSpecifiedTests=false -DfailIfNoTests=false test 2>&1 | Tee-Object -FilePath 'D:\Training\working\Cybelinx-platform\backend\cap10-run.log'
Write-Output '--- CAP10 RUN TAIL ---'
Get-Content -LiteralPath 'D:\Training\working\Cybelinx-platform\backend\cap10-run.log' -Tail 60
