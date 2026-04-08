import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

try:
    from backend.database import init_db
    print("Initializing database...")
    init_db()
    print("Database initialized successfully.")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
