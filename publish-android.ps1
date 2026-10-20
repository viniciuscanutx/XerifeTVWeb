# Gera o APK Android do XerifeTV (Capacitor) em .\publish-android\XerifeTV.apk
#
# Requisitos (já instalados nesta máquina): JDK 21 e Android SDK (platform 36).
# APK de debug: instala direto no celular (permitir "fontes desconhecidas"), sem Play Store.
#
# Uso: .\publish-android.ps1
$ErrorActionPreference = 'Stop'
$webRoot = $PSScriptRoot
$outputFolder = Join-Path $webRoot 'publish-android'

# Capacitor 8 exige JDK 21; o JAVA_HOME da máquina pode apontar pra outra versão
$jdk21 = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $jdk21) { throw 'JDK 21 não encontrado em C:\Program Files\Eclipse Adoptium.' }
$env:JAVA_HOME = $jdk21.FullName
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

Push-Location $webRoot
# Avisos de build vão pro stderr; no PowerShell 5.1 isso vira erro fatal com 'Stop'
$ErrorActionPreference = 'Continue'
try {
    Write-Host '==> Build do Angular...' -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build do Angular.' }

    Write-Host '==> Sincronizando com o projeto Android...' -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Falha no cap sync.' }

    Write-Host '==> Gerando o APK...' -ForegroundColor Cyan
    Push-Location (Join-Path $webRoot 'android')
    try {
        .\gradlew.bat assembleDebug
        if ($LASTEXITCODE -ne 0) { throw 'Falha no build do APK.' }
    } finally {
        Pop-Location
    }
} finally {
    $ErrorActionPreference = 'Stop'
    Pop-Location
}

New-Item -ItemType Directory -Force $outputFolder | Out-Null
$apkPath = Join-Path $outputFolder 'XerifeTV.apk'
Copy-Item (Join-Path $webRoot 'android\app\build\outputs\apk\debug\app-debug.apk') $apkPath -Force
Write-Host "==> Pronto: $apkPath" -ForegroundColor Green
