"""Account deletion, on a temp copy of the local database, with no real mail."""
import os, sqlite3, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap
proj = _bootstrap.ROOT
tmp = tempfile.mkdtemp()
t = os.path.join(tmp, 't.db')
_bootstrap.copy_fresh_db(t)
os.environ.update(DATABASE_URL='sqlite:///' + t.replace(os.sep, '/'), SESSION_COOKIE_SECURE='0', SECRET_KEY='x', FLASK_DEBUG='0',
                  MAIL_SERVER='', MAIL_USERNAME='', MAIL_PASSWORD='', MAIL_FROM='', SITE_URL='', FLASK_APP='app.py')
os.environ.pop('ADMIN_PASSWORD', None)
for _ in range(2):
    r = subprocess.run([sys.executable, '-m', 'flask', 'db', 'upgrade'], cwd=proj, env={**os.environ}, capture_output=True, text=True, encoding='utf-8', errors='replace')
    assert r.returncode == 0, r.stderr[-800:]
sys.path.insert(0, proj)
os.chdir(proj)
import app as m
from services import checkin
from werkzeug.security import generate_password_hash

app = m.app
app.config['WTF_CSRF_ENABLED'] = False
app.config['BOT_CHECK_ENABLED'] = False
m.limiter.enabled = False
passed = 0


def check(cond, label):
    global passed
    if not cond:
        print('FAIL:', label)
        raise SystemExit(1)
    passed += 1


def signup(email, password='secret123'):
    c = app.test_client()
    r = c.post('/api/auth/register', json={'full_name': 'Del Person', 'email': email, 'phone': '+994501234567', 'password': password, 'confirm_password': password})
    assert r.status_code == 201, r.data
    return c, r.get_json()['user']['id']


def counts(uid):
    with app.app_context():
        return {k.__name__: k.query.filter_by(user_id=uid).count() for k in (m.Application, m.EventRegistration, m.Attendance, m.Notification, m.MemberProfile, m.Payment)}


with app.app_context():
    admin = m.User.query.filter_by(is_admin=True).first()
    admin.password = generate_password_hash('adminpw12345')
    admin_name, admin_id = admin.username, admin.id
    project = m.Opportunity(title='P', description='d', is_active=True, accepts_applications=True)
    event = m.Event(name='E', is_active=True)
    m.db.session.add_all([project, event])
    m.db.session.commit()
    pid, eid = project.id, event.id


def fill(uid):
    with app.app_context():
        u = m.db.session.get(m.User, uid)
        qr = u.qr_token
        no = u.membership_no
        profile = m.MemberProfile(user_id=uid, citizenship='AZ', about='private text')
        m.db.session.add(profile)
        m.db.session.flush()
        m.db.session.add(m.ProfileLanguage(profile_id=profile.id, language='en', level='b2'))
        m.db.session.add(m.Application(user_id=uid, opportunity_id=pid, full_name='Del Person', email=u.email))
        m.db.session.add(m.EventRegistration(event_id=eid, user_id=uid))
        m.db.session.add(m.Attendance(event_id=eid, user_id=uid))
        m.db.session.add(m.Notification(user_id=uid, title='t', body='b'))
        m.db.session.add(m.Payment(user_id=uid, amount=50, status='completed', note='Cash'))
        m.db.session.add(m.Payment(user_id=uid, amount=50, status='pending'))
        u.is_vip, u.vip_status, u.is_staff_member = True, 'active', True
        m.db.session.commit()
        return qr, no


# member deletes own account
u, uid = signup('me@example.com')
second_device = app.test_client()
check(second_device.post('/api/auth/login', json={'email': 'me@example.com', 'password': 'secret123'}).status_code == 200, 'second device in')
qr, no = fill(uid)
check(app.test_client().post('/api/account/delete', json={'password': 'secret123'}).status_code == 401, 'guest refused')
for bad in ('', None, 'wrong-password', 123, ['secret123']):
    r = u.post('/api/account/delete', json={'password': bad})
    check(r.status_code == 400, f'bad password {bad!r}')
check(u.get('/api/auth/me').get_json()['user']['email'] == 'me@example.com', 'still there after refusals')
check(u.post('/api/account/delete').status_code == 400, 'no body refused')

r = u.post('/api/account/delete', json={'password': 'secret123'})
check(r.status_code == 200, 'deleted')
check(u.get('/api/auth/me').get_json()['user'] is None, 'this device signed out')
check(second_device.get('/api/auth/me').get_json()['user'] is None, 'other device signed out')
check(u.get('/api/account').status_code == 401, 'account page closed')
check(app.test_client().post('/api/auth/login', json={'email': 'me@example.com', 'password': 'secret123'}).status_code == 401, 'cannot sign in')

with app.app_context():
    row = m.db.session.get(m.User, uid)
    check(row.deleted_at, 'marked deleted')
    check(not any([row.email, row.full_name, row.phone, row.email_verified_at, row.is_vip, row.is_staff_member]), 'personal fields empty')
    check(row.vip_status == 'none' and 'me@example' not in row.username, 'nothing identifying left')
    check(not m.check_password_hash(row.password, 'secret123'), 'old password dead')
    check(row.qr_token and row.qr_token != qr, 'QR changed')
    c = counts(uid)
    check(c['Application'] == c['EventRegistration'] == c['Attendance'] == c['Notification'] == c['MemberProfile'] == 0, f'data gone {c}')
    check(c['Payment'] == 2, 'payments kept')
    check(m.Payment.query.filter_by(user_id=uid, status='pending').count() == 0, 'pending payment closed')
    check(m.ProfileLanguage.query.count() == 0 or not m.db.session.execute(m.db.text("select 1 from profile_language where language='en' and level='b2' and profile_id not in (select id from member_profile)")).first(), 'no orphans')
    check(m.Event.query.filter_by(id=eid).count() == 1 and m.Opportunity.query.filter_by(id=pid).count() == 1, 'event and project untouched')
    ev = m.db.session.get(m.Event, eid)
    check(checkin.check_in(ev, qr, m.db.session.get(m.User, admin_id))[0] == 'invalid', 'old QR refused')

# same address can sign up again, with its own id and nothing old
u2, uid2 = signup('me@example.com', 'newpass1234')
check(uid2 != uid, 'new id')
check(counts(uid2)['Payment'] == 0, 'new account starts clean')
check(u2.get('/api/auth/me').get_json()['user']['email'] == 'me@example.com', 'new account works')

# old session can never come back, even if the id were reused
with app.test_request_context():
    check(m.load_user(f'{uid}.1') is None and m.load_user(f'{uid}.2') is None and m.load_user(f'{uid}.0') is None, 'deleted row loads for no version')

# admins cannot delete themselves through the member route
adm = app.test_client()
check(adm.post('/admin/login', data={'username': admin_name, 'password': 'adminpw12345'}).status_code in (200, 302), 'admin login')
r = adm.post('/api/account/delete', json={'password': 'adminpw12345'})
check(r.status_code == 403, 'admin refused')
with app.app_context():
    check(m.db.session.get(m.User, admin_id).deleted_at is None, 'admin kept')
check(adm.post(f'/admin/members/{admin_id}/delete', data={'confirm_word': 'DELETE'}).status_code == 404, 'no admin delete of an admin')

# admin deletes a member
v, vid = signup('victim@example.com')
fill(vid)
page = adm.get(f'/admin/members/{vid}')
check(b'Type DELETE to confirm' in page.data, 'panel shows the form')
for who in (app.test_client(), v):
    who.post(f'/admin/members/{vid}/delete', data={'confirm_word': 'DELETE'})
with app.app_context():
    check(m.db.session.get(m.User, vid).deleted_at is None, 'guest and member cannot use it')
for word in ('', 'delete', 'yes', 'DELETED'):
    r = adm.post(f'/admin/members/{vid}/delete', data={'confirm_word': word}, follow_redirects=True)
    check(b'type DELETE to confirm' in r.data, f'needs the word, not {word!r}')
with app.app_context():
    check(m.db.session.get(m.User, vid).deleted_at is None, 'wrong word changes nothing')
get_code = adm.get(f'/admin/members/{vid}/delete').status_code
print('GET on delete url:', get_code)
with app.app_context():
    check(m.db.session.get(m.User, vid).deleted_at is None, 'GET cannot delete')
total_before = None
r = adm.post(f'/admin/members/{vid}/delete', data={'confirm_word': 'DELETE'}, follow_redirects=True)
check(r.status_code == 200 and b'account deleted' in r.data, 'admin deleted')
check(v.get('/api/auth/me').get_json()['user'] is None, 'member signed out')
check(b'victim@example.com' not in adm.get('/admin/members').data, 'gone from the list')
check(b'victim@example.com' not in adm.get('/admin/members?search=victim').data, 'gone from search')
check(adm.get(f'/admin/members/{vid}').status_code == 404, 'page gone')
check(adm.post(f'/admin/members/{vid}/delete', data={'confirm_word': 'DELETE'}).status_code == 404, 'second delete is a 404')
check(adm.post(f'/admin/members/{vid}/reset-password').status_code == 404, 'cannot revive with a password reset')
for path in ('/admin', f'/admin/events/{eid}/attendance', f'/admin/events/{eid}', '/admin/members', '/admin/vip-requests'):
    code = adm.get(path, follow_redirects=True).status_code
    check(code in (200, 404), f'{path} still opens: {code}')

# admin who decided something stays referenced, FK clean
db = sqlite3.connect(t)
check(db.execute('pragma foreign_key_check').fetchall() == [], 'foreign keys clean')
leaks = db.execute("select count(*) from user where deleted_at is not null and (email is not null or full_name is not null or phone is not null)").fetchone()[0]
check(leaks == 0, 'no personal fields on deleted rows')
db.close()
print('ALL PASSED:', passed)
