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

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.auth import Profile, User


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

    email = args.email.lower()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: An account with email {email} already exists.", file=sys.stderr)  # noqa: T201
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

        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=email,
            password_hash=hash_password(args.password),
        )
        profile = Profile(
            id=user_id,
            email=email,
            full_name=f"{args.first_name} {args.last_name}".strip(),
            role="super_admin",
        )
        db.add(user)
        db.add(profile)
        db.commit()

        print(f"Success: super_admin account created for {email}.")  # noqa: T201
        print("You can now log in with this account at the PAJES frontend.")  # noqa: T201
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)  # noqa: T201
        db.rollback()
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
