from sqlalchemy import create_engine, text
from app.core.config import settings

eng = create_engine(settings.effective_database_url())
with eng.connect() as conn:
    print("DB:", settings.effective_database_url())
    print("schemas:", [r[0] for r in conn.execute(text("select schema_name from information_schema.schemata order by 1")).fetchall()])
    print("auth.tables:", [r[0] for r in conn.execute(text("select table_name from information_schema.tables where table_schema='auth' order by 1")).fetchall()])
    print("profiles count:", conn.execute(text('select count(*) from public.profiles')).scalar())
    print("credentials count:", conn.execute(text('select count(*) from public.user_credentials')).scalar())
    print("activation tokens:", conn.execute(text('select count(*) from public.account_activation_tokens')).scalar())
    tok_rows = conn.execute(text("select id, user_id, expires_at, used_at, invalidated_at from public.account_activation_tokens")).fetchall()
    for r in tok_rows:
        print("token:", r)
    au_rows = conn.execute(text("select id, email from auth.users order by 1 limit 20")).fetchall()
    for r in au_rows:
        print("auth.users:", r)
    print("alembic:", conn.execute(text("select version_num from alembic_version")).scalar())
    cols = conn.execute(text("select column_name, data_type, is_nullable from information_schema.columns where table_schema='auth' and table_name='users' order by ordinal_position")).fetchall()
    for c in cols:
        print("auth.users col:", c)
    rows = conn.execute(text('select id, email, role, active from public.profiles order by created_at limit 20')).fetchall()
    for r in rows:
        print("profile:", r)
