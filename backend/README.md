# PAJES Backend — FastAPI + SQLAlchemy + PostgreSQL

Python backend for the PAJES accounting platform. Pairs with the existing
React + TypeScript + Vite frontend in the repository's `src` directory.

## Stack

- **Python 3.11+** managed with **uv**
- **FastAPI** — REST API
- **SQLAlchemy 2.x** — ORM
- **Alembic** — database migrations
- **PostgreSQL 17** — configured database (via psycopg 3)
- **Pydantic / pydantic-settings** — validation + config
- **passlib[argon2]** — password hashing (Argon2id)

## Setup (local)

```bash
Set-Location backend
Copy-Item .env.example .env   # edit DATABASE_URL and AUTH_SECRET_KEY
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/api/docs

Set `DATABASE_URL` to the intended PostgreSQL instance and database. Do not
run `uv run alembic upgrade head` against the protected imported database:
schema proposals require explicit owner approval. The repository's current
operational APIs depend on existing tables and do not automatically migrate or
seed business data.

The database readiness probe is `GET /api/v1/health/ready`; it returns HTTP 503
with a generic database-unavailable detail when PostgreSQL cannot be reached.
The liveness probe `GET /api/v1/health` does not require the database.

## Business Intelligence and Power BI

The BI API is mounted at `/api/v1/business-intelligence`. It reflects only
tables found in the configured PostgreSQL database; missing sources are
reported as unavailable, and no demo analytics are substituted. Reports are
available under `/api/v1/reports`.

The browser uses FastAPI-managed sessions (`pajes_session`) and CSRF
protection. Existing imported profiles do not automatically have FastAPI
password credentials; see `sql/proposals/auth_storage_migration.proposal.sql`
and the migration checklist. Do not claim existing-user authentication or
live PostgreSQL integration until both are provisioned and tested.

Power BI Embedded is optional. Configure the following backend environment
variables only after creating an Entra service principal and assigning it the
required Power BI tenant/workspace access:

- `POWERBI_TENANT_ID`, `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET`
- `POWERBI_WORKSPACE_ID`, `POWERBI_DEFAULT_REPORT_ID` and optional comma-separated `POWERBI_REPORT_IDS`
- Optional `POWERBI_DATASET_ID` and `POWERBI_RLS_ROLE` for dataset RLS

The client secret stays server-side. The API allowlists only the configured
report ID, checks the authenticated user and existing PAJES permissions, then
issues a short-lived view token. Power BI embedding requires an appropriate
Power BI Embedded capacity or supported Premium capacity and tenant settings
that permit service-principal API use. Do not use Publish to web. Dataset
refresh is separate from PAJES live API queries and must be scheduled in
Power BI Service or through a separately configured refresh workflow.

## Tests

```bash
uv run pytest -q
```

Tests use isolated SQLite fixtures for database writes. The optional
`test_readiness_needs_db` test requires the configured PostgreSQL instance.
Run Ruff with `uv run ruff check app tests`.

## Project layout

```
backend/
├── app/
│   ├── api/v1/         # versioned routers (health, auth, users, …)
│   ├── core/           # config, utilities
│   ├── database/       # engine, session, declarative base
│   ├── models/         # SQLAlchemy models (added per module)
│   ├── schemas/        # Pydantic request/response schemas (per module)
│   ├── services/       # business logic (per module)
│   ├── repositories/   # data access (per module)
│   ├── permissions/    # server-side authorization
│   ├── middleware/     # auth, logging, rate limiting
│   └── main.py         # FastAPI app factory
├── migrations/         # Alembic
├── tests/
├── alembic.ini
├── pyproject.toml
└── .env.example
```
