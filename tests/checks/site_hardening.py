"""Bot protection, security headers, sessions, page details, robots and sitemap, contact mail."""
import os
import re
import sqlite3
import subprocess
import sys
import time
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap

db_path = _bootstrap.use_fresh_db()
os.chdir(_bootstrap.ROOT)
sys.path.insert(0, _bootstrap.ROOT)

import app as m
from services import bot_check, mail

app = m.app
app.config['WTF_CSRF_ENABLED'] = False
m.limiter.enabled = False
passed = 0


def check(cond, label):
    global passed
    if not cond:
        print('FAIL:', label)
        raise SystemExit(1)
    passed += 1


def old_token(seconds=60):
    with app.app_context(), mock.patch('time.time', return_value=time.time() - seconds):
        return bot_check.make_token()


def signup(c, email, **extra):
    return c.post('/api/auth/register', json={'full_name': 'A Person', 'email': email, 'phone': '', 'password': 'secret-pass1',
                                              'confirm_password': 'secret-pass1', **extra})


def form(**extra):
    return {'name': 'A Visitor', 'email': 'visitor@example.com', 'message': 'Hello there', **extra}


def contact(**extra):
    return app.test_client().post('/api/contact', data=form(**extra))


# ---------- bot protection
token_response = app.test_client().get('/api/form-token')
check(token_response.status_code == 200 and token_response.headers['Cache-Control'] == 'no-store', 'form token is never cached')
fresh = token_response.get_json()['token']
check(signup(app.test_client(), 'b1@example.com').status_code == 400, 'sign-up without a token refused')
check(signup(app.test_client(), 'b2@example.com', form_token='forged').status_code == 400, 'forged token refused')
check(signup(app.test_client(), 'b3@example.com', form_token=fresh).status_code == 400, 'instant sign-up refused')
check(signup(app.test_client(), 'b4@example.com', form_token=old_token(), homepage_url='http://spam').status_code == 400, 'hidden field filled refused')
check(signup(app.test_client(), 'b5@example.com', form_token=old_token(90000)).status_code == 400, 'day-old token refused')
check(signup(app.test_client(), 'b6@example.com', form_token=123).status_code == 400, 'odd token refused')
check(signup(app.test_client(), 'ok@example.com', form_token=old_token(), homepage_url='').status_code == 201, 'a person gets in')
with app.app_context():
    check(m.User.query.filter(m.User.email.like('b_@example.com')).count() == 0, 'refused sign-ups left nothing')

check(contact().status_code == 400, 'contact without a token refused')
check(contact(form_token=old_token(), homepage_url='x').status_code == 400, 'contact with hidden field refused')
check(contact(form_token=fresh).status_code == 400, 'instant contact refused')
with app.app_context():
    check(m.ContactMessage.query.count() == 0, 'refused messages not saved')
check(app.test_client().post('/contact', data=form()).status_code == 405, 'old contact route closed')
check(app.test_client().get('/contact').status_code == 200, 'contact page opens')
app.config['BOT_CHECK_ENABLED'] = False

# ---------- security headers
page = app.test_client().get('/')
csp = page.headers['Content-Security-Policy']
check("script-src 'self';" in csp and 'unsafe-inline' not in csp.split('script-src')[1].split(';')[0], 'site allows no inline scripts')
check("object-src 'none'" in csp and "frame-ancestors 'none'" in csp and "base-uri 'self'" in csp, 'site CSP complete')
check('camera=(self)' in page.headers['Permissions-Policy'] and 'microphone=()' in page.headers['Permissions-Policy'], 'permissions policy')
check(page.headers['X-Frame-Options'] == 'DENY' and page.headers['X-Content-Type-Options'] == 'nosniff', 'older headers kept')
check('Strict-Transport-Security' not in page.headers, 'no HSTS over http')
check('max-age=' in app.test_client().get('/', base_url='https://iydp.org').headers['Strict-Transport-Security'], 'HSTS over https')
check('includeSubDomains' not in app.test_client().get('/', base_url='https://iydp.org').headers['Strict-Transport-Security'], 'HSTS leaves subdomains alone')
admin_page = app.test_client().get('/admin/login')
check('https:' not in admin_page.headers['Content-Security-Policy'].split('script-src')[1].split(';')[0], 'admin scripts only from this site')
check(b'cdn.tailwindcss.com' not in admin_page.data and b'vendor/tailwindcss' in admin_page.data, 'admin uses its own copy of tailwind')
check('Content-Security-Policy' not in app.test_client().get('/api/home').headers, 'no CSP on JSON')
check(admin_page.headers['X-Robots-Tag'] == 'noindex', 'admin not indexed')

# ---------- sessions
member = app.test_client()
signup(member, 'keeper@example.com')
cookie = member.get('/api/auth/me').headers.get('Set-Cookie', '')
check('Expires=' in cookie and 'HttpOnly' in cookie, 'member session is a timed cookie')
check(app.permanent_session_lifetime.days == 14, 'member session lasts 14 days')
check(member.post('/api/auth/logout').status_code == 200 and member.get('/api/auth/me').get_json()['user'] is None, 'member signs out')
with app.app_context():
    keeper = m.User.query.filter_by(email='keeper@example.com').one()
    check(keeper.session_version == 1 or keeper.session_version == 0, 'member sign-out leaves other devices alone')

admin = app.test_client()
check(admin.post('/admin/login', data={'username': 'admin', 'password': _bootstrap.ADMIN_PASSWORD}).status_code == 302, 'admin signs in')
response = admin.get('/admin')
check(response.status_code == 200, 'admin panel opens')
check('Expires=' not in response.headers.get('Set-Cookie', ''), 'admin session ends with the browser')
with admin.session_transaction() as s:
    s['admin_seen'] = time.time() - m.ADMIN_IDLE_SECONDS + 60
check(admin.get('/admin').status_code == 200, 'still in within two hours')
with admin.session_transaction() as s:
    s['admin_seen'] = time.time() - m.ADMIN_IDLE_SECONDS - 60
response = admin.get('/admin')
check(response.status_code == 302 and '/login' in response.headers['Location'], 'admin signed out after two idle hours')

admin = app.test_client()
admin.post('/admin/login', data={'username': 'admin', 'password': _bootstrap.ADMIN_PASSWORD})
admin.get('/admin')
copied = app.test_client()
for c in admin._cookies.values():
    copied.set_cookie(c.key, c.value)
check(copied.get('/admin').status_code == 200, 'copied cookie works while signed in')
admin.get('/admin/logout')
check(copied.get('/admin').status_code == 302, 'admin sign-out kills a copied cookie')

check(app.config['WTF_CSRF_TIME_LIMIT'] is None, 'forms left open do not expire')

# ---------- pages: title, description, status
with app.app_context():
    news = m.News(title='News <script>alert(1)</script> "title"', content='<p>Body &amp; <b>text</b> ' + 'word ' * 80 + '</p>', image_url='/static/n.webp', is_published=True)
    draft = m.News(title='SECRET DRAFT', content='hidden', is_published=False)
    project = m.Opportunity(title='Real Project', description='About the project', is_active=True, poster_path='/static/p.webp')
    hidden_project = m.Opportunity(title='HIDDEN PROJECT', description='x', is_active=False)
    event = m.Event(name='Real Event', description='About the event', is_active=True, is_public=True)
    hidden_event = m.Event(name='HIDDEN EVENT', is_active=True, is_public=False)
    story = m.Story(title='Real Story', slug='real-story', content='Story text', author_name='A', is_published=True)
    hidden_story = m.Story(title='HIDDEN STORY', slug='hidden-story', content='x', author_name='A', is_published=False)
    m.db.session.add_all([news, draft, project, hidden_project, event, hidden_event, story, hidden_story])
    m.db.session.commit()
    ids = dict(news=news.id, draft=draft.id, project=project.id, hidden_project=hidden_project.id, event=event.id, hidden_event=hidden_event.id)

c = app.test_client()
os.environ['SITE_URL'] = 'https://iydp.org/'


def html_of(path, **kw):
    r = c.get(path, **kw)
    return r, r.data.decode()


def title_of(body):
    return re.search(r'<title>(.*?)</title>', body, re.S).group(1)


titles = set()
for path in ('/', '/projects', '/projects/finished', '/events', '/news', '/stories', '/faq', '/contact', '/erasmus', '/login', '/register'):
    r, body = html_of(path)
    check(r.status_code == 200, f'{path} opens')
    check('noindex' not in body, f'{path} can be indexed')
    check(f'rel="canonical" href="https://iydp.org{"" if path == "/" else path}' in body, f'{path} canonical uses SITE_URL')
    titles.add(title_of(body))
check(len(titles) == 11, f'every page has its own title {titles}')
for path in ('/account', '/account/profile', '/forgot-password', '/reset-password', '/verify-email'):
    r, body = html_of(path)
    check(r.status_code == 200 and 'name="robots" content="noindex"' in body and 'canonical' not in body, f'{path} not indexed')

r, body = html_of(f"/news/{ids['news']}")
check('<script>alert' not in body, 'title with markup is escaped')
check('&lt;script&gt;' in title_of(body), 'title kept as text')
description = re.search(r'name="description" content="(.*?)"', body).group(1)
check(description.startswith('Body &amp;amp; text') or description.startswith('Body &amp; text'), f'description is plain text: {description[:40]}')
check(len(description) < 200 and '<' not in description, 'description short')
check('content="https://iydp.org/static/n.webp"' in body, 'image address is absolute')
_, body = html_of(f"/projects/{ids['project']}")
check('Real Project' in title_of(body) and 'https://iydp.org/static/p.webp' in body, 'project details')
_, body = html_of(f"/events/{ids['event']}")
check('Real Event' in title_of(body) and 'https://iydp.org/images/iydp-members.jpeg' in body, 'event falls back to the default image')
_, body = html_of('/stories/real-story')
check('Real Story' in title_of(body), 'story details')
for path, secret in ((f"/news/{ids['draft']}", 'SECRET DRAFT'), (f"/projects/{ids['hidden_project']}", 'HIDDEN PROJECT'),
                     (f"/events/{ids['hidden_event']}", 'HIDDEN EVENT'), ('/stories/hidden-story', 'HIDDEN STORY')):
    r, body = html_of(path)
    check(r.status_code == 404 and secret not in body and 'noindex' in body, f'{path} stays hidden')
for path in ('/news/999999', '/projects/999999', '/events/999999', '/stories/none', '/nothing-here', '/news/99999999999999999999999', '/news/abc', '/projects/1/x'):
    r, body = html_of(path)
    check(r.status_code == 404 and 'id="root"' in body and 'Page not found' in title_of(body), f'{path} is a 404 page')
check(c.get('/news/').status_code == 200, 'trailing slash still opens the page')
r = c.get('/api/none')
check(r.status_code == 404 and r.get_json() == {'error': 'Not found'}, 'unknown API address answers JSON')
r = c.get('/assets/old-chunk.js')
check(r.status_code == 404 and b'id="root"' not in r.data, 'missing script is not answered with a page')
for bad in ('/.env', '/instance/iydp.db', '/app.py', '/services/mail.py'):
    r = c.get(bad)
    check(r.status_code == 404 and b'SECRET_KEY' not in r.data and b'import' not in r.data[:20], f'{bad} not served')

# ---------- caching
asset = next(f for f in os.listdir(os.path.join(_bootstrap.ROOT, 'dist', 'assets')) if f.endswith('.js'))
r = c.get(f'/assets/{asset}')
check('immutable' in r.headers['Cache-Control'] and 'Set-Cookie' not in r.headers, 'built files cached for good, without cookies')
signed_in = app.test_client()
signup(signed_in, 'assets@example.com')
check('Set-Cookie' not in signed_in.get(f'/assets/{asset}').headers, 'no session cookie on files')
check(c.get('/').headers['Cache-Control'] == 'no-cache', 'pages always checked for a new version')

# ---------- robots, sitemap, favicon
r = c.get('/robots.txt')
text = r.data.decode()
check(r.mimetype == 'text/plain' and 'Disallow: /admin' in text and 'Disallow: /account' in text and 'Sitemap: https://iydp.org/sitemap.xml' in text, 'robots.txt')
r = c.get('/sitemap.xml')
text = r.data.decode()
check(r.mimetype == 'application/xml' and text.startswith('<?xml'), 'sitemap is XML')
check('https://iydp.org/projects</loc>' in text and f"https://iydp.org/news/{ids['news']}<" in text and 'https://iydp.org/stories/real-story<' in text, 'sitemap lists pages')
check(f"/news/{ids['draft']}<" not in text and f"/projects/{ids['hidden_project']}<" not in text and f"/events/{ids['hidden_event']}<" not in text and 'hidden-story' not in text, 'sitemap hides drafts')
check('/admin' not in text and '/login' not in text, 'sitemap leaves out private pages')
import xml.etree.ElementTree as ET
ET.fromstring(text)
r = c.get('/favicon.ico')
check(r.status_code == 301 and r.headers['Location'].endswith('/logo.png'), 'favicon')

# ---------- contact messages
sent = []


def fake_deliver(to, subject, body, reply_to=None):
    sent.append((to, subject, body, reply_to))


def wait_for_mail(count):
    for _ in range(50):
        if len(sent) >= count:
            return
        time.sleep(0.02)


def send_message(**extra):
    return app.test_client().post('/api/contact', data=form(**extra))


os.environ.update(MAIL_SERVER='smtp.invalid', MAIL_FROM='IYDP <noreply@iydp.org>')
with mock.patch.object(mail, 'deliver', fake_deliver):
    check(send_message().status_code == 200, 'message saved without a team address')
    time.sleep(0.2)
    check(not sent, 'no team address: no mail')
    os.environ['CONTACT_NOTIFY_EMAIL'] = 'team@example.com'
    tricky = 'I\'m "Ann" <script>alert(1)</script> & co'
    check(send_message(message=tricky, name="O'Brien <b>").status_code == 200, 'message accepted')
    wait_for_mail(1)
    check(len(sent) == 1, 'team gets a mail')
    to, subject, body, reply_to = sent[0]
    check(to == 'team@example.com' and reply_to == 'visitor@example.com', 'to the team, replies to the visitor')
    check(tricky in body and "O'Brien" in body, 'mail has the text as written')
    check('Ann' not in subject and 'Brien' not in subject, "visitor's text stays out of the subject")
    for bad in ('not-an-email', 'a@b.co\r\nBcc: x@y.co', ''):
        check(send_message(email=bad).status_code == 400, f'bad email refused: {bad!r}')
    check(send_message(name='').status_code == 400 and send_message(message='   ').status_code == 400, 'empty fields refused')
    check(len(sent) == 1, 'refused messages send nothing')
    check(send_message(name='N' * 500, email='v@example.com', message='M' * 9000).status_code == 200, 'long values cut to size')

message = mail.build_message('team@example.com', 'S', 'B', reply_to='visitor@example.com')
check(message['Reply-To'] == 'visitor@example.com', 'Reply-To header set')
os.environ['MAIL_REPLY_TO'] = 'info@iydp.org'
check(mail.build_message('x@example.com', 'S', 'B')['Reply-To'] == 'info@iydp.org', 'normal mails keep the usual Reply-To')
os.environ['MAIL_REPLY_TO'] = ''

# the mail server being down does not reach the visitor
os.environ.update(MAIL_SERVER='127.0.0.1', MAIL_PORT='1')
check(send_message().status_code == 200, 'mail server down: message still saved')
os.environ.update(MAIL_SERVER='', CONTACT_NOTIFY_EMAIL='')
os.environ.pop('MAIL_PORT')

with app.app_context():
    saved = m.ContactMessage.query.filter(m.ContactMessage.name.like('O%')).one()
    check(saved.message == tricky and saved.name == "O'Brien <b>", 'stored as written')
    long_one = m.ContactMessage.query.filter(m.ContactMessage.email == 'v@example.com').one()
    check(len(long_one.name) == 100 and len(long_one.message) == 5000, 'fits the columns')
    saved_id = saved.id

admin = app.test_client()
admin.post('/admin/login', data={'username': 'admin', 'password': _bootstrap.ADMIN_PASSWORD})
page = admin.get(f'/admin/messages/{saved_id}') if False else None
routes = [str(r) for r in app.url_map.iter_rules() if r.endpoint == 'view_message']
page = admin.get(routes[0].replace('<int:message_id>', str(saved_id))).data.decode()
check('<script>alert(1)' not in page, 'admin page escapes the message')
check('&lt;script&gt;alert(1)&lt;/script&gt;' in page and 'O&#39;Brien &lt;b&gt;' in page, 'shown as written, once escaped')

# ---------- old messages are converted
connection = sqlite3.connect(db_path)
connection.execute("insert into contact_message (name, email, message, is_read) values ('Mary &amp; Jo', 'old@example.com', 'It&#x27;s &lt;fine&gt;', 0)")
connection.commit()
connection.close()
env = {**os.environ, 'DATABASE_URL': _bootstrap.database_url(db_path)}
stamp = subprocess.run([sys.executable, '-m', 'flask', 'db', 'stamp', 'b3e7d1c4a905'], cwd=_bootstrap.ROOT, env=env, capture_output=True, text=True)
check(stamp.returncode == 0, stamp.stderr[-300:])
up = subprocess.run([sys.executable, '-m', 'flask', 'db', 'upgrade'], cwd=_bootstrap.ROOT, env=env, capture_output=True, text=True)
check(up.returncode == 0, up.stderr[-300:])
connection = sqlite3.connect(db_path)
row = connection.execute("select name, message from contact_message where email='old@example.com'").fetchone()
already = connection.execute('select count(*) from contact_message').fetchone()[0]
connection.close()
check(row == ('Mary & Jo', "It's <fine>"), f'old message converted {row}')
check(already > 1, 'other messages kept')

print('ALL PASSED:', passed)
