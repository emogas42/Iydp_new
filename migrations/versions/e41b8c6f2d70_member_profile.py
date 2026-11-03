"""Member profile: education, experience, languages; projects can require it

Revision ID: e41b8c6f2d70
Revises: c3d92f7a15e8
Create Date: 2026-11-02 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e41b8c6f2d70'
down_revision = 'c3d92f7a15e8'
branch_labels = None
depends_on = None


def upgrade():
    # app.py runs db.create_all() on import, so these tables usually exist already.
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if 'member_profile' not in tables:
        op.create_table(
            'member_profile',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False, unique=True),
            sa.Column('birth_date', sa.Date(), nullable=True),
            sa.Column('gender', sa.String(20), nullable=True),
            sa.Column('citizenship', sa.String(100), nullable=True),
            sa.Column('residence', sa.String(150), nullable=True),
            sa.Column('occupation', sa.String(20), nullable=True),
            sa.Column('about', sa.Text(), nullable=True),
            sa.Column('skills', sa.Text(), nullable=True),
            sa.Column('interests', sa.JSON(), nullable=True),
            sa.Column('past_programmes', sa.Text(), nullable=True),
            sa.Column('cv_link', sa.String(500), nullable=True),
            sa.Column('linkedin', sa.String(500), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
    if 'profile_education' not in tables:
        op.create_table(
            'profile_education',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('profile_id', sa.Integer(), sa.ForeignKey('member_profile.id'), nullable=False, index=True),
            sa.Column('institution', sa.String(200), nullable=False),
            sa.Column('level', sa.String(20), nullable=False),
            sa.Column('field', sa.String(150), nullable=True),
            sa.Column('start_year', sa.Integer(), nullable=True),
            sa.Column('end_year', sa.Integer(), nullable=True),
        )
    if 'profile_experience' not in tables:
        op.create_table(
            'profile_experience',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('profile_id', sa.Integer(), sa.ForeignKey('member_profile.id'), nullable=False, index=True),
            sa.Column('kind', sa.String(20), nullable=False),
            sa.Column('organization', sa.String(200), nullable=False),
            sa.Column('role', sa.String(150), nullable=True),
            sa.Column('start_year', sa.Integer(), nullable=True),
            sa.Column('end_year', sa.Integer(), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
        )
    if 'profile_language' not in tables:
        op.create_table(
            'profile_language',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('profile_id', sa.Integer(), sa.ForeignKey('member_profile.id'), nullable=False, index=True),
            sa.Column('language', sa.String(60), nullable=False),
            sa.Column('level', sa.String(10), nullable=False),
        )

    existing = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('opportunity')}
    if 'requires_profile' not in existing:
        with op.batch_alter_table('opportunity', schema=None) as batch_op:
            batch_op.add_column(sa.Column('requires_profile', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    with op.batch_alter_table('opportunity', schema=None) as batch_op:
        batch_op.drop_column('requires_profile')
    op.drop_table('profile_language')
    op.drop_table('profile_experience')
    op.drop_table('profile_education')
    op.drop_table('member_profile')
