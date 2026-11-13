# PAJES development startup

The application currently consists of a Vite frontend and FastAPI backend.
Operational migration is still in progress; this repository is not yet
production-ready. See [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) for
verified scope, external blockers, and remaining Supabase callers.

## Prerequisites

- Node.js and npm.
- Python 3.11+ and `uv`.
- The existing PostgreSQL instance and its approved connection settings.

Do not initialize, migrate, reset, or restore over `pajes_import_test`.
The checked-in migrations include legacy Supabase schema and are not a safe
replacement for the protected imported database. Obtain owner approval before
any schema change.

## Start the existing PostgreSQL instance

Start Docker Desktop first, then inspect rather than creating a replacement
database/container:

```powershell
docker ps -a --filter "name=pajes-postgres"
```

Only if that command confirms the existing container, start it without
removing or recreating its volumes:

```powershell
docker start pajes-postgres
docker exec pajes-postgres pg_isready
```

The last verified environment had Docker Desktop unable to start and its WSL
distributions stopped. No Compose configuration was found at the repository
root. Do not create a new PostgreSQL container or volume as a workaround for
the protected database. Resolve Docker/WSL startup and verify the existing
container/volume identity first.

## Start FastAPI

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env to use the approved DATABASE_URL and a strong AUTH_SECRET_KEY.
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check liveness at `http://127.0.0.1:8000/api/v1/health`, database readiness at
`http://127.0.0.1:8000/api/v1/health/ready`, and API docs at
`http://127.0.0.1:8000/api/docs`. Readiness returns HTTP 503 with a generic
message when PostgreSQL is unavailable.

## Start Vite

In another PowerShell window:

```powershell
Set-Location C:\Users\treso\Downloads\ProjectPajes\project
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

The root `.env` configures `VITE_API_BASE_URL` as
`http://127.0.0.1:8000/api/v1`. Restart Vite after changing any `VITE_*`
variable; the browser bundle reads those values at startup/build time.

Do not put credentials or Supabase keys in Vite environment variables. The API
uses HTTP-only session cookies and CSRF; the production deployment must use
HTTPS, a strong server-side secret, restricted CORS origins, and private
persistent document storage.

## Verification commands

```powershell
Set-Location backend
uv run pytest -q
uv run ruff check app tests

Set-Location ..
npm run typecheck
npm run build
```

Database integration tests require the configured PostgreSQL instance. The
backend suite's write tests use isolated SQLite fixtures.

## Backup, restore, and deployment

No production deployment or restore procedure has been verified for this
workspace. Before deployment, the database owner must establish and test
encrypted PostgreSQL backups and a restore into a separate isolated database.
Never restore a backup over `pajes_import_test` or production without explicit
owner approval and a verified recovery plan. Do not deploy until the migration
checklist's authentication, storage, PostgreSQL, authorization, and remaining
operational-module blockers are resolved.
