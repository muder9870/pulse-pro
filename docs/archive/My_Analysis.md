Executive Summary (No fluff)

Your system mostly works, but you’ve got two critical issues + one architectural flaw:

🚨 1. Backend crash (REAL ROOT CAUSE)
NameError: name 'func' is not defined

This is breaking:

/api/hashtags/...
/api/generate

📌 Source:

processed_at=func.now()

👉 This is straight-up missing import:

from sqlalchemy import func

This is your primary failure point. Everything else is secondary.

⚠️ 2. Frontend 502 / connection refused (startup race condition)

From logs:

connect() failed (111: Connection refused)
upstream prematurely closed connection

📌 What happened:

Frontend (nginx) tried hitting backend
Backend was still booting (migrations running)
Result → temporary 502

👉 This is NOT a bug. This is:

"frontend is faster than backend"

⚠️ 3. Silent Data Failure (your pipeline looks healthy… but it’s lying)

This line is 🔥 dangerous:

Scored 0 and prioritized 0 articles

But earlier:

Analyzed 50 articles
Celery tasks succeeded

👉 Meaning:

Analysis ran
Tasks executed
BUT results not persisted / not usable

📌 Likely causes:

DB session not committed
_save_analysis() failing silently (which we CONFIRMED via func error)
processed_id: null everywhere → 🚨 BIG SIGNAL
🧩 4. Celery is working (but doing useless work)
Task succeeded ... result: None
processed_id: null

👉 Translation:

Workers are alive ✅
Jobs executing ✅
Output useless ❌

This is classic:

“pipeline running, value = zero”

⚠️ 5. Streaming endpoint instability
upstream prematurely closed connection
/api/pipeline/stream

👉 Causes:

Backend restarted
Long-lived connection dropped
OR gunicorn timeout/worker reset

Not critical, but indicates:

Your streaming endpoint isn’t resilient
⚠️ 6. Minor but important warnings
Flask Limiter:
Using in-memory storage (NOT production safe)
Celery:
running as root (bad practice)

These won’t break things now—but will bite later.

🧠 System Behavior Timeline
Phase 1: Boot
Backend starts → migrations run
Frontend hits API → 💥 502
Phase 2: Stabilization
Backend up
Celery connected
Redis healthy
Scheduler running
Phase 3: Pipeline Run
Ingestion: mostly empty (except GitHub)
Analysis: runs
Celery: executes tasks
DB write: ❌ broken (func error)
Phase 4: User Actions
Hashtags → 💥 500
Generate → 💥 500
🎯 What’s ACTUALLY broken (priority order)
🥇 P0 — Fix this NOW
from sqlalchemy import func
🥈 P1 — DB write integrity

Symptoms:

processed_id = null
scoring = 0

👉 Verify:

_save_analysis() actually commits
session.commit() exists
no silent exception swallowing
🥉 P2 — Startup ordering

Fix with:

healthcheck
depends_on + condition: service_healthy
retry logic in frontend
🧠 P3 — Observability gap

Right now:

“Everything looks green, but nothing works”

Add:

logs for DB writes
logs for processed_id creation
error metrics
🧠 Brutal Truth

Your system is:

Operationally alive, functionally broken

Infra ✅
Workers ✅
Scheduler ✅
API ❌ (core logic failing)
🔧 Minimal Fix Plan (copy-paste execution mindset)
Step 1

Fix import:

from sqlalchemy import func
Step 2

Check:

session.commit()
Step 3

Log this:

print("Processed ID:", processed_id)
Step 4

Restart stack:

docker-compose down -v
docker-compose up --build
💬 Final Line

Your pipeline isn’t failing loudly—it’s failing quietly, which is way more dangerous.

Fix the func issue and you’ll unlock:

scoring
prioritization
content generation

Right now, your AI engine is basically:

“thinking… but never writing anything down.”