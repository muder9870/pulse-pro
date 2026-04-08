# Fix Docker Permissions Script
# This script attempts to fix Docker permission issues

Write-Host "=== Fixing Docker Permissions ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[WARNING] Not running as Administrator!" -ForegroundColor Yellow
    Write-Host "Some operations may require admin privileges." -ForegroundColor Yellow
    Write-Host ""
}

# Try to remove buildx lock file
Write-Host "Attempting to fix buildx lock file..."
$lockFile = "$env:USERPROFILE\.docker\buildx\.lock"
if (Test-Path $lockFile) {
    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "[OK] Removed buildx lock file" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Could not remove lock file: $_" -ForegroundColor Red
        Write-Host "You may need to:" -ForegroundColor Yellow
        Write-Host "  1. Stop Docker Desktop" -ForegroundColor White
        Write-Host "  2. Run this script as Administrator" -ForegroundColor White
        Write-Host "  3. Or manually delete: $lockFile" -ForegroundColor White
    }
} else {
    Write-Host "[INFO] Lock file does not exist" -ForegroundColor Yellow
}

# Check Docker Desktop
Write-Host ""
Write-Host "Checking Docker Desktop..."
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcess) {
    Write-Host "[OK] Docker Desktop is running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Docker Desktop may not be running" -ForegroundColor Yellow
    Write-Host "Please start Docker Desktop and wait for it to fully initialize." -ForegroundColor White
}

# Test Docker connection
Write-Host ""
Write-Host "Testing Docker connection..."
try {
    docker ps 2>&1 | Out-Null
    Write-Host "[OK] Docker is accessible" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now try building:" -ForegroundColor Yellow
    Write-Host "  docker-compose build" -ForegroundColor White
} catch {
    Write-Host "[ERROR] Docker is not accessible" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUTIONS:" -ForegroundColor Yellow
    Write-Host "1. Ensure Docker Desktop is running and fully started" -ForegroundColor White
    Write-Host "2. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "3. Restart Docker Desktop" -ForegroundColor White
    Write-Host "4. Check Windows Firewall settings" -ForegroundColor White
}
