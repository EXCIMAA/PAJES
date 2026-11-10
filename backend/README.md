# PAJES Backend — FastAPI + SQLAlchemy + MySQL

Python backend for the PAJES accounting platform. Pairs with the existing
React + TypeScript + Vite frontend in `/frontend` (currently `/src` at the
repo root).

## Stack

- **Python 3.11+** managed with **uv**
- **FastAPI** — REST API
- **SQLAlchemy 2.x** — ORM
- **Alembic** — database migrations
- **MySQL 8** — target database (via PyMySQL driver)
- **Pydantic / pydantic-settings** — validation + config
- **passlib[argon2]** — password hashing (Argon2id)

## Setup (local)

```bash
cd backend
cp .env.example .env          # then edit .env with real MySQL + secrets
uv sync                       # create venv + install dependencies (incl. dev)
uv run alembic upgrade head   # apply migrations to MySQL
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

## Business Intelligence and Power BI

The BI API is mounted at `/api/v1/business-intelligence`. It reflects only
verified PAJES tables (`clients`, `engagements`, `invoices`, `fixed_assets`,
`stock_items` / `inventory_items`, and known optional operational tables) that
are present in the FastAPI PostgreSQL database. Missing tables are reported
as unavailable; the service does not seed or invent analytics data. The
current backend migrations create authentication tables only, so business
analytics remain unavailable until the verified business data is migrated or
connected to this database. No BI migration modifies transactional data.

The existing browser application still uses Supabase Authentication, while
these FastAPI routes require a valid FastAPI session (`pajes_session`). Those
identity systems are not yet bridged. A user must have a provisioned FastAPI
account/session before the BI API can return data; the frontend reports this
condition rather than trusting a browser-supplied role.

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
uv run pytest -q                       # runs liveness probe test
PAJES_ENV_NO_DB=0 uv run pytest -q     # also runs readiness (needs MySQL)
```

> The Bolt sandbox cannot run Python or reach MySQL. Run the backend and
> tests in your own environment. See the migration report for what each
> phase actually verified.

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
