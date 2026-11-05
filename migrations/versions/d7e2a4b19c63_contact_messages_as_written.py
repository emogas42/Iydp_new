"""Store contact messages as written, not HTML-escaped

The admin page now escapes them when it shows them, the way every other page does.

Revision ID: d7e2a4b19c63
Revises: b3e7d1c4a905
"""
import html

from alembic import op
import sqlalchemy as sa

revision = 'd7e2a4b19c63'
down_revision = 'b3e7d1c4a905'
branch_labels = None
depends_on = None

message = sa.table('contact_message', sa.column('id', sa.Integer), sa.column('name', sa.String),
                   sa.column('email', sa.String), sa.column('message', sa.Text))


def upgrade():
    bind = op.get_bind()
    for row in bind.execute(sa.select(message)).fetchall():
        values = {
            'name': html.unescape(row.name or '')[:100],
            'email': html.unescape(row.email or '')[:120],
            'message': html.unescape(row.message or ''),
        }
        if values != {'name': row.name, 'email': row.email, 'message': row.message}:
            bind.execute(message.update().where(message.c.id == row.id).values(**values))


def downgrade():
    bind = op.get_bind()
    for row in bind.execute(sa.select(message)).fetchall():
        bind.execute(message.update().where(message.c.id == row.id).values(
            name=html.escape(row.name or ''), email=html.escape(row.email or ''), message=html.escape(row.message or '')))
