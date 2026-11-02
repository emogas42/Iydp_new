"""Admin password reset: forced change flag and session version

Revision ID: c3d92f7a15e8
Revises: a7c41e92d0b3
Create Date: 2026-11-02 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d92f7a15e8'
down_revision = 'a7c41e92d0b3'
branch_labels = None
depends_on = None


def upgrade():
    # app.py runs db.create_all() on import, so a fresh database already has these.
    existing = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('user')}
    with op.batch_alter_table('user', schema=None) as batch_op:
        if 'must_change_password' not in existing:
            batch_op.add_column(sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.false()))
        if 'session_version' not in existing:
            batch_op.add_column(sa.Column('session_version', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('session_version')
        batch_op.drop_column('must_change_password')
