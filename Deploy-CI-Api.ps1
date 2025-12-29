param (
    [Parameter(Mandatory=$true)]
    [string]$ClientKey
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

# --- 1. CONFIGURACIÓN ---
$BasePath = "D:\ZeroClm\_webapp" 

# Asegúrate de que el "AppPoolName" sea correcto. 
# Por defecto IIS le pone el mismo nombre que al Sitio o la Aplicación.
$environments = @{
    "qa"   = @{ IisSiteName="ZeroApiQA"; AppPoolName="ZeroApiQA"; PhysicalPath="$BasePath\ZeroApiQA" };
    "prod" = @{ IisSiteName="ZeroApiProd"; AppPoolName="ZeroApiProd"; PhysicalPath="$BasePath\ZeroApiProd" };
}

if (-not $environments.ContainsKey($ClientKey)) { 
    Write-Error "Ambiente no encontrado: $ClientKey"
    exit 1 
}

$envConfig = $environments[$ClientKey]
$dest = $envConfig.PhysicalPath
Write-Host "--- DESPLIEGUE START: $($envConfig.IisSiteName) ---" -ForegroundColor Cyan

# --- 2. PONER SITIO EN MANTENIMIENTO (CRÍTICO PARA WINDOWS) ---
# Esto libera los bloqueos de archivos de node.exe inmediatamente
Write-Host "   [LOCK] Creando app_offline.htm para liberar archivos..."
$offlineContent = "<html><body><h1>Actualizando sistema... espere un momento.</h1></body></html>"
if (Test-Path $dest) {
    Set-Content -Path "$dest\app_offline.htm" -Value $offlineContent
}

# Pausa breve para asegurar que iisnode mató los procesos
Start-Sleep -Seconds 5

# --- 3. DETENER APP POOL (DOBLE SEGURIDAD) ---
# Stop-WebSite no siempre mata los w3wp.exe, Stop-WebAppPool sí.
Write-Host "   [STOP] Deteniendo AppPool..."
try { 
    Stop-WebAppPool -Name $envConfig.AppPoolName -ErrorAction SilentlyContinue 
} catch { 
    Write-Warning "No se pudo detener el AppPool (quizás no existe aún)." 
}

# --- 4. COPIAR ARCHIVOS ---
Write-Host "   [COPY] Copiando archivos..."
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }

# Excluimos node_modules origen porque haremos install limpio en destino
# Excluimos app_offline.htm para no sobrescribir el que acabamos de poner
$excluded = @(".git", ".gitlab-ci.yml", "test", "coverage", "Deploy-CI-Api.ps1", "app_offline.htm")

Get-ChildItem -Path $PWD -Exclude $excluded | Where-Object { $_.Name -ne "node_modules" } | Copy-Item -Destination $dest -Recurse -Force

# Copiamos explícitamente configs
Copy-Item "package.json" -Destination $dest -Force
Copy-Item "package-lock.json" -Destination $dest -Force
Copy-Item "knexfile.js" -Destination $dest -Force

# El web.config es delicado, solo copiar si es necesario o si cambió
if (Test-Path "web.config") { Copy-Item "web.config" -Destination $dest -Force }

# --- 5. NPM INSTALL ---
Write-Host "   [NPM] Instalando dependencias en destino (INCLUYENDO DEV)..."
Push-Location $dest

try {
    npm install --no-audit --prefer-offline
    
    if ($LASTEXITCODE -ne 0) { throw "NPM INSTALL devolvió código de error" }
} catch {
    Write-Warning "Fallo npm install..."
    throw $_
}

# --- 6. DB MIGRATIONS ---
Write-Host "   [DB] Ejecutando Migraciones y Seeds..."
try {
    npx knex migrate:latest
    if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar migraciones" }
    
    npx knex seed:run
    if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar seeds" }
} catch {
    Write-Error "Fallo en base de datos: $_"
    # IMPORTANTE: No salimos aquí, intentamos levantar el sitio aunque falle la BD para ver logs
}

Pop-Location

# --- 7. RESTAURAR SERVICIO ---
Write-Host "   [START] Iniciando AppPool..."
try { Start-WebAppPool -Name $envConfig.AppPoolName } catch { Write-Warning "No se pudo iniciar el AppPool." }

# Borramos app_offline.htm al final, esto "enciende" el sitio de nuevo
Write-Host "   [UNLOCK] Eliminando app_offline.htm..."
if (Test-Path "$dest\app_offline.htm") {
    Remove-Item "$dest\app_offline.htm" -Force
}

# "Despertamos" el sitio con una petición dummy (opcional)
# Esto hace que el primer usuario no tenga que esperar la carga de Node
# try { Invoke-WebRequest -Uri $envConfig.ApiUrl -UseBasicParsing | Out-Null } catch {}

Write-Host "[OK] Despliegue completado." -ForegroundColor Green