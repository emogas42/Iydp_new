"""Migrations with foreign keys on keep child rows; backup restores to the same data. Works on copies only."""
import gzip, os, shutil, sqlite3, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap
proj = _bootstrap.ROOT
py = sys.executable
tmp = tempfile.mkdtemp()


def counts(path):
    c = sqlite3.connect(path)
    tables = [r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name != 'alembic_version'")]
    out = {t: c.execute(f'select count(*) from "{t}"').fetchone()[0] for t in tables}
    c.close()
    return out


def flask(db, *args):
    env = {**os.environ, 'DATABASE_URL': _bootstrap.database_url(db)}
    env.pop('ADMIN_PASSWORD', None)
    r = subprocess.run([py, '-m', 'flask', 'db', *args], cwd=proj, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        print(r.stdout[-1500:], r.stderr[-1500:])
        sys.exit('migration failed: ' + ' '.join(args))
    return r


# down and up across the latest migrations. A new install makes its tables before the
# migrations run, so older constraints have no names to drop on this kind of database.
copy = os.path.join(tmp, 'mig.db')
source = _bootstrap.use_fresh_db()
sys.path.insert(0, proj)
os.chdir(proj)
# Rows in the tables the migrations rebuild, in a child process so this one stays free of the app.
seed = '''
import app as m
with m.app.app_context():
    member = m.User(username="seed@example.com", email="seed@example.com", full_name="Seed", password="x", is_admin=False)
    project = m.Opportunity(title="P", description="d", is_active=True)
    event = m.Event(name="E", is_active=True)
    m.db.session.add_all([member, project, event, m.News(title="N", content="c"), m.ContactMessage(name="A &amp; B", email="a@example.com", message="x")])
    m.db.session.flush()
    m.db.session.add(m.Application(user_id=member.id, opportunity_id=project.id, full_name="Seed", email="seed@example.com"))
    m.db.session.add(m.EventRegistration(event_id=event.id, user_id=member.id))
    m.db.session.add(m.Payment(user_id=member.id, amount=50, status="completed"))
    m.db.session.commit()
'''
subprocess.run([py, '-c', seed], cwd=proj, env=os.environ, check=True, capture_output=True)
shutil.copy(source, copy)
before = counts(copy)
flask(copy, 'downgrade', 'c8f1e3a7b2d4')
flask(copy, 'upgrade')
after = counts(copy)
assert before == after, (before, after)
print('migrations kept every row:', sum(before.values()), 'rows in', len(before), 'tables')
assert sqlite3.connect(copy).execute('pragma foreign_key_check').fetchall() == []

# fresh install
fresh = os.path.join(tmp, 'fresh.db')
flask(fresh, 'upgrade')
print('fresh install version:', sqlite3.connect(fresh).execute('select version_num from alembic_version').fetchall())

# backup while a writer holds uncommitted-free WAL content
live = os.path.join(tmp, 'live.db')
shutil.copy(copy, live)
w = sqlite3.connect(live)
w.execute('pragma journal_mode=wal')
w.execute("update user set phone='ONLY-IN-WAL' where id=(select min(id) from user)")
w.commit()
assert os.path.getsize(live + '-wal') > 0
out = os.path.join(tmp, 'backups')
env = {**os.environ, 'DATABASE_URL': _bootstrap.database_url(live), 'BACKUP_DIR': out, 'BACKUP_KEEP_DAYS': '14'}
r = subprocess.run([py, os.path.join(proj, 'scripts', 'backup_db.py')], cwd=tmp, env=env, capture_output=True, text=True)
print(r.stdout.strip()[-120:], r.stderr.strip()[-400:])
assert r.returncode == 0
packs = [f for f in os.listdir(out) if f.endswith('.db.gz')]
assert len(packs) == 1
restored = os.path.join(tmp, 'restored.db')
with gzip.open(os.path.join(out, packs[0])) as f_in, open(restored, 'wb') as f_out:
    shutil.copyfileobj(f_in, f_out)
rc = sqlite3.connect(restored)
assert rc.execute('pragma integrity_check').fetchone()[0] == 'ok'
assert rc.execute("select count(*) from user where phone='ONLY-IN-WAL'").fetchone()[0] == 1, 'WAL data missing from backup'
assert counts(restored) == after
print('restore OK, includes data still in the WAL')
rc.close()

# pruning: old ones go, newest stays
old = os.path.join(out, 'iydp-20200101-000000.db.gz')
open(old, 'wb').write(b'x')
os.utime(old, (1577836800, 1577836800))
subprocess.run([py, os.path.join(proj, 'scripts', 'backup_db.py')], cwd=tmp, env=env, capture_output=True, text=True, check=True)
assert not os.path.exists(old)
print('prune OK, backups now:', len([f for f in os.listdir(out) if f.endswith('.db.gz')]))
uploads = os.path.join(out, 'uploads')
print('uploads mirrored:', sum(len(f) for _, _, f in os.walk(uploads)) if os.path.isdir(uploads) else 0)

# a server database is refused, not silently skipped
env2 = {**env, 'DATABASE_URL': 'mysql+pymysql://u:p@localhost/x'}
r = subprocess.run([py, os.path.join(proj, 'scripts', 'backup_db.py')], cwd=tmp, env=env2, capture_output=True, text=True)
assert r.returncode != 0 and 'SQLite' in r.stderr
print('non-SQLite refused: OK')
w.close()
print('CHECK_DB PASSED')
