"""Shared set-up for the checks: a new database, and no way to reach real mail or real data.

Importing this file blanks the mail settings, so values from a real .env are never used:
python-dotenv does not override what is already set. A check that needs mail sets its own
fake server afterwards.
"""
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADMIN_PASSWORD = 'test-admin-password'

os.environ.update(MAIL_SERVER='', MAIL_USERNAME='', MAIL_PASSWORD='', MAIL_FROM='', MAIL_REPLY_TO='',
                  CONTACT_NOTIFY_EMAIL='', SITE_URL='', FLASK_DEBUG='0', FLASK_APP='app.py',
                  SESSION_COOKIE_SECURE='0', SECRET_KEY='test-secret-key')
os.environ.pop('TRUSTED_PROXY_HOPS', None)

_template = None


def database_url(path):
    return 'sqlite:///' + path.replace(os.sep, '/')


def run_migrations(path):
    env = {**os.environ, 'DATABASE_URL': database_url(path), 'ADMIN_PASSWORD': ADMIN_PASSWORD, 'ADMIN_USERNAME': 'admin'}
    subprocess.run([sys.executable, '-m', 'flask', 'db', 'upgrade'], cwd=ROOT, env=env, check=True,
                   capture_output=True, text=True, encoding='utf-8', errors='replace')


def copy_fresh_db(path):
    """Puts a fully migrated database with one admin account at path."""
    global _template
    if _template is None:
        _template = os.path.join(tempfile.mkdtemp(), 'template.db')
        run_migrations(_template)
    shutil.copy(_template, path)


def use_fresh_db():
    """Points this process at a new database and returns its path."""
    path = os.path.join(tempfile.mkdtemp(), 'test.db')
    copy_fresh_db(path)
    os.environ['DATABASE_URL'] = database_url(path)
    os.environ.pop('ADMIN_PASSWORD', None)
    return path
