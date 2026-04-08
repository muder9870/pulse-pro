# Docker Build Solution - Access Denied Error

## Problem
```
ERROR: open C:\Users\Mudar\.docker\buildx\.lock: Access is denied
```

## Root Cause
Docker Buildx has a lock file that's preventing builds. This requires administrator privileges to fix.

## Solution Steps

### Step 1: Stop Docker Desktop
1. Right-click Docker Desktop icon in system tray
2. Click "Quit Docker Desktop"
3. Wait for it to fully close (check Task Manager if needed)

### Step 2: Remove Lock File (Choose ONE method)

**Method A: Using PowerShell as Administrator**
1. Right-click PowerShell → "Run as Administrator"
2. Run:
   ```powershell
   Remove-Item "C:\Users\Mudar\.docker\buildx\.lock" -Force
   ```

**Method B: Manual Delete**
1. Open File Explorer
2. Navigate to: `C:\Users\Mudar\.docker\buildx\`
3. Delete the `.lock` file (if it exists)
4. If you can't delete it, restart your computer

### Step 3: Restart Docker Desktop
1. Start Docker Desktop
2. Wait for it to fully initialize (whale icon should be steady)

### Step 4: Build Docker Image

**Option A: Using docker-compose (Recommended)**
```powershell
# Open PowerShell (can be regular, not admin needed after fixing lock)
cd "d:\Pulse Pro"
docker-compose build
```

**Option B: Using the build script**
```powershell
cd "d:\Pulse Pro"
.\build-docker.ps1
```

**Option C: Direct docker build**
```powershell
cd "d:\Pulse Pro"
docker build -t ai-pulse-pro-backend .
```

### Step 5: Run the Container
```powershell
docker-compose up
```

Or in background:
```powershell
docker-compose up -d
```

## Quick Fix Script (Run as Admin)

Save this as `fix-docker-lock.ps1` and run as Administrator:

```powershell
# Stop Docker Desktop processes
Get-Process "*Docker*" | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Remove lock file
$lockFile = "$env:USERPROFILE\.docker\buildx\.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Host "Lock file removed" -ForegroundColor Green
} else {
    Write-Host "Lock file not found" -ForegroundColor Yellow
}

Write-Host "`nPlease restart Docker Desktop manually, then try building again." -ForegroundColor Cyan
```

## Alternative: Use Docker Without Buildx

If the issue persists, you can disable buildx:

```powershell
$env:DOCKER_BUILDKIT=0
docker-compose build
```

## Verification

After building, verify the image exists:
```powershell
docker images | findstr ai-pulse-pro
```

## Expected Output

When build succeeds, you should see:
```
[+] Building X.Xs (X/X) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: XXXB
 => [internal] load .dockerignore
 ...
 => => exporting to image
 => => => writing image sha256:...
 => => => naming to docker.io/library/ai-pulse-pro-backend
```

## Troubleshooting

If build still fails:
1. Ensure Docker Desktop is fully started
2. Check Docker Desktop settings → Resources → File Sharing (ensure D: drive is shared)
3. Try restarting your computer
4. Check Windows Firewall isn't blocking Docker

## Files Created

- `build-docker.ps1` - Automated build script
- `fix-docker-permissions.ps1` - Permission fix script
- `DOCKER_BUILD_GUIDE.md` - General Docker guide
- `DOCKER_BUILD_SOLUTION.md` - This file (specific solution)
