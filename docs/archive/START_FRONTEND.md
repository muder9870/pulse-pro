# Starting the Frontend Dashboard

## Issue: EPERM Error

The `EPERM` error when starting Vite is typically caused by Windows Defender or antivirus blocking `esbuild`.

## Solutions

### Option 1: Run as Administrator (Recommended)
1. Close all terminals
2. Right-click PowerShell/CMD → "Run as Administrator"
3. Navigate to project: `cd "d:\Pulse Pro\frontend"`
4. Run: `npm run dev`

### Option 2: Add Exception to Windows Defender
1. Open Windows Security
2. Go to Virus & threat protection
3. Click "Manage settings" under Virus & threat protection settings
4. Scroll to "Exclusions" → "Add or remove exclusions"
5. Add folder exclusion for: `d:\Pulse Pro\frontend\node_modules\esbuild`

### Option 3: Manual Start
Open a new terminal and run:
```powershell
cd "d:\Pulse Pro\frontend"
npm run dev
```

### Option 4: Use Different Port
If port 5173 is blocked, try:
```powershell
cd "d:\Pulse Pro\frontend"
$env:PORT=3000
npm run dev -- --port 3000
```

## Verify It's Running

Once started, you should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Then access: **http://localhost:5173**

## Current Status

- ✅ Backend is running on http://localhost:5000
- ⚠️ Frontend needs to be started manually due to permission issue
