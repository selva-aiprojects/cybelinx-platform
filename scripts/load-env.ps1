param(
    [Parameter(Mandatory = $true)]
    [string]$EnvFile,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

# Load a root .env into the process environment so Spring Boot / Next picks it
# up like exported variables (this repo keeps everything in .env; nothing reads
# .env natively on Windows).

$ErrorActionPreference = 'Stop'

$lines = Get-Content -LiteralPath $EnvFile
foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
        continue
    }
    if ($trimmed -match '^([A-Za-z_][A-Za-z0-9_]*)=') {
        $key = $Matches[1]
        $value = $trimmed.Substring($trimmed.IndexOf('=') + 1).Trim()
        if ($value.Length -ge 2) {
            $Quote = $value[0]
            if (($Quote -eq '"' -or $Quote -eq "'") -and $value[$value.Length - 1] -eq $Quote) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

$runDir = (Resolve-Path -LiteralPath $WorkingDirectory).Path
if ([System.IO.Path]::IsPathRooted($Command)) {
    $cmdPath = $Command
} else {
    $cmdPath = Join-Path $runDir $Command
}
$executable = (Resolve-Path -LiteralPath $cmdPath).Path
Set-Location -LiteralPath $runDir
& $executable @Arguments
exit $LASTEXITCODE