
import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL was not found in the backend .env file.")

target_url = make_url(DATABASE_URL)

if target_url.database != "pajes_import_test":
    raise RuntimeError(
        "SAFETY STOP: DATABASE_URL must point to pajes_import_test."
    )

source_url = target_url.set(database="pajes_auth_dev")

ACCOUNT_IDS = [
    "9e13afbf-e369-4612-915a-f658b96d3a6d",
    "5bcf44b0-f1ca-435d-9013-b48f0813af82",
]

EXPECTED_EMAILS = {
    "9e13afbf-e369-4612-915a-f658b96d3a6d": "tresorcls@excimaa.ca",
    "5bcf44b0-f1ca-435d-9013-b48f0813af82": "tresorduplex@icloud.com",
}

PARAMS = {
    "id1": ACCOUNT_IDS[0],
    "id2": ACCOUNT_IDS[1],
    "email1": EXPECTED_EMAILS[ACCOUNT_IDS[0]],
    "email2": EXPECTED_EMAILS[ACCOUNT_IDS[1]],
}

PROFILE_COLUMNS = [
    "id", "email", "full_name", "role", "avatar_url",
    "department", "phone", "active", "created_at",
    "updated_at", "hire_date",
]

CREDENTIAL_COLUMNS = [
    "id", "email_normalized", "password_hash", "is_active",
    "is_locked", "failed_login_count", "locked_at",
    "password_changed_at", "activated_at", "created_at",
    "updated_at",
]


def fetch_source_data(engine):
    with engine.connect() as conn:
        users = conn.execute(
            text("""
                SELECT id, email
                FROM auth.users
                WHERE id IN (:id1, :id2)
            """),
            PARAMS,
        ).mappings().all()

        profiles = conn.execute(
            text("""
                SELECT *
                FROM public.profiles
                WHERE id IN (:id1, :id2)
            """),
            PARAMS,
        ).mappings().all()

        credentials = conn.execute(
            text("""
                SELECT *
                FROM public.user_credentials
                WHERE id IN (:id1, :id2)
            """),
            PARAMS,
        ).mappings().all()

    users = [dict(row) for row in users]
    profiles = [dict(row) for row in profiles]
    credentials = [dict(row) for row in credentials]

    if len(users) != 2 or len(profiles) != 2:
        raise RuntimeError(
            "Expected exactly two source users and two profiles."
        )

    for user in users:
        expected = EXPECTED_EMAILS[str(user["id"])]
        if (user["email"] or "").lower() != expected:
            raise RuntimeError("Unexpected source email. Migration stopped.")

    for profile in profiles:
        expected = EXPECTED_EMAILS[str(profile["id"])]
        if profile["email"].lower() != expected:
            raise RuntimeError("Profile email mismatch. Migration stopped.")

        if profile["role"] != "stagiaires":
            raise RuntimeError("Unexpected account role. Migration stopped.")

    # Only the iCloud account should have a credential.
    if len(credentials) != 1:
        raise RuntimeError(
            "Expected exactly one password credential. Migration stopped."
        )

    credential = credentials[0]

    if str(credential["id"]) != ACCOUNT_IDS[1]:
        raise RuntimeError("Unexpected credential owner. Migration stopped.")

    if not credential["password_hash"].startswith("$argon2id$"):
        raise RuntimeError("Unexpected password hash format.")

    if credential["is_active"] is not False:
        raise RuntimeError(
            "The iCloud credential is no longer inactive. Review before migration."
        )

    return users, profiles, credentials


def check_target(conn):
    existing_users = conn.execute(
        text("""
            SELECT id, email
            FROM auth.users
            WHERE id IN (:id1, :id2)
               OR lower(email) IN (lower(:email1), lower(:email2))
        """),
        PARAMS,
    ).mappings().all()

    existing_profiles = conn.execute(
        text("""
            SELECT id
            FROM public.profiles
            WHERE id IN (:id1, :id2)
        """),
        PARAMS,
    ).mappings().all()

    existing_credentials = conn.execute(
        text("""
            SELECT id, email_normalized
            FROM public.user_credentials
            WHERE id IN (:id1, :id2)
               OR email_normalized IN (
                   lower(:email1), lower(:email2)
               )
        """),
        PARAMS,
    ).mappings().all()

    role_exists = conn.execute(
        text("""
            SELECT EXISTS (
                SELECT 1
                FROM public.role_permissions
                WHERE role = 'stagiaires'
            )
        """)
    ).scalar_one()

    if existing_users or existing_profiles or existing_credentials:
        raise RuntimeError(
            "Target conflict detected. No data was inserted. "
            "Inspect existing records before proceeding."
        )

    if not role_exists:
        raise RuntimeError(
            "The stagiaires role permissions are missing from the target."
        )


def insert_rows(conn, table, columns, rows):
    column_sql = ", ".join(columns)
    value_sql = ", ".join(f":{column}" for column in columns)

    statement = text(
        f"INSERT INTO {table} ({column_sql}) "
        f"VALUES ({value_sql})"
    )

    for row in rows:
        conn.execute(
            statement,
            {column: row[column] for column in columns},
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Actually insert the two accounts into the target database.",
    )
    args = parser.parse_args()

    source_engine = create_engine(source_url, pool_pre_ping=True)
    target_engine = create_engine(target_url, pool_pre_ping=True)

    try:
        users, profiles, credentials = fetch_source_data(source_engine)

        print("\nSOURCE VALIDATION PASSED")
        print("Users found: 2")
        print("Profiles found: 2")
        print("Password credentials found: 1")
        print("Automated test accounts: excluded")
        print("Old sessions and activation tokens: excluded")
        print("iCloud credential: preserved as inactive")

        if not args.commit:
            with target_engine.connect() as conn:
                check_target(conn)

            print("\nTARGET VALIDATION PASSED")
            print("No conflicting user, profile or credential found.")
            print("The stagiaires role exists.")
            print("\nPREVIEW ONLY: NO DATABASE CHANGES WERE MADE.")
            print("Review this output before running with --commit.")
            return

        with target_engine.begin() as conn:
            # Recheck immediately before inserting.
            check_target(conn)

            insert_rows(
                conn,
                "auth.users",
                ["id", "email"],
                users,
            )

            insert_rows(
                conn,
                "public.profiles",
                PROFILE_COLUMNS,
                profiles,
            )

            insert_rows(
                conn,
                "public.user_credentials",
                CREDENTIAL_COLUMNS,
                credentials,
            )

        print("\nMIGRATION COMMITTED SUCCESSFULLY.")
        print("Imported auth.users: 2")
        print("Imported profiles: 2")
        print("Imported credentials: 1")
        print("No existing records were updated or deleted.")

    finally:
        source_engine.dispose()
        target_engine.dispose()


if __name__ == "__main__":
    main()
