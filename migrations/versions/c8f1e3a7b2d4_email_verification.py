"""Email verification

Accounts that already exist start as unconfirmed. They can still sign in, and are
asked to confirm once before applying to something.

Revision ID: c8f1e3a7b2d4
Revises: a1d4e6f09c27
Create Date: 2026-11-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f1e3a7b2d4'
down_revision = 'a1d4e6f09c27'
branch_labels = None
depends_on = None


def upgrade():
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('user')}
    if 'email_verified_at' not in columns:
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.add_column(sa.Column('email_verified_at', sa.DateTime(), nullable=True))
            batch_op.add_column(sa.Column('email_verification_sent_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('email_verification_sent_at')
        batch_op.drop_column('email_verified_at')
