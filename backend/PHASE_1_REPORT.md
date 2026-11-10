# PAJES Migration — Phase 1 Report: Backend Foundation

**Date:** 2026-11-04
**Phase:** 1 — Backend project structure, configuration, database, Alembic, health-check
**Status:** Code complete; NOT runtime-verified in this environment.

---

## What was implemented

A standalone Python FastAPI backend under `backend/`, using uv for
environment/dependency management, SQLAlchemy 2.x, Alembic, Pydantic
Settings, and PyMySQL (MySQL driver). No PAJES business modules yet —
this phase is the foundation only.

### Foundation components

1. **Project configuration** — `pyproject.toml` (uv-managed), `.env.example`
   with every documented setting, `.gitignore`, `Makefile`, `README.md`.
2. **Settings** (`app/core/config.py`) — Pydantic Settings reading from env
   or `.env`; computed database URL; CORS origin list; cookie/security
   flags; Argon2 parameters; storage backend selection.
3. **Database layer** (`app/database/__init__.py`) — SQLAlchemy 2.x engine
   with pool config, `sessionmaker`, `get_db` FastAPI dependency, and a
   shared `DeclarativeBase` with a stable naming convention for
   autogenerate-friendly Alembic output.
4. **FastAPI app** (`app/main.py`) — `create_app()` factory, CORS middleware,
   `/api/docs` + `/api/redoc` + `/api/openapi.json`, lifespan hook,
   health router included under `/api/v1`.
5. **Health endpoints** (`app/api/v1/health.py`):
   - `GET /api/v1/health` — liveness (no DB).
   - `GET /api/v1/health/ready` — readiness (executes `SELECT 1`).
6. **Alembic** (`alembic.ini`, `migrations/env.py`, `script.py.mako`,
   `migrations/versions/0001_initial.py`) — env.py injects the runtime DB
   URL from settings; baseline migration established; ready for
   autogenerate as models land.
7. **Test scaffolding** (`tests/conftest.py`, `tests/test_health.py`) —
   liveness probe test (always runnable, DB stubbed); readiness test
   (skipped when no DB).

### Placeholder packages created (filled in later phases)

`app/models/`, `app/schemas/`, `app/services/`, `app/repositories/`,
`app/permissions/`, `app/middleware/` — empty `__init__.py` only.

---

## Files created

```
backend/.env.example
backend/.gitignore
backend/Makefile
backend/README.md
backend/alembic.ini
backend/pyproject.toml
backend/app/__init__.py
backend/app/api/__init__.py
backend/app/api/v1/__init__.py
backend/app/api/v1/health.py
backend/app/core/__init__.py
backend/app/core/config.py
backend/app/database/__init__.py
backend/app/main.py
backend/app/middleware/__init__.py
backend/app/models/__init__.py
backend/app/permissions/__init__.py
backend/app/repositories/__init__.py
backend/app/schemas/__init__.py
backend/app/services/__init__.py
backend/migrations/__init__.py
backend/migrations/env.py
backend/migrations/script.py.mako
backend/migrations/versions/0001_initial.py
backend/tests/__init__.py
backend/tests/conftest.py
backend/tests/test_health.py
```

## Files modified

None. The existing React frontend and Supabase configuration were not
touched. Frontend production build verified: **passes** (`npm run build`
succeeded).

---

## What was actually tested

- **Frontend build:** `npm run build` — succeeded. Existing app intact.
- **Python backend:** NOT executed. This environment cannot run Python or
  reach MySQL. No backend test, migration, or startup was run.

## What requires testing in your local environment

Run these after copying `.env.example` to `.env` and filling in real
MySQL credentials:

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
# verify: http://localhost:8000/api/v1/health  → {"status":"ok",...}
# verify: http://localhost:8000/api/v1/health/ready → db.ok == true
uv run alembic upgrade head          # applies baseline (no tables yet)
PAJES_ENV_NO_DB=0 uv run pytest -q   # liveness + readiness tests
```

---

## What is incomplete / not yet implemented

- No SQLAlchemy models, Pydantic schemas, services, or repositories yet
  (Phase 2+).
- No authentication, session management, or permission enforcement yet
  (Phase 2).
- No Alembic migrations with real tables (Phase 2+).
- No frontend API client or backend switch (Phase 3).
- No business module migrations (Phase 4+).
- No PostgreSQL→MySQL data migration scripts (later phase).
- No file storage implementation (later phase).

## Remaining Supabase dependencies

All original Supabase integrations remain untouched and active. None have
been removed or replaced. A full inventory will be produced in Phase 2
during the usage audit.

## External requirements still needed

- A MySQL 8 server (not the Bolt-provisioned PostgreSQL).
- A Python 3.11+ runtime with uv installed (for local dev / deployment).
- A hosting target for the FastAPI backend (VPS, Railway, Render, etc.).
- An S3-compatible bucket (or local storage path) for documents — not yet
  implemented, only configured.

---

## Next phase (Phase 2)

Authentication, user management, and server-side permissions — preceded by
an audit of the existing frontend's auth/permissions implementation
(`src/lib/permissions.ts`, `src/contexts/AuthContext.tsx`,
`src/contexts/PermissionContext.tsx`, Supabase auth usage) so the Python
models match the real permission model rather than an invented one.
