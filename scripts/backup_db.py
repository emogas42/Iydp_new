"""Daily backup of the SQLite database and uploaded images. Run by a cPanel cron job.

Uses SQLite's backup API, so it is safe while the site is running. Copying the
.db file by hand is not: in WAL mode recent changes can sit in the -wal file.

BACKUP_DIR defaults to ../iydp-backups, BACKUP_KEEP_DAYS to 14.
"""
import gzip
import os
import shutil
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parent.parent
PREFIX = 'iydp-'
SUFFIX = '.db.gz'


def database_path():
    url = make_url(os.environ.get('DATABASE_URL', 'sqlite:///iydp.db'))
    if url.get_backend_name() != 'sqlite':
        sys.exit('This script only backs up SQLite. Use your database server\'s own backups.')
    path = Path(url.database)
    # Flask-SQLAlchemy resolves relative SQLite paths against the instance folder.
    return path if path.is_absolute() else ROOT / 'instance' / path


def backup_database(source, target_dir):
    if not source.exists():
        sys.exit(f'Database not found: {source}')
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    raw = target_dir / f'{PREFIX}{stamp}.db.tmp'
    packed = target_dir / f'{PREFIX}{stamp}{SUFFIX}'

    src = sqlite3.connect(f'{source.as_uri()}?mode=ro', uri=True)
    dst = sqlite3.connect(raw)
    try:
        src.backup(dst)
        result = dst.execute('PRAGMA integrity_check').fetchone()[0]
    finally:
        dst.close()
        src.close()
    if result != 'ok':
        raw.unlink()
        sys.exit(f'Backup failed the integrity check: {result}')

    with open(raw, 'rb') as f_in, gzip.open(packed, 'wb') as f_out:
        shutil.copyfileobj(f_in, f_out)
    raw.unlink()
    # Holds member data and password hashes.
    packed.chmod(0o600)
    return packed


def prune(target_dir, keep_days):
    """Older backups go, but the newest one always stays."""
    cutoff = datetime.now() - timedelta(days=keep_days)
    backups = sorted(target_dir.glob(f'{PREFIX}*{SUFFIX}'))
    for old in backups[:-1]:
        if datetime.fromtimestamp(old.stat().st_mtime) < cutoff:
            old.unlink()


def mirror_uploads(source, target):
    """Adds new images only, so one bad delete on the site cannot wipe the copy."""
    copied = 0
    for path in source.rglob('*') if source.exists() else []:
        if path.is_file():
            copy = target / path.relative_to(source)
            if not copy.exists():
                copy.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, copy)
                copied += 1
    return copied


def main():
    load_dotenv(ROOT / '.env')
    target_dir = Path(os.environ.get('BACKUP_DIR') or ROOT.parent / 'iydp-backups')
    target_dir.mkdir(parents=True, exist_ok=True)

    packed = backup_database(database_path(), target_dir)
    prune(target_dir, int(os.environ.get('BACKUP_KEEP_DAYS', '14')))
    copied = mirror_uploads(ROOT / 'static' / 'uploads', target_dir / 'uploads')
    print(f'{packed} ({packed.stat().st_size} bytes), {copied} new images')


if __name__ == '__main__':
    main()
