"""Replace blog posts with participant stories

Revision ID: 5b2f7c1d9a3e
Revises: ecc76809ab19
Create Date: 2026-10-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5b2f7c1d9a3e'
down_revision = 'ecc76809ab19'
branch_labels = None
depends_on = None


def _tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade():
    # app.py runs db.create_all() on import, so the new tables may already
    # exist by the time this migration runs; only create what is missing.
    tables = _tables()

    if 'story' not in tables:
        op.create_table(
            'story',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('author_name', sa.String(length=120), nullable=False),
            sa.Column('author_info', sa.String(length=160), nullable=True),
            sa.Column('program', sa.String(length=60), nullable=True),
            sa.Column('avatar_path', sa.String(length=255), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('is_published', sa.Boolean(), nullable=False),
            sa.Column('view_count', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_story_slug', 'story', ['slug'], unique=True)

    if 'story_photo' not in tables:
        op.create_table(
            'story_photo',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('story_id', sa.Integer(), nullable=False),
            sa.Column('path', sa.String(length=255), nullable=False),
            sa.Column('position', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['story_id'], ['story.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_story_photo_story_id', 'story_photo', ['story_id'], unique=False)

    # blog_post stays: the site no longer uses it, but a live server may hold posts
    # someone still wants. Dropping it is a separate, deliberate step.


def downgrade():
    if 'blog_post' not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(
            'blog_post',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('excerpt', sa.Text(), nullable=True),
            sa.Column('image_url', sa.String(length=255), nullable=True),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('is_published', sa.Boolean(), nullable=True),
            sa.Column('view_count', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('slug'),
        )
    op.drop_index('ix_story_photo_story_id', table_name='story_photo')
    op.drop_table('story_photo')
    op.drop_index('ix_story_slug', table_name='story')
    op.drop_table('story')
