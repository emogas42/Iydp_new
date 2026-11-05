"""Account deletion

Revision ID: b3e7d1c4a905
Revises: c8f1e3a7b2d4
Create Date: 2026-11-04 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3e7d1c4a905'
down_revision = 'c8f1e3a7b2d4'
branch_labels = None
depends_on = None


def upgrade():
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('user')}
    if 'deleted_at' not in columns:
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.add_column(sa.Column('deleted_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('deleted_at')
