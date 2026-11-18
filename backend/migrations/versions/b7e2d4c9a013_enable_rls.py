"""Enable Row Level Security on every application table.

Supabase automatically exposes the public schema through its Data API (PostgREST)
to anyone holding the project's anon key. With RLS enabled and no policies, that
API returns nothing. The Flask backend connects as the table owner, which bypasses
RLS, so application behaviour is unchanged.

Revision ID: b7e2d4c9a013
Revises: a1c9e0f2b7d4
"""
from alembic import op

revision = "b7e2d4c9a013"
down_revision = "a1c9e0f2b7d4"
branch_labels = None
depends_on = None

_TABLES_SQL = """
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename <> 'alembic_version'
"""


def _tables():
    return [row[0] for row in op.get_bind().exec_driver_sql(_TABLES_SQL)]


def upgrade():
    for table in _tables():
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')


def downgrade():
    for table in _tables():
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
