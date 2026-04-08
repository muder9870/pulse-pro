# Fixing "disk I/O error" in Pipeline

## Problem
The pipeline is failing with: `sqlite3.OperationalError: disk I/O error`

## Common Causes

1. **Database file is locked** - Another process is using it
2. **Disk space full** - No space to write
3. **File permissions** - Can't write to database
4. **Database corruption** - File is corrupted
5. **Network drive disconnected** - If DB is on network drive

## Solutions

### Solution 1: Check for Locked Database
```powershell
# Stop the backend server first
# Then check if any Python processes are using the DB
Get-Process python | Stop-Process -Force
```

### Solution 2: Check Disk Space
```powershell
cd "d:\Pulse Pro"
$drive = (Get-Item "data\app.db").PSDrive.Name
Get-PSDrive $drive | Select-Object Used, Free
```

### Solution 3: Repair Database (if corrupted)
```powershell
cd "d:\Pulse Pro"
# Backup first
Copy-Item "data\app.db" "data\app.db.backup"

# Try to repair using SQLite
python -c "import sqlite3; conn = sqlite3.connect('data/app.db'); conn.execute('PRAGMA integrity_check'); conn.close()"
```

### Solution 4: Recreate Database (last resort)
```powershell
cd "d:\Pulse Pro"
# Backup old database
Move-Item "data\app.db" "data\app.db.old"

# Restart backend - it will recreate the database
# You'll lose existing data, but pipeline will work
```

### Solution 5: Check File Permissions
```powershell
cd "d:\Pulse Pro"
icacls "data\app.db"
# Make sure your user has Full Control
```

## Quick Fix (Try This First)

1. **Stop the backend server** (Ctrl+C in the terminal running it)
2. **Wait 5 seconds**
3. **Restart the backend**: `python -m backend.main`
4. **Try running pipeline again**

## Prevention

- Ensure backend is properly stopped before restarting
- Don't run multiple backend instances simultaneously
- Keep disk space available
- Use local drive (not network drive) for database
