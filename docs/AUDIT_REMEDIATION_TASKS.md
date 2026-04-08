# Audit remediation — task list

**Source:** Static review of this repository (state as of 2026-04-05). Each item maps to something observable in the tree (file path, import, or config). No third-party CVE data; no unverified claims.

**Safety rule:** Implement one task (or one small group) per PR; run the app and smoke-test `/api/health` and one UI flow after each merge.

---

## P0 — Correctness / production behavior

### T-P0-01 — Flask-Limiter storage URI before `init_app`


| Field               | Detail                                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `backend/main.py` lines 95–97: `limiter.init_app(app)` runs **before** `app.config["RATELIMIT_STORAGE_URI"] = settings.REDIS_URL`.                                                                       |
| **Symptom**         | Backend logs can show Flask-Limiter using in-memory storage (limits do not survive restarts; inconsistent under multiple Gunicorn workers).                                                              |
| **Action**          | Set `RATELIMIT_STORAGE_URI` on `app.config` **before** `limiter.init_app(app)`, **or** pass `storage_uri=settings.REDIS_URL` into `Limiter(...)` in `backend/api/limiter.py` per Flask-Limiter 3.x docs. |
| **Verify**          | Rebuild/restart backend; confirm log **does not** warn about in-memory limiter storage; hit a rate-limited route twice past limit and get 429.                                                           |
| **Regression risk** | Low if `REDIS_URL` matches a reachable Redis (same as Celery). Wrong URL breaks limiter (not core DB).                                                                                                   |


### T-P0-02 — Redis client for `/health/performance` matches `REDIS_URL`


| Field               | Detail                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `backend/main.py` line 62: `redis.Redis(host='redis', port=6379, db=0)` — no password. `docker-compose.yml` sets `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379`.               |
| **Symptom**         | Health check may report Redis unhealthy when Redis requires auth.                                                                                                                 |
| **Action**          | Replace hardcoded client with `redis.from_url(settings.REDIS_URL, decode_responses=False)` (or equivalent) inside a small helper used only for ping; keep same `ping()` behavior. |
| **Verify**          | With passworded Redis in Compose, `/health/performance` shows `redis.ok: true`.                                                                                                   |
| **Regression risk** | Medium: validate URL format in `.env` (same variable Celery already uses). Local dev without password must still work if `REDIS_URL` matches.                                     |


---

## P1 — Security (non-breaking defaults)

### T-P1-01 — CORS: optional allowlist via env


| Field               | Detail                                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `backend/main.py` line 64: `CORS(app)` — no origin restriction.                                                                                                                                     |
| **Action**          | Add env var e.g. `CORS_ORIGINS` (comma-separated). If **unset or empty**, keep current behavior (`CORS(app)`). If set, use `CORS(app, origins=[...])` or `resources={...}` with only those origins. |
| **Verify**          | Without env: frontend still loads API as today. With env set to production origin: browser calls from other origins fail CORS as expected.                                                          |
| **Regression risk** | Low if default remains “permissive” when env unset.                                                                                                                                                 |


### T-P1-02 — Document exposure of `/metrics` and `/apidocs`


| Field               | Detail                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `backend/main.py` registers `/metrics` (Prometheus). Flasgger `Swagger(app)` exposes API docs (path per Flasgger defaults, typically `/apidocs`).                                                                         |
| **Action**          | No code required for v1: add a short section to `docs/` or deployment README: keep these paths off the public internet (reverse proxy ACL, internal network, or auth). Optional later: gate behind env flag + basic auth. |
| **Verify**          | N/A (documentation).                                                                                                                                                                                                      |
| **Regression risk** | None if doc-only.                                                                                                                                                                                                         |


---

## P1 — Engineering hygiene

### T-P1-03 — Split dev dependencies from `requirements.txt`


| Field               | Detail                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `requirements.txt` includes `pytest-cov>=4.0.0,<5` alongside runtime packages.                                                                                                                                                                                                                                               |
| **Action**          | Create `requirements-dev.txt` that includes `-r requirements.txt` and `pytest-cov` (and optionally `pytest` if not already pulled transitively). Remove `pytest-cov` from `requirements.txt`. Ensure `Dockerfile` continues to `pip install -r requirements.txt` only (no change needed if dev deps removed from main file). |
| **Verify**          | `docker compose build backend` succeeds. Local: `pip install -r requirements-dev.txt && pytest` works.                                                                                                                                                                                                                       |
| **Regression risk** | Low.                                                                                                                                                                                                                                                                                                                         |


### T-P1-04 — Make pytest coverage optional


| Field               | Detail                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `pytest.ini` `addopts` forces `--cov=backend` and `--cov-fail-under=40`. Running pytest without `pytest-cov` installed fails.                                                      |
| **Action**          | Remove coverage flags from default `pytest.ini` addopts **or** move them to a second config file e.g. `pytest-cov.ini` and document: `pytest -c pytest-cov.ini` for coverage runs. |
| **Verify**          | Fresh venv with only `requirements.txt` (after T-P1-03): `pytest` collects tests (may skip/fail individual tests for other reasons).                                               |
| **Regression risk** | Anyone relying on implicit `--cov` must switch to documented command.                                                                                                              |


### T-P1-05 — Add CI workflow (minimal)


| Field               | Detail                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | No `.github/workflows/` directory in repository.                                                                                                                                        |
| **Action**          | Add one workflow: checkout, setup Python, `pip install -r requirements.txt` + dev deps, `pytest` (or subset), optional `eslint` for `frontend/`. Do not add deploy steps until desired. |
| **Verify**          | Workflow passes on default branch.                                                                                                                                                      |
| **Regression risk** | Failing tests block merge — fix or mark skipped intentionally.                                                                                                                          |


---

## P2 — Tests and docs accuracy

### T-P2-01 — Fix `test_pipeline_scoring_sanity` database import


| Field               | Detail                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `tests/test_pipeline_scoring_sanity.py` line 14: `from backend import database as db`. There is **no** `backend/database.py` in the tree. Session helpers live under `backend/db/session.py` (`get_session`, etc.). |
| **Action**          | Replace import with `from backend.db.session import get_session` (or the project’s canonical session context manager). Replace `db.get_session()` usages accordingly. Align with how other tests open sessions.     |
| **Verify**          | `pytest tests/test_pipeline_scoring_sanity.py` runs past `setUp` (assertions may still depend on DB/LLM config).                                                                                                    |
| **Regression risk** | None; test is currently miswired.                                                                                                                                                                                   |


### T-P2-02 — Align `TECHNICAL_ARCHITECTURE.md` with Compose


| Field               | Detail                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence**        | `docs/TECHNICAL_ARCHITECTURE.md` (opening diagram) describes SQLite as the primary store. `docker-compose.yml` sets `DATABASE_URL` to PostgreSQL for `backend` and `celery-worker`. |
| **Action**          | Update diagram/text: PostgreSQL + Redis + Celery for Docker deployment; SQLite remains valid for local `Settings.DATABASE_URL` default in `backend/config.py`.                      |
| **Verify**          | Reader can reconcile docs with `docker-compose.yml`.                                                                                                                                |
| **Regression risk** | None (docs only).                                                                                                                                                                   |


### T-P2-03 — Remove obsolete Compose `version` key


| Field               | Detail                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Evidence**        | `docker-compose.yml` line 1: `version: '3.8'`. Compose v2 warns this field is obsolete. |
| **Action**          | Delete the `version:` line.                                                             |
| **Verify**          | `docker compose config` succeeds; stack still `up`.                                     |
| **Regression risk** | None for modern Compose.                                                                |


---

## P3 — Hardening (evaluate before enabling)

### T-P3-01 — Alembic / migrations: startup retry


| Field               | Detail                                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Evidence**        | `entrypoint.sh` runs `alembic stamp`/`upgrade` immediately; fresh Postgres can briefly reject TCP connections, producing `OperationalError` in logs (observed in prior runs). `init_db()` in `backend/db/session.py` already retries `create_all` (10×, 3s). |
| **Action**          | Optional: wrap alembic calls in `entrypoint.sh` with bounded retry loop (max wait ~60s), or rely on operator `docker compose up` twice — document if no code change.                                                                                         |
| **Verify**          | First boot after `docker compose down -v` succeeds without manual restart.                                                                                                                                                                                   |
| **Regression risk** | Low if retries bounded and exit non-zero on final failure.                                                                                                                                                                                                   |


### T-P3-02 — Non-root container user


| Field               | Detail                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| **Evidence**        | `Dockerfile` has no `USER` directive; process runs as root.                    |
| **Action**          | Add non-root user; `chown` `/app/data` and `/app/logs` if volumes need writes. |
| **Verify**          | Full pipeline + file writes to mounted `./data` and `./logs` still work.       |
| **Regression risk** | **High** until volume permissions validated on target hosts.                   |


### T-P3-03 — Gunicorn `--timeout 0`


| Field               | Detail                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Evidence**        | `Dockerfile` `CMD` uses `--timeout 0` (no worker timeout).                                                                                                               |
| **Action**          | Do **not** change without product sign-off: long SSE/streaming or LLM calls may need it. Optional: document tradeoff; consider separate worker class for streaming only. |
| **Verify**          | N/A unless changed.                                                                                                                                                      |
| **Regression risk** | Lowering timeout can kill legitimate long requests.                                                                                                                      |


---

## Explicit non-tasks (avoid scope creep)

- Do not remove `Talisman` or `SECRET_KEY` check without replacement controls.
- Do not switch production DB driver or remove PostgreSQL compatibility from migrations without a dedicated migration project.
- Do not disable Celery or remove `wait_for_raw_analysis_complete` without re-validating scoring/priority logs and DB state.

---

## Suggested order of execution

1. T-P0-01, T-P0-02
2. T-P1-03, T-P1-04
3. T-P2-01
4. T-P1-01 (after staging URL list is known)
5. T-P1-02, T-P2-02, T-P2-03
6. T-P1-05
7. T-P3-* as needed

---

*End of task list.*