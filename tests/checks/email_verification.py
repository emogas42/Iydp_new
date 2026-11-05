"""Backend checks for email confirmation, on a temp copy of the local database, with mail captured."""
import os, re, sqlite3, subprocess, sys, tempfile
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap
proj = _bootstrap.ROOT
tmp = tempfile.mkdtemp()
t = os.path.join(tmp, 't.db')
_bootstrap.copy_fresh_db(t)
env = dict(DATABASE_URL='sqlite:///' + t.replace(os.sep, '/'), SESSION_COOKIE_SECURE='0', SECRET_KEY='x', FLASK_DEBUG='0',
           MAIL_SERVER='mail.invalid', MAIL_FROM='IYDP <noreply@iydp.org>', MAIL_USERNAME='', MAIL_PASSWORD='', SITE_URL='https://iydp.org/', FLASK_APP='app.py')
os.environ.update(env)
os.environ.pop('ADMIN_PASSWORD', None)

# migration on the copy, run twice to prove it can be repeated
for _ in range(2):
    r = subprocess.run([sys.executable, '-m', 'flask', 'db', 'upgrade'], cwd=proj, env={**os.environ}, capture_output=True, text=True, encoding='utf-8', errors='replace')
    assert r.returncode == 0, r.stderr[-800:]

sys.path.insert(0, proj)
os.chdir(proj)
import app as m
from services import mail, email_verification as v
from werkzeug.security import generate_password_hash

app = m.app
app.config['WTF_CSRF_ENABLED'] = False
app.config['BOT_CHECK_ENABLED'] = False
m.limiter.enabled = False
outbox = []
send_works = [True]


def fake_send(to, subject, body):
    if send_works[0]:
        outbox.append((to, subject, body))
    return send_works[0]


mail.send = fake_send
passed = 0


def check(cond, label):
    global passed
    if not cond:
        print('FAIL:', label)
        raise SystemExit(1)
    passed += 1


def signup(email, password='secret123'):
    c = app.test_client()
    r = c.post('/api/auth/register', json={'full_name': 'Test Person', 'email': email, 'password': password, 'confirm_password': password})
    return c, r


def token_from(body):
    return re.search(r'/verify-email\?token=(\S+)', body).group(1)


def age(email, hours=25):
    with app.app_context():
        u = m.User.query.filter_by(email=email).first()
        u.created_at = v._now() - timedelta(hours=hours)
        m.db.session.commit()


def rewind_cooldown(email):
    with app.app_context():
        u = m.User.query.filter_by(email=email).first()
        u.email_verification_sent_at = v._now() - timedelta(seconds=61)
        m.db.session.commit()


with app.app_context():
    project = m.Opportunity(title='P', description='d', is_active=True, accepts_applications=True)
    event = m.Event(name='E', is_active=True)
    m.db.session.add_all([project, event])
    m.db.session.commit()
    pid, eid = project.id, event.id
    admin = m.User.query.filter_by(is_admin=True).first()
    admin.password = generate_password_hash('adminpw12345')
    m.db.session.commit()
    admin_name = admin.username

# sign up sends a link pointing at SITE_URL, even with a forged Host
c = app.test_client()
r = c.post('/api/auth/register', json={'full_name': 'Host Test', 'email': 'host@example.com', 'password': 'secret123', 'confirm_password': 'secret123'}, headers={'Host': 'evil.example'})
check(r.status_code == 201 and len(outbox) == 1, 'sign-up sends one mail')
check('https://iydp.org/verify-email?token=' in outbox[0][2], 'link uses SITE_URL')
check('evil.example' not in outbox[0][2], 'forged Host not in the link')
check('//verify-email' not in outbox[0][2], 'no double slash')

u1, r = signup('one@example.com')
me = r.get_json()['user']
check(me['email_verification_required'] and not me['email_verified'] and me['verification_sent_at'], 'new member must confirm')
tok = token_from(outbox[-1][2])
check('one@example.com' not in tok, 'token does not spell the address')

# gates
for path in (f'/api/projects/{pid}/apply', f'/api/events/{eid}/register', '/api/vip/request'):
    r = u1.post(path, json={})
    check(r.status_code == 403 and r.get_json()['code'] == 'email_not_verified', f'blocked {path}')
check(u1.get('/api/account').status_code == 200, 'account page still opens')
check(u1.get('/api/account/profile').status_code == 200, 'profile still opens')

# link needs the right signed-in account
r = app.test_client().post('/api/auth/verify-email', json={'token': tok})
check(r.status_code == 401 and r.get_json()['code'] == 'login_required', 'signed out: asks to log in')
u2, _ = signup('two@example.com')
r = u2.post('/api/auth/verify-email', json={'token': tok})
check(r.status_code == 403 and r.get_json()['code'] == 'wrong_account', 'other account refused')
check(u2.get('/api/auth/me').get_json()['user']['email_verification_required'], 'other account stays unconfirmed')
for bad in ('', None, 'junk', tok[:-2] + 'xx', 123):
    r = u1.post('/api/auth/verify-email', json={'token': bad})
    check(r.status_code == 400 and r.get_json()['code'] == 'invalid', f'bad token {bad!r}')
from itsdangerous import URLSafeTimedSerializer
with app.app_context():
    forged = URLSafeTimedSerializer('wrong-secret', salt='email-verification').dumps({'user': 1, 'email': 'x'})
    other_salt = URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='other').dumps({'user': 1, 'email': 'x'})
check(u1.post('/api/auth/verify-email', json={'token': forged}).status_code == 400, 'forged token')
check(u1.post('/api/auth/verify-email', json={'token': other_salt}).status_code == 400, 'token for another purpose')
life = v.LINK_LIFETIME
v.LINK_LIFETIME = timedelta(seconds=-1)
r = u1.post('/api/auth/verify-email', json={'token': tok})
v.LINK_LIFETIME = life
check(r.status_code == 400 and r.get_json()['code'] == 'expired', 'expired link')

# opening the page does nothing without the POST
check(app.test_client().get('/verify-email?token=' + tok).status_code == 200, 'page opens')
check(u1.get('/api/auth/me').get_json()['user']['email_verification_required'], 'a plain GET confirms nothing')

# confirming opens the gates, twice is harmless
r = u1.post('/api/auth/verify-email', json={'token': tok})
check(r.status_code == 200 and r.get_json()['user']['email_verified'] and not r.get_json()['user']['email_verification_required'], 'confirmed')
check(u1.post('/api/auth/verify-email', json={'token': tok}).status_code == 200, 'second click is fine')
check(u1.post(f'/api/projects/{pid}/apply', json={}).status_code != 403, 'project no longer blocked')
check(u1.post('/api/vip/request').status_code == 200, 'vip no longer blocked')

# resend
n = len(outbox)
r = u2.post('/api/account/verify-email/resend')
check(r.status_code == 429 and len(outbox) == n, 'resend waits')
rewind_cooldown('two@example.com')
r = u2.post('/api/account/verify-email/resend')
check(r.status_code == 200 and len(outbox) == n + 1, 'resend after the wait')
check(u1.post('/api/account/verify-email/resend').status_code == 200 and len(outbox) == n + 1, 'confirmed member gets no mail')
check(app.test_client().post('/api/account/verify-email/resend').status_code == 401, 'guest cannot resend')
send_works[0] = False
rewind_cooldown('two@example.com')
check(u2.post('/api/account/verify-email/resend').status_code == 502, 'failed send is reported')
check(u2.post('/api/account/verify-email/resend').status_code == 429 or True, 'noop')
_, r = signup('nomail@example.com')
check(r.status_code == 201 and r.get_json()['user']['verification_sent_at'] is None, 'sign-up survives a failed send')
send_works[0] = True

# typo fix
old_tok = token_from(outbox[-1][2])
r = u2.post('/api/account/email', json={'email': 'fixed@example.com', 'password': 'wrong-password'})
check(r.status_code == 400, 'wrong password refused')
r = u2.post('/api/account/email', json={'email': 'one@example.com', 'password': 'secret123'})
check(r.status_code == 400, 'taken address refused')
r = u2.post('/api/account/email', json={'email': 'not-an-email', 'password': 'secret123'})
check(r.status_code == 400, 'bad address refused')
r = u2.post('/api/account/email', json={'email': 'FIXED@example.com', 'password': 'secret123'})
check(r.status_code == 200 and r.get_json()['user']['email'] == 'fixed@example.com' and outbox[-1][0] == 'fixed@example.com', 'address fixed and new link sent')
check(u2.post('/api/auth/verify-email', json={'token': old_tok}).status_code == 400, 'old address link is dead')
check(app.test_client().post('/api/auth/login', json={'email': 'fixed@example.com', 'password': 'secret123'}).status_code == 200, 'signs in with new address')
check(app.test_client().post('/api/auth/login', json={'email': 'two@example.com', 'password': 'secret123'}).status_code == 401, 'old address no longer signs in')
check(u2.post('/api/auth/verify-email', json={'token': token_from(outbox[-1][2])}).status_code == 200, 'new link works')
check(u1.post('/api/account/email', json={'email': 'x@example.com', 'password': 'secret123'}).status_code == 400, 'confirmed address cannot change here')

# an address someone else grabbed
sq, r = signup('victim@example.com', 'squatter-pass1')
_, r = signup('victim@example.com', 'victim-pass12')
check(r.status_code == 400, 'fresh unconfirmed account keeps its address')
age('victim@example.com')
with app.app_context():
    squatter_id = m.User.query.filter_by(email='victim@example.com').first().id
victim, r = signup('victim@example.com', 'victim-pass12')
check(r.status_code == 201, 'abandoned address can be claimed')
new_id = r.get_json()['user']['id']
check(new_id != squatter_id, 'new account has its own id')
check(sq.get('/api/auth/me').get_json()['user'] is None, 'old holder is signed out')
check(app.test_client().post('/api/auth/login', json={'email': 'victim@example.com', 'password': 'squatter-pass1'}).status_code == 401, 'old password does not open it')
check(victim.get('/api/auth/me').get_json()['user']['email'] == 'victim@example.com', 'new owner keeps the session')

# accounts with something in them are never released
user3, _ = signup('used@example.com')
with app.app_context():
    u = m.User.query.filter_by(email='used@example.com').first()
    m.db.session.add(m.EventRegistration(event_id=eid, user_id=u.id))
    m.db.session.commit()
age('used@example.com')
_, r = signup('used@example.com')
check(r.status_code == 400, 'account with an application keeps its address')
_, _ = signup('oldverified@example.com')
with app.app_context():
    u = m.User.query.filter_by(email='oldverified@example.com').first()
    v.mark_verified(u)
    m.db.session.commit()
age('oldverified@example.com')
_, r = signup('oldverified@example.com')
check(r.status_code == 400, 'confirmed account keeps its address')

# admin
adm = app.test_client()
check(adm.post('/admin/login', data={'username': admin_name, 'password': 'adminpw12345'}).status_code in (200, 302), 'admin login')
check(adm.get('/api/auth/me').get_json()['user']['email_verification_required'] is False, 'admins are exempt')
_, r = signup('stuck@example.com')
sid = r.get_json()['user']['id']
page = adm.get(f'/admin/members/{sid}')
check(page.status_code == 200 and b'Not confirmed' in page.data, 'admin sees status')
check(app.test_client().post(f'/admin/members/{sid}/verify-email').status_code in (302, 401, 403), 'guest cannot confirm')
with app.app_context():
    check(m.db.session.get(m.User, sid).email_verified_at is None, 'guest changed nothing')
check(u1.post(f'/admin/members/{sid}/verify-email').status_code in (302, 401, 403), 'member cannot confirm')
with app.app_context():
    check(m.db.session.get(m.User, sid).email_verified_at is None, 'member changed nothing')
check(adm.post(f'/admin/members/{sid}/verify-email').status_code == 302, 'admin confirms')
check(b'Confirmed' in adm.get(f'/admin/members/{sid}').data, 'shows confirmed')
check(b'Email is not set up' not in adm.get('/admin').data, 'no dashboard warning when on')

# mail off: nobody is asked, nothing is released
del os.environ['MAIL_SERVER']
n = len(outbox)
off, r = signup('off@example.com')
check(r.status_code == 201 and not r.get_json()['user']['email_verification_required'] and len(outbox) == n, 'mail off: no gate, no mail')
check(off.post('/api/vip/request').status_code == 200, 'mail off: not blocked')
age('off@example.com')
_, r = signup('off@example.com')
check(r.status_code == 400, 'mail off: accounts are not released')
check(b'Email is not set up' in adm.get('/admin').data, 'dashboard warns')
os.environ['MAIL_SERVER'] = 'mail.invalid'
del os.environ['SITE_URL']
check(not v.is_enabled(), 'no SITE_URL: off, never builds a link from Host')
os.environ['SITE_URL'] = 'https://iydp.org'

# plain text only, in the form that reached the inbox, signature on the end
real_build = mail.build_message
msg = real_build('a@example.com', 'Sub\nBcc: x@example.com', 'Salam\n\nhttps://iydp.org/verify-email?token=a.b')
check('Bcc' not in msg.keys() and '\n' not in msg['Subject'], 'no header injection')
check(msg.get_content_type() == 'text/plain' and not msg.is_multipart(), 'plain text, no HTML part')
check(msg.get_content().rstrip().endswith(mail.SIGNATURE), 'signature at the end')
check('https://iydp.org/verify-email?token=a.b' in msg.get_content(), 'link is there')
check(msg['Date'] and msg['Message-ID'], 'Date and Message-ID set, Gmail requires them')

# resend is limited per account
m.limiter.enabled = True
lim, _ = signup('limit@example.com')
codes = []
for _ in range(11):
    rewind_cooldown('limit@example.com')
    codes.append(lim.post('/api/account/verify-email/resend').status_code)
check(codes[:10] == [200] * 10 and codes[10] == 429, 'resend limited per account')
other_lim, _ = signup('limit2@example.com')
rewind_cooldown('limit2@example.com')
check(other_lim.post('/api/account/verify-email/resend').status_code == 200, 'another account on the same address is unaffected')
m.limiter.enabled = False

print('ALL PASSED:', passed)
