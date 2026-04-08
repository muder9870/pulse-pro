# AI Pulse Pro Documentation

## Current Documentation

### Operations & Deployment

- [Stability Mode Guide](STABILITY_MODE.md) - Current operational mode (March 2026)
- [Stability Mode Deployment](STABILITY_MODE_DEPLOYMENT.md) - Deployment summary
- [Developer Guide](DEVELOPER_GUIDE.md) - Development setup and guidelines

### Project Status

- [Current Status](CURRENT_STATUS.md) - Latest project status
- [Bug Fixes Summary](BUG_FIXES_SUMMARY.md) - Recent bug fixes (March 1, 2026)
- [Actual Status Report](ACTUAL_STATUS_REPORT.md) - Detailed status of all issues

### Additional Guides

- [User Guide](USER_GUIDE.md) - End-user documentation
- [Features](FEATURES.md) - Feature documentation
- [Technical Architecture](TECHNICAL_ARCHITECTURE.md) - System architecture
- [Development](DEVELOPMENT.md) - Development workflows

## Archived Documentation

Historical documentation has been moved to `docs/archive/`:

- Migration reports (PostgreSQL transition) - `archive/migrations/`
- Phase completion summaries - `archive/phases/`
- Test results and verification reports - `archive/tests/`
- Old status reports and historical docs

## Quick Links

### For Operators

- [Stability Mode Guide](STABILITY_MODE.md) - **START HERE**
- [Developer Guide](DEVELOPER_GUIDE.md) - Setup and configuration

### For Developers

- [Developer Guide](DEVELOPER_GUIDE.md) - Development environment
- Backend: `backend/` directory
- Frontend: `frontend/` directory
- Database: PostgreSQL (see docker-compose.yml)

## Directory Structure

```text
docs/
├── README.md                          # This file
├── STABILITY_MODE.md                  # Current operational guide
├── STABILITY_MODE_DEPLOYMENT.md       # Deployment summary
├── DEVELOPER_GUIDE.md                 # Development guide
├── CURRENT_STATUS.md                  # Current status
├── BUG_FIXES_SUMMARY.md              # Recent fixes
├── ACTUAL_STATUS_REPORT.md           # Detailed status
├── USER_GUIDE.md                      # User documentation
├── FEATURES.md                        # Feature documentation
├── TECHNICAL_ARCHITECTURE.md         # System architecture
├── DEVELOPMENT.md                     # Development workflows
├── archive/                           # Historical documentation
│   ├── migrations/                    # PostgreSQL migration docs (7 files)
│   ├── phases/                        # Phase completion reports (3 files)
│   ├── tests/                         # Test results (2 files)
│   └── *.md                           # Historical docs (40+ files)
└── operations/                        # Operational procedures (empty)

Root directory:
scripts/
└── archive/                           # Archived scripts (30+ files)
    ├── check_*.py                     # Database check scripts
    ├── debug_*.py                     # Debug scripts
    ├── test_*.py                      # Test scripts
    ├── verify_*.py                    # Verification scripts
    └── *.py                           # Other utility scripts
```

## Getting Started

1. Read [Stability Mode Guide](STABILITY_MODE.md) for current operational status
2. Review [Developer Guide](DEVELOPER_GUIDE.md) for setup instructions
3. Check [Current Status](CURRENT_STATUS.md) for latest updates

## Support

For issues or questions:

1. Check the relevant documentation above
2. Review archived docs for historical context
3. Check system health: `curl http://localhost:5000/api/system/health`
