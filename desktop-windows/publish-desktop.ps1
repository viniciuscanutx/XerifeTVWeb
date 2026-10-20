# Gera o app Windows do XerifeTV em .\publish:
#   publish\XerifeTV.exe   -> janela (WebView2)
#   publish\app\           -> build do Angular que a janela carrega
#
# Uso: .\publish-desktop.ps1   (ou .\publish-desktop.ps1 -Output D:\Apps\XerifeTV)
param(
    [string]$Output = (Join-Path $PSScriptRoot 'publish')
)

$ErrorActionPreference = 'Stop'
$webRoot = Split-Path $PSScriptRoot -Parent
$distFolder = Join-Path $webRoot 'dist\XerifeTVWeb\browser'
$appFolder = Join-Path $Output 'app'

Write-Host '==> Build do Angular...' -ForegroundColor Cyan
Push-Location $webRoot
# O Angular escreve avisos (ex: budget de CSS) no stderr; no PowerShell 5.1 isso vira erro
# fatal com 'Stop'. Quem decide se falhou é o exit code.
$ErrorActionPreference = 'Continue'
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build do Angular.' }
} finally {
    $ErrorActionPreference = 'Stop'
    Pop-Location
}

Write-Host '==> Publicando a janela desktop...' -ForegroundColor Cyan
dotnet publish (Join-Path $PSScriptRoot 'XerifeTV.Desktop.csproj') -c Release -r win-x64 --self-contained true -o $Output
if ($LASTEXITCODE -ne 0) { throw 'Falha ao publicar o app desktop.' }

Write-Host '==> Copiando o build do Angular...' -ForegroundColor Cyan
if (Test-Path $appFolder) { Remove-Item $appFolder -Recurse -Force }
Copy-Item $distFolder $appFolder -Recurse

Write-Host "==> Pronto: $(Join-Path $Output 'XerifeTV.exe')" -ForegroundColor Green
