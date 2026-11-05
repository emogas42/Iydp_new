"""Forgot password on a temp database copy. Mail is captured, nothing leaves this machine."""
import os, re, sqlite3, subprocess, sys, tempfile, threading, time
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap
proj = _bootstrap.ROOT
tmp = tempfile.mkdtemp()
t = os.path.join(tmp, 't.db')
_bootstrap.copy_fresh_db(t)
os.environ.update(DATABASE_URL='sqlite:///' + t.replace(os.sep, '/'), SESSION_COOKIE_SECURE='0', SECRET_KEY='x', FLASK_DEBUG='0',
                  MAIL_SERVER='', MAIL_USERNAME='', MAIL_PASSWORD='', MAIL_FROM='', SITE_URL='', FLASK_APP='app.py')
os.environ.pop('ADMIN_PASSWORD', None)
r = subprocess.run([sys.executable, '-m', 'flask', 'db', 'upgrade'], cwd=proj, env={**os.environ}, capture_output=True, text=True, encoding='utf-8', errors='replace')
assert r.returncode == 0, r.stderr[-800:]
sys.path.insert(0, proj)
os.chdir(proj)
import app as m
from services import accounts, mail, password_reset
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash

app = m.app
app.config['WTF_CSRF_ENABLED'] = False
app.config['BOT_CHECK_ENABLED'] = False
m.limiter.enabled = False
passed = 0
sent = []


def check(cond, label):
    global passed
    if not cond:
        print('FAIL:', label)
        raise SystemExit(1)
    passed += 1


def fake_deliver(to, subject, body, reply_to=None):
    sent.append((to, subject, body))


def post_forgot(email):
    n = threading.active_count()
    r = app.test_client().post('/api/auth/forgot-password', json={'email': email})
    for th in threading.enumerate():
        if th is not threading.current_thread():
            th.join(2)
    return r


def signup(email, password='old-password1'):
    c = app.test_client()
    r = c.post('/api/auth/register', json={'full_name': 'Reset <b>Person</b>', 'email': email, 'phone': '', 'password': password, 'confirm_password': password})
    assert r.status_code == 201, r.data
    return c, r.get_json()['user']['id']


def login(email, password):
    c = app.test_client()
    return c, c.post('/api/auth/login', json={'email': email, 'password': password}).status_code


def token_from(body):
    return re.search(r'/reset-password\?token=(\S+)', body).group(1)


def reset(token, pw='new-password1', confirm=None):
    return app.test_client().post('/api/auth/reset-password', json={'token': token, 'password': pw, 'confirm_password': confirm if confirm is not None else pw})


# mail off: says so, for every address alike
r = post_forgot('nobody@example.com')
check(r.status_code == 503 and r.get_json()['code'] == 'mail_off', 'mail off answers 503')

os.environ.update(MAIL_SERVER='smtp.invalid', MAIL_FROM='IYDP <noreply@iydp.org>', SITE_URL='https://iydp.org')
p = mock.patch.object(mail, 'deliver', fake_deliver)
p.start()

member, uid = signup('reset@example.com')
sent.clear()
other_device, code = login('reset@example.com', 'old-password1')
check(code == 200, 'second device in')

# same answer with and without an account
r1 = post_forgot('reset@example.com')
n_after_real = len(sent)
r2 = post_forgot('nobody@example.com')
check(r1.status_code == r2.status_code == 200 and r1.data == r2.data, 'identical answers')
check(n_after_real == 1 and len(sent) == 1, 'only the real account got mail')
to, subject, body = sent[-1]
check(to == 'reset@example.com', 'goes to the address on file')
check('https://iydp.org/reset-password?token=' in body, 'uses SITE_URL')
check('Reset' not in body and '<b>' not in body, 'no member-chosen name in the mail')
check(post_forgot('RESET@Example.com ').status_code == 200 and len(sent) == 2, 'address normalised')
token = token_from(sent[-1][2])

# bad requests do not crash
for bad in ('', 'not-an-email', None, 123, ['a@b.co'], {'x': 1}, 'a@b.co\r\nBcc: x@y.co', 'x' * 200 + '@example.com'):
    r = app.test_client().post('/api/auth/forgot-password', json={'email': bad})
    check(r.status_code == 400, f'bad address {bad!r}: {r.status_code}')
check(app.test_client().post('/api/auth/forgot-password', json=['x']).status_code == 400, 'list body')
check(app.test_client().post('/api/auth/forgot-password').status_code == 400, 'no body')
check(len(sent) == 2, 'bad requests sent nothing')

# bad tokens
for bad in ('', None, 123, ['x'], 'garbage', token + 'x', token[:-3]):
    r = reset(bad)
    check(r.status_code == 400 and r.get_json()['code'] == 'invalid', f'bad token {bad!r}')
check(app.test_client().post('/api/auth/reset-password', json=['x']).status_code == 400, 'list body on reset')
with app.app_context():
    u = m.db.session.get(m.User, uid)
    verification_token = URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='email-verification').dumps({'user': uid, 'state': password_reset._fingerprint(u)})
    from services import email_verification
    check(reset(email_verification.make_token(u)).status_code == 400, 'an email confirmation link cannot reset a password')
    check(reset(verification_token).status_code == 400, 'other salt refused')

# bad passwords leave the link usable
for pw, conf in (('short', 'short'), ('new-password1', 'different1'), (12345678, 12345678), (None, None), (['aaaaaaaa'], ['aaaaaaaa'])):
    r = app.test_client().post('/api/auth/reset-password', json={'token': token, 'password': pw, 'confirm_password': conf})
    check(r.status_code == 400 and 'code' not in r.get_json(), f'bad password {pw!r}')
check(login('reset@example.com', 'old-password1')[1] == 200, 'old password still works before reset')
check(app.test_client().get(f'/reset-password?token={token}').status_code in (200, 404) and login('reset@example.com', 'old-password1')[1] == 200, 'opening the page changes nothing')

# the reset
with app.app_context():
    u = m.db.session.get(m.User, uid)
    u.must_change_password = True
    version = u.session_version
    check(u.email_verified_at is None, 'not verified yet')
    m.db.session.commit()
r = reset(token)
check(r.status_code == 200, 'reset works')
check(login('reset@example.com', 'old-password1')[1] == 401, 'old password dead')
check(login('reset@example.com', 'new-password1')[1] == 200, 'new password works')
check(member.get('/api/auth/me').get_json()['user'] is None and other_device.get('/api/auth/me').get_json()['user'] is None, 'all devices signed out')
with app.app_context():
    u = m.db.session.get(m.User, uid)
    check(u.must_change_password is False and u.email_verified_at and u.session_version == version + 1, 'flags updated')
check(reset(token, 'again-password1').status_code == 400, 'link works only once')
check(login('reset@example.com', 'new-password1')[1] == 200, 'second use changed nothing')

# older link dies when a newer one is used
post_forgot('reset@example.com'); first = token_from(sent[-1][2])
post_forgot('reset@example.com'); second = token_from(sent[-1][2])
check(reset(second, 'third-password1').status_code == 200 and reset(first, 'fourth-password').status_code == 400, 'older link dead')

# password change while logged in kills a link
post_forgot('reset@example.com'); pending = token_from(sent[-1][2])
c, code = login('reset@example.com', 'third-password1')
check(c.post('/api/account/password', json={'current_password': 'third-password1', 'new_password': 'fifth-password1', 'confirm_password': 'fifth-password1'}).status_code == 200, 'normal change')
check(reset(pending).status_code == 400, 'link dead after normal password change')

# address change kills a link
post_forgot('reset@example.com'); pending = token_from(sent[-1][2])
with app.app_context():
    m.db.session.get(m.User, uid).email = 'moved@example.com'
    m.db.session.commit()
check(reset(pending).status_code == 400, 'link dead after address change')

# expiry
post_forgot('moved@example.com'); pending = token_from(sent[-1][2])
real = password_reset.LINK_LIFETIME
from datetime import timedelta
password_reset.LINK_LIFETIME = timedelta(seconds=-1)
r = reset(pending)
check(r.status_code == 400 and r.get_json()['code'] == 'expired', 'expired link says so')
password_reset.LINK_LIFETIME = real

# admin and deleted accounts get nothing
with app.app_context():
    admin = m.User.query.filter_by(is_admin=True).first()
    admin.email = 'boss@example.com'
    admin_token = password_reset.make_token(admin)
    admin_hash = admin.password
    aid = admin.id
    m.db.session.commit()
n = len(sent)
check(post_forgot('boss@example.com').status_code == 200 and len(sent) == n, 'no mail for admin')
check(reset(admin_token).status_code == 400, 'hand-made admin token refused')
with app.app_context():
    check(m.db.session.get(m.User, aid).password == admin_hash, 'admin password unchanged')

d, did = signup('gone@example.com')
sent.clear()
post_forgot('gone@example.com'); dead = token_from(sent[-1][2])
with app.app_context():
    accounts.erase(m.db.session.get(m.User, did)); m.db.session.commit()
n = len(sent)
check(post_forgot('gone@example.com').status_code == 200 and len(sent) == n, 'no mail for deleted account')
check(reset(dead).status_code == 400, 'link of a deleted account refused')

# a member who was logged in as someone else stays that person
c1, _ = signup('stay@example.com')
sent.clear()
post_forgot('moved@example.com'); pending = token_from(sent[-1][2])
check(c1.post('/api/auth/reset-password', json={'token': pending, 'password': 'sixth-password1', 'confirm_password': 'sixth-password1'}).status_code == 200, 'reset while signed in elsewhere')
check(c1.get('/api/auth/me').get_json()['user']['email'] == 'stay@example.com', 'still own account, not logged in to the other')

# anonymous reset never logs in
c2 = app.test_client()
post_forgot('moved@example.com'); pending = token_from(sent[-1][2])
c2.post('/api/auth/reset-password', json={'token': pending, 'password': 'seven-password1', 'confirm_password': 'seven-password1'})
check(c2.get('/api/auth/me').get_json()['user'] is None, 'reset does not sign in')

# a mail failure gives the same answer
p.stop()
os.environ['MAIL_SERVER'] = '127.0.0.1'
os.environ['MAIL_PORT'] = '1'
r = post_forgot('moved@example.com')
check(r.status_code == 200 and r.get_json() == {'status': 'ok'}, 'mail server down gives the same answer')
os.environ['MAIL_SERVER'] = 'smtp.invalid'
p.start()

# rate limits, for real
m.limiter.enabled = True
m.limiter.reset()
codes = [app.test_client().post('/api/auth/forgot-password', json={'email': f'n{i}@example.com'}).status_code for i in range(6)]
check(codes == [200] * 5 + [429], f'per-minute limit {codes}')
m.limiter.reset()
h = {'X-Forwarded-For': '1.2.3.4'}
limits = []
for i in range(6):
    limits.append(app.test_client().post('/api/auth/forgot-password', json={'email': 'same@example.com'}, environ_base={'REMOTE_ADDR': f'10.0.0.{i}'}).status_code)
check(limits == [200] * 5 + [429], f'per-address limit across IPs {limits}')
check(app.test_client().post('/api/auth/forgot-password', json={'email': ' SAME@example.com'}, environ_base={'REMOTE_ADDR': '10.0.1.1'}).status_code == 429, 'limit ignores case and spaces')
p.stop()

# csrf is on for real requests
app.config['WTF_CSRF_ENABLED'] = True
check(app.test_client().post('/api/auth/reset-password', json={'token': 'x'}).status_code == 400, 'csrf required')
print('ALL PASSED:', passed)
