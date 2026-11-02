"""Projects, application form, public event registration, cards for everyone

Revision ID: a7c41e92d0b3
Revises: 5b2f7c1d9a3e
Create Date: 2026-11-02 12:00:00.000000

"""
import secrets

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7c41e92d0b3'
down_revision = '5b2f7c1d9a3e'
branch_labels = None
depends_on = None


def _add_missing(table, columns):
    existing = {c['name'] for c in sa.inspect(op.get_bind()).get_columns(table)}
    missing = [c for c in columns if c.name not in existing]
    if missing:
        with op.batch_alter_table(table, schema=None) as batch_op:
            for column in missing:
                batch_op.add_column(column)
    return bool(missing)


def _issue_cards():
    """Every existing account gets a card number and a QR. Issued numbers stay as they are."""
    bind = op.get_bind()
    user = sa.table(
        'user', sa.column('id', sa.Integer), sa.column('membership_no', sa.String), sa.column('qr_token', sa.String)
    )
    for row in bind.execute(sa.select(user.c.id, user.c.membership_no, user.c.qr_token)).fetchall():
        values = {}
        if not row.membership_no:
            values['membership_no'] = f'IYDP-{row.id:05d}'
        if not row.qr_token:
            values['qr_token'] = secrets.token_urlsafe(24)
        if values:
            bind.execute(user.update().where(user.c.id == row.id).values(**values))


def upgrade():
    # app.py runs db.create_all() on import, so new tables may already exist
    # and a fresh database already has the new columns.
    tables = set(sa.inspect(op.get_bind()).get_table_names())

    if 'opportunity_photo' not in tables:
        op.create_table(
            'opportunity_photo',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('opportunity_id', sa.Integer(), nullable=False),
            sa.Column('path', sa.String(length=255), nullable=False),
            sa.Column('position', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['opportunity_id'], ['opportunity.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_opportunity_photo_opportunity_id', 'opportunity_photo', ['opportunity_id'])

    if 'event_registration' not in tables:
        op.create_table(
            'event_registration',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['event_id'], ['event.id']),
            sa.ForeignKeyConstraint(['user_id'], ['user.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', 'user_id', name='uq_event_registration_event_user'),
        )
        op.create_index('ix_event_registration_event_id', 'event_registration', ['event_id'])
        op.create_index('ix_event_registration_user_id', 'event_registration', ['user_id'])

    _add_missing('user', [
        sa.Column('is_staff_member', sa.Boolean(), nullable=False, server_default=sa.false()),
    ])
    _add_missing('opportunity', [
        sa.Column('poster_path', sa.String(length=255), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('status_mode', sa.String(length=10), nullable=False, server_default='auto'),
        sa.Column('accepts_applications', sa.Boolean(), nullable=False, server_default=sa.true()),
    ])
    # Events that already exist stay hidden until an admin chooses to show them.
    _add_missing('event', [
        sa.Column('poster_path', sa.String(length=255), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false()),
    ])
    added = _add_missing('application', [
        sa.Column('full_name', sa.String(length=150), nullable=True),
        sa.Column('email', sa.String(length=150), nullable=True),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('residence', sa.String(length=150), nullable=True),
        sa.Column('english_level', sa.String(length=30), nullable=True),
        sa.Column('motivation', sa.Text(), nullable=True),
        sa.Column('cv_link', sa.String(length=500), nullable=True),
        sa.Column('admin_note', sa.Text(), nullable=True),
    ])
    if added:
        with op.batch_alter_table('application', schema=None) as batch_op:
            batch_op.create_unique_constraint('uq_application_user_opportunity', ['user_id', 'opportunity_id'])

    _issue_cards()


def downgrade():
    with op.batch_alter_table('application', schema=None) as batch_op:
        batch_op.drop_constraint('uq_application_user_opportunity', type_='unique')
        for name in ('admin_note', 'cv_link', 'motivation', 'english_level', 'residence', 'birth_date', 'phone', 'email', 'full_name'):
            batch_op.drop_column(name)
    with op.batch_alter_table('event', schema=None) as batch_op:
        for name in ('is_public', 'capacity', 'poster_path'):
            batch_op.drop_column(name)
    with op.batch_alter_table('opportunity', schema=None) as batch_op:
        for name in ('accepts_applications', 'status_mode', 'end_date', 'start_date', 'poster_path'):
            batch_op.drop_column(name)
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('is_staff_member')
    op.drop_index('ix_event_registration_user_id', table_name='event_registration')
    op.drop_index('ix_event_registration_event_id', table_name='event_registration')
    op.drop_table('event_registration')
    op.drop_index('ix_opportunity_photo_opportunity_id', table_name='opportunity_photo')
    op.drop_table('opportunity_photo')
