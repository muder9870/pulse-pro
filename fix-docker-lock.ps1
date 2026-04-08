# Fix Docker Buildx Lock File
# Run this script as Administrator

Write-Host "=== Fixing Docker Buildx Lock File ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    exit 1
}

# Stop Docker Desktop processes
Write-Host "Stopping Docker Desktop processes..."
Get-Process "*Docker*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "[OK] Docker processes stopped" -ForegroundColor Green

# Remove lock file
Write-Host ""
Write-Host "Removing buildx lock file..."
$lockFile = "$env:USERPROFILE\.docker\buildx\.lock"
if (Test-Path $lockFile) {
    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "[OK] Lock file removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Could not remove lock file: $_" -ForegroundColor Red
        Write-Host "You may need to restart your computer." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[INFO] Lock file does not exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[SUCCESS] Docker lock file fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Docker Desktop" -ForegroundColor White
Write-Host "2. Wait for it to fully initialize" -ForegroundColor White
Write-Host "3. Run: cd 'd:\Pulse Pro'; docker-compose build" -ForegroundColor White
