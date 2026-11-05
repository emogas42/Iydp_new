"""Event registration forms, admin approval and member notifications

Revision ID: f5a2c7d81b36
Revises: e41b8c6f2d70
Create Date: 2026-11-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f5a2c7d81b36'
down_revision = 'e41b8c6f2d70'
branch_labels = None
depends_on = None


def upgrade():
    # app.py runs db.create_all() on import, so these tables usually exist already.
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if 'event_question' not in tables:
        op.create_table(
            'event_question',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id'), nullable=False, index=True),
            sa.Column('position', sa.Integer(), nullable=False),
            sa.Column('label', sa.String(300), nullable=False),
            sa.Column('help_text', sa.String(500), nullable=True),
            sa.Column('kind', sa.String(20), nullable=False),
            sa.Column('required', sa.Boolean(), nullable=False),
            sa.Column('options', sa.JSON(), nullable=True),
        )
    if 'notification' not in tables:
        op.create_table(
            'notification',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False, index=True),
            sa.Column('event_id', sa.Integer(), sa.ForeignKey('event.id'), nullable=True, index=True),
            sa.Column('title', sa.String(300), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('link', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('read_at', sa.DateTime(), nullable=True),
        )

    existing = {c['name'] for c in sa.inspect(bind).get_columns('event_registration')}
    if 'status' not in existing:
        with op.batch_alter_table('event_registration', schema=None) as batch_op:
            batch_op.add_column(sa.Column('status', sa.String(20), nullable=False, server_default='pending'))
            batch_op.add_column(sa.Column('answers', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('decision_note', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('decided_at', sa.DateTime(), nullable=True))
            batch_op.add_column(sa.Column('decided_by_id', sa.Integer(), nullable=True))
            batch_op.add_column(sa.Column('email_status', sa.String(10), nullable=True))
            batch_op.create_foreign_key('fk_event_registration_decided_by', 'user', ['decided_by_id'], ['id'])
            batch_op.create_index('ix_event_registration_status', ['status'])
        # These people were told they had a seat under the old one-click flow: they keep it.
        op.execute("UPDATE event_registration SET status = 'approved'")


def downgrade():
    with op.batch_alter_table('event_registration', schema=None) as batch_op:
        batch_op.drop_index('ix_event_registration_status')
        batch_op.drop_constraint('fk_event_registration_decided_by', type_='foreignkey')
        batch_op.drop_column('email_status')
        batch_op.drop_column('decided_by_id')
        batch_op.drop_column('decided_at')
        batch_op.drop_column('decision_note')
        batch_op.drop_column('answers')
        batch_op.drop_column('status')
    op.drop_table('notification')
    op.drop_table('event_question')
