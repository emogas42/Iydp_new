"""Project application forms and decision notices

Revision ID: a1d4e6f09c27
Revises: f5a2c7d81b36
Create Date: 2026-11-03 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1d4e6f09c27'
down_revision = 'f5a2c7d81b36'
branch_labels = None
depends_on = None


def upgrade():
    # app.py runs db.create_all() on import, so these usually exist on a fresh database.
    bind = op.get_bind()
    if 'project_question' not in sa.inspect(bind).get_table_names():
        op.create_table(
            'project_question',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('opportunity_id', sa.Integer(), sa.ForeignKey('opportunity.id'), nullable=False, index=True),
            sa.Column('position', sa.Integer(), nullable=False),
            sa.Column('label', sa.String(300), nullable=False),
            sa.Column('help_text', sa.String(500), nullable=True),
            sa.Column('kind', sa.String(20), nullable=False),
            sa.Column('required', sa.Boolean(), nullable=False),
            sa.Column('options', sa.JSON(), nullable=True),
        )

    application = {c['name'] for c in sa.inspect(bind).get_columns('application')}
    if 'answers' not in application:
        with op.batch_alter_table('application', schema=None) as batch_op:
            batch_op.add_column(sa.Column('answers', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('decision_note', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('email_status', sa.String(10), nullable=True))

    notification = {c['name'] for c in sa.inspect(bind).get_columns('notification')}
    if 'opportunity_id' not in notification:
        with op.batch_alter_table('notification', schema=None) as batch_op:
            batch_op.add_column(sa.Column('opportunity_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_notification_opportunity', 'opportunity', ['opportunity_id'], ['id'])
            batch_op.create_index('ix_notification_opportunity_id', ['opportunity_id'])


def downgrade():
    with op.batch_alter_table('notification', schema=None) as batch_op:
        batch_op.drop_index('ix_notification_opportunity_id')
        batch_op.drop_constraint('fk_notification_opportunity', type_='foreignkey')
        batch_op.drop_column('opportunity_id')
    with op.batch_alter_table('application', schema=None) as batch_op:
        batch_op.drop_column('email_status')
        batch_op.drop_column('decision_note')
        batch_op.drop_column('answers')
    op.drop_table('project_question')
