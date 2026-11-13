"""CLI script to create the initial super_admin account.

Usage:
    uv run python -m app.scripts.create_super_admin \
        --email admin@excimaa.com \
        --password 'SecurePassword123!' \
        --first-name Admin \
        --last-name EXCIMAA

This is a one-time bootstrap command. It should be run once after the
initial Alembic migration, then never again. It does NOT expose a
public endpoint — it is only accessible from the server command line.
"""

from __future__ import annotations

import argparse
import sys
import uuid

from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError

from app.core import utcnow
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.auth import Profile, UserCredential
from app.services.auth_service import normalize_email


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create the initial PAJES super_admin account."
    )
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password (min 8 chars)")
    parser.add_argument("--first-name", required=True, help="Admin first name")
    parser.add_argument("--last-name", required=True, help="Admin last name")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("Error: Password must be at least 8 characters.", file=sys.stderr)  # noqa: T201
        return 1

    email = normalize_email(args.email)
    db = SessionLocal()
    try:
        existing = (
            db.query(Profile)
            .filter(func.lower(func.trim(Profile.email)) == email)
            .first()
        )
        if existing:
            print("Error: An account with that address already exists.", file=sys.stderr)  # noqa: T201
            return 1

        # Check if any super_admin already exists
        existing_admin = db.query(Profile).filter(Profile.role == "super_admin").first()
        if existing_admin:
            print(  # noqa: T201
                "Warning: A super_admin account already exists. "
                "This command is intended for initial setup only.",
                file=sys.stderr,
            )
            proceed = input("Continue anyway? (yes/no): ")
            if proceed.lower() != "yes":
                print("Aborted.", file=sys.stderr)  # noqa: T201
                return 1

        db.rollback()
        user_id = str(uuid.uuid4())
        now = utcnow()
        with db.begin():
            db.execute(
                text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
                {"id": user_id, "email": email},
            )
            profile = Profile(
                id=user_id,
                email=email,
                full_name=f"{args.first_name} {args.last_name}".strip(),
                role="super_admin",
                active=True,
            )
            db.add(profile)
            db.flush()
            db.add(
                UserCredential(
                    id=user_id,
                    email_normalized=email,
                    password_hash=hash_password(args.password),
                    is_active=True,
                    activated_at=now,
                    password_changed_at=now,
                )
            )

        print("Success: super_admin account created.")  # noqa: T201
        print("You can now log in with this account at the PAJES frontend.")  # noqa: T201
        return 0
    except SQLAlchemyError as exc:
        print(f"Error: account creation failed ({type(exc).__name__}).", file=sys.stderr)  # noqa: T201
        db.rollback()
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
