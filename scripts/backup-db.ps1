# ==============================================================================
# Script de Sauvegarde Automatique de la Base de Données Archivéo (PostgreSQL)
# ==============================================================================
# Utilisation : .\scripts\backup-db.ps1 [-BackupDir ".\backups"] [-DbName "archiveo_db"]
# ==============================================================================

param (
    [string]$BackupDir = ".\backups",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbUser = "postgres",
    [string]$DbName = "archiveo_db"
)

$DateStamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = Join-Path $BackupDir "backup_archiveo_${DateStamp}.dump"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[INFO] Dossier de sauvegarde créé : $BackupDir" -ForegroundColor Cyan
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   SAUVEGARDE AUTOMATIQUE POSTGRESQL — ARCHIVÉO" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[INFO] Début de la sauvegarde pour la base '$DbName'..."
Write-Host "[INFO] Destination : $BackupFile"

try {
    # Exécution de pg_dump en format personnalisé compressé (-Fc)
    $cmd = "pg_dump -h $DbHost -p $DbPort -U $DbUser -F c -b -v -f `"$BackupFile`" $DbName"
    Invoke-Expression $cmd
    
    if (Test-Path $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "[SUCCÈS] Sauvegarde terminée avec succès ($([Math]::Round($FileSize, 2)) Mo)" -ForegroundColor Green
    } else {
        Write-Host "[AVERTISSEMENT] pg_dump s'est exécuté mais le fichier n'a pas été trouvé. Vérifiez les variables d'environnement PATH." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERREUR] Échec de la sauvegarde : $_" -ForegroundColor Red
}

# Rétention : Purge des sauvegardes de plus de 30 jours
Get-ChildItem -Path $BackupDir -Filter "backup_archiveo_*.dump" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
Write-Host "[INFO] Nettoyage des anciennes sauvegardes (> 30 jours) effectué." -ForegroundColor Gray
