# Building Docker Image - Troubleshooting Guide

## Issue: Access Denied Error

If you see: `open C:\Users\Mudar\.docker\buildx\.lock: Access is denied`

## Solutions

### Option 1: Run PowerShell as Administrator (Recommended)
1. Close current PowerShell
2. Right-click PowerShell → "Run as Administrator"
3. Navigate to project: `cd "d:\Pulse Pro"`
4. Run: `docker-compose build`

### Option 2: Ensure Docker Desktop is Running
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in system tray)
3. Try building again: `docker-compose build`

### Option 3: Fix Buildx Lock File
```powershell
# Stop Docker Desktop
# Delete the lock file
Remove-Item "C:\Users\Mudar\.docker\buildx\.lock" -Force -ErrorAction SilentlyContinue
# Restart Docker Desktop
# Try building again
```

### Option 4: Use Docker Build Directly
```powershell
cd "d:\Pulse Pro"
docker build -t ai-pulse-pro-backend .
```

## Building and Running

Once Docker has proper permissions:

```powershell
# Build the image
docker-compose build

# Run the container
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Testing in Docker

After starting:
- Backend will be available at: http://localhost:5000
- Check health: http://localhost:5000/api/health
- Database will be in `./data` folder (mounted as volume)
- Logs will be in `./logs` folder (mounted as volume)
