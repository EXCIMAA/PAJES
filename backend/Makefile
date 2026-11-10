.PHONY: install dev migrate test lint format check run

install:
	uv sync

dev:
	uv sync --extra dev

migrate:
	uv run alembic upgrade head

makemigration:
	@read -p "Migration message: " msg; \
	uv run alembic revision --autogenerate -m "$$msg"

test:
	uv run pytest -q

lint:
	uv run ruff check app tests

format:
	uv run ruff format app tests

check:
	uv run ruff check app tests
	uv run mypy app

run:
	uv run uvicorn app.main:app --reload --port 8000
