# Docker Build Script for AI Pulse Pro
# Run this script in PowerShell as Administrator

Write-Host "=== Building AI Pulse Pro Docker Image ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..."
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again."
    exit 1
}

# Stop any existing containers
Write-Host ""
Write-Host "Cleaning up existing containers..."
docker-compose down 2>&1 | Out-Null
Write-Host "[OK] Cleaned up" -ForegroundColor Green

# Build the image
Write-Host ""
Write-Host "Building Docker image (this may take a few minutes)..."
docker-compose build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Docker image built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the container:" -ForegroundColor Yellow
    Write-Host "  docker-compose up" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run in background:" -ForegroundColor Yellow
    Write-Host "  docker-compose up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "View logs:" -ForegroundColor Yellow
    Write-Host "  docker-compose logs -f" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "[ERROR] Docker build failed!" -ForegroundColor Red
    Write-Host "Check the error messages above."
    exit 1
}
