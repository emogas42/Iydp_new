"""News photos are uploaded in the admin panel instead of given as links or folder names

Adds news_photo. A news item whose photos sat in static/news/<keyword_image>/ gets those
files as its album, so the admin panel can reorder and remove them like any upload.

Revision ID: e9c4b2a17f58
Revises: d7e2a4b19c63
"""
import os

from alembic import op
import sqlalchemy as sa

revision = 'e9c4b2a17f58'
down_revision = 'd7e2a4b19c63'
branch_labels = None
depends_on = None

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'static'))
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

news = sa.table('news', sa.column('id', sa.Integer), sa.column('keyword_image', sa.String))


def _folder_images(folder):
    folder = (folder or '').strip()
    if not folder or any(x in folder for x in ('..', '/', '\\')):
        return []
    path = os.path.join(STATIC_DIR, 'news', folder)
    if not os.path.isdir(path):
        return []
    names = sorted((n for n in os.listdir(path) if os.path.splitext(n)[1].lower() in IMAGE_EXTENSIONS), key=str.lower)
    return [f'/static/news/{folder}/{n}' for n in names]


def upgrade():
    bind = op.get_bind()
    # The app's create_all() may have made the table already.
    if 'news_photo' not in sa.inspect(bind).get_table_names():
        op.create_table(
            'news_photo',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('news_id', sa.Integer(), nullable=False),
            sa.Column('path', sa.String(length=255), nullable=False),
            sa.Column('position', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['news_id'], ['news.id']),
            sa.PrimaryKeyConstraint('id'),
        )
    if 'ix_news_photo_news_id' not in {i['name'] for i in sa.inspect(bind).get_indexes('news_photo')}:
        op.create_index('ix_news_photo_news_id', 'news_photo', ['news_id'])

    photo = sa.table('news_photo', sa.column('news_id', sa.Integer), sa.column('path', sa.String),
                     sa.column('position', sa.Integer))
    has_album = {row.news_id for row in bind.execute(sa.select(photo.c.news_id)).fetchall()}
    rows = []
    for item in bind.execute(sa.select(news)).fetchall():
        if item.id in has_album:
            continue
        for position, path in enumerate(_folder_images(item.keyword_image)):
            rows.append({'news_id': item.id, 'path': path, 'position': position})
    if rows:
        op.bulk_insert(photo, rows)


def downgrade():
    op.drop_index('ix_news_photo_news_id', table_name='news_photo')
    op.drop_table('news_photo')
