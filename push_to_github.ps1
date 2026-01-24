# Script: push_to_github.ps1
# Uso: Ejecutar en PowerShell desde la carpeta appwebcobro
# Este script inicializa git si hace falta, añade/actualiza el remoto y hace push a main.

$repoUrl = 'https://github.com/carlosmontesdeocae321-oss/appwebcobro.git'
$branch = 'main'

Write-Host "[push_to_github] Directorio: $(Get-Location)"

# Comprueba si git está instalado
try {
    git --version > $null 2>&1
} catch {
    Write-Error "Git no está instalado o no está en PATH. Instala Git y vuelve a intentarlo."
    exit 1
}

# Inicializar repo si no existe
if (-not (Test-Path .git)) {
    Write-Host "Inicializando repositorio git..."
    git init
    git add .
    git commit -m "Inicial: appwebcobro dashboard" -q
} else {
    Write-Host "Repositorio git ya inicializado."
}

# Forzar nombre de rama main
try {
    git branch --show-current > $null 2>&1
    git branch -M $branch
} catch {
    # ignore
}

# Añadir remoto si no existe
$remoteExists = $false
try {
    $url = git remote get-url origin 2>$null
    if ($LASTEXITCODE -eq 0 -and $url) { $remoteExists = $true }
} catch {
    $remoteExists = $false
}

if (-not $remoteExists) {
    Write-Host "Añadiendo remoto origin -> $repoUrl"
    git remote add origin $repoUrl
} else {
    Write-Host "Remoto origin ya existe: $url"
}

Write-Host "Empujando a $repoUrl ($branch)..."
try {
    git push -u origin $branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Push completado con éxito. Verifica en GitHub: $repoUrl"
        exit 0
    } else {
        Write-Warning "Push falló. Puede requerir autenticación."
    }
} catch {
    Write-Warning "Error durante git push: $_"
}

# Intento alternativo usando credenciales HTTP (opcional, inseguro)
Write-Host "Si Git solicita credenciales, puedes usar tu usuario GitHub y un Personal Access Token (PAT) como contraseña."
Write-Host "Para crear un PAT recomendado: https://github.com/settings/tokens (fine-grained, expiración corta, permisos: contents write en este repo)."

Write-Host "Si quieres que el script intente usar un PAT temporal (se almacenará en la URL solo para este push), pega el PAT ahora (no se guardará):"
$pat = Read-Host -AsSecureString "Introduce PAT (o ENTER para cancelar)"

if ($pat -and $pat.Length -gt 0) {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pat)
    $unsecure = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

    # Construir URL con token (temporal)
    $u = $repoUrl -replace '^https://', "https://$unsecure@"
    Write-Host "Intentando push usando URL temporal con PAT..."
    try {
        git remote remove temp-origin 2>$null
    } catch {}
    git remote add temp-origin $u
    git push -u temp-origin $branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Push completado con temp-origin. Eliminando remote temporal."
        git remote remove temp-origin
        exit 0
    } else {
        Write-Warning "Push con PAT falló. No se ha modificado remote origin."
        try { git remote remove temp-origin } catch {}
    }
}

Write-Error "No se pudo completar el push. Revisa mensajes anteriores. Si necesitas, cópialos y pégalos aquí para que te ayude."