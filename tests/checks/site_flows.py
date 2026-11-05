"""End-to-end check on a throwaway copy: nothing touches the real DB or static folder."""
import io, os, shutil, sys, tempfile
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap
proj = _bootstrap.ROOT
tmp = tempfile.mkdtemp()
_bootstrap.copy_fresh_db(os.path.join(tmp, 't.db'))
os.environ.update(DATABASE_URL='sqlite:///' + os.path.join(tmp, 't.db').replace('\\', '/'),
                  SESSION_COOKIE_SECURE='0', SECRET_KEY='x', FLASK_DEBUG='0')
os.environ.pop('ADMIN_PASSWORD', None)
sys.path.insert(0, proj)
os.chdir(proj)
from PIL import Image
import app as m
from werkzeug.security import generate_password_hash

app = m.app
app.config['WTF_CSRF_ENABLED'] = False
app.config['BOT_CHECK_ENABLED'] = False
m.limiter.enabled = False
app.static_folder = os.path.join(tmp, 'static')
os.makedirs(app.static_folder)

passed = 0
def check(cond, label):
    global passed
    if not cond:
        print('FAIL:', label)
        raise SystemExit(1)
    passed += 1

def img(name='a.jpg', size=(1200, 1500)):
    b = io.BytesIO(); Image.new('RGB', size, (20, 90, 160)).save(b, 'JPEG'); b.seek(0)
    return (b, name)

with app.app_context():
    admin = m.User.query.filter_by(is_admin=True).first()
    admin.password = generate_password_hash('adminpw12345')
    m.db.session.commit()
    admin_name = admin.username
    m.db.session.add_all([
        m.News(title='Seed news', content='Text', is_published=True),
        m.Story(title='Seed story', slug='seed-story', content='Text', author_name='A Person', is_published=True),
        m.ContactMessage(name='Visitor', email='visitor@example.com', message='Hello'),
    ])
    m.db.session.commit()

ad = app.test_client()
r = ad.post('/admin/login?next=//evil.example/x', data={'username': admin_name, 'password': 'adminpw12345'})
check(r.status_code == 302 and 'evil' not in r.headers['Location'], 'open redirect blocked')
anon_admin = app.test_client()
r = anon_admin.post('/admin/login?next=/\\evil.example', data={'username': admin_name, 'password': 'adminpw12345'})
check('evil' not in r.headers['Location'], 'backslash redirect blocked')
check(app.test_client().get('/admin/projects').status_code == 302, 'admin pages need login')

# ---------- projects ----------
today = date.today()
r = ad.post('/admin/projects/add', data={'title': '', 'description': ''}, content_type='multipart/form-data')
check(r.status_code == 200 and b'Title is required' in r.data, 'project validation')
r = ad.post('/admin/projects/add', data={'title': 'Bad', 'description': 'd', 'start_date': '2030-02-02', 'end_date': '2030-01-01'}, content_type='multipart/form-data')
check(b'cannot be before' in r.data and b'value="Bad"' in r.data, 'end before start keeps form')

def add_project(title, **kw):
    data = {'title': title, 'description': 'About.\n\nMore.', 'location': 'Lisbon', 'tags': 'Erasmus+, Youth', 'is_active': 'on', 'accepts_applications': 'on', **kw}
    r = ad.post('/admin/projects/add', data=data, content_type='multipart/form-data')
    check(r.status_code == 302, f'create {title}')
    with app.app_context():
        return m.Opportunity.query.filter_by(title=title).first().id

future = (today + timedelta(days=30)).isoformat()
past = (today - timedelta(days=30)).isoformat()
open_id = add_project('Open project', deadline=future, start_date=future, end_date=(today + timedelta(days=40)).isoformat(),
                      poster=img('p.jpg'), photos=[img('1.jpg'), img('2.png'), (io.BytesIO(b'nope'), 'x.jpg')])
closed_id = add_project('Deadline passed', deadline=past, end_date=future)
finished_id = add_project('Ended project', end_date=past)
manual_id = add_project('Manual finished', status_mode='finished')
kept_id = add_project('Forced present', end_date=past, status_mode='present')
hidden_id = add_project('Hidden project')
ad.post(f'/admin/projects/edit/{hidden_id}', data={'title': 'Hidden project', 'description': 'd'}, content_type='multipart/form-data')

pub = app.test_client()
present = {p['title'] for p in pub.get('/api/projects?phase=present&page=1').get_json()['items']}
all_present, pg = set(), 1
while True:
    j = pub.get(f'/api/projects?phase=present&page={pg}').get_json()
    all_present |= {p['title'] for p in j['items']}
    if not j['has_next']:
        break
    pg += 1
finished = {p['title'] for p in pub.get('/api/projects?phase=finished').get_json()['items']}
check({'Open project', 'Deadline passed', 'Forced present'} <= all_present, 'present section')
check({'Ended project', 'Manual finished'} <= finished, 'finished section')
check('Hidden project' not in all_present | finished, 'hidden stays hidden')
check(not ({'Ended project', 'Manual finished'} & all_present), 'finished not in present')
check(pub.get(f'/api/projects/{hidden_id}').status_code == 404, 'hidden 404')
check(len(pub.get('/api/projects?phase=present&search=Lisbon').get_json()['items']) >= 1, 'search')
d = pub.get(f'/api/projects/{open_id}').get_json()
check(d['applications_open'] and d['poster'] and len(d['photos']) == 2, 'detail has poster and photos')
check(pub.get(f'/api/projects/{closed_id}').get_json()['applications_open'] is False, 'deadline closes applications')
check(pub.get('/opportunities').headers['Location'].endswith('/projects'), 'old url redirects')

# edit: reorder, remove photo, replace poster, keep tags
with app.app_context():
    ids = [p.id for p in m.db.session.get(m.Opportunity, open_id).photos]
    old_poster = m.db.session.get(m.Opportunity, open_id).poster_path
r = ad.post(f'/admin/projects/edit/{open_id}', data={
    'title': 'Open project', 'description': 'About.', 'is_active': 'on', 'accepts_applications': 'on', 'deadline': future, 'tags': 'Youth',
    'photo_order': f'{ids[1]},{ids[0]}', 'remove_photos': [str(ids[0])], 'poster': img('p2.jpg'), 'photos': [img('3.jpg')],
}, content_type='multipart/form-data')
check(r.status_code == 302, 'edit project')
with app.app_context():
    o = m.db.session.get(m.Opportunity, open_id)
    check([p.id for p in o.photos][0] == ids[1] and len(o.photos) == 2, 'photos reordered and removed')
    check(o.poster_path != old_poster and [t.name for t in o.tags] == ['Youth'], 'poster replaced, tags synced')
    check(o.deadline.date().isoformat() == future, 'deadline saved')
check(not os.path.exists(os.path.join(app.static_folder, old_poster.split('/static/')[1])), 'old poster removed from disk')

# ---------- accounts and cards ----------
def signup(email, name='Test User'):
    c = app.test_client()
    r = c.post('/api/auth/register', json={'full_name': name, 'email': email, 'phone': '+994501112233', 'password': 'secret12', 'confirm_password': 'secret12'})
    check(r.status_code == 201, f'signup {email}')
    return c, r.get_json()['user']

u1, d1 = signup('a@example.com', 'Aysel M')
check(d1['card_type'] == 'standard' and d1['membership_no'], 'new user has standard card and number')
r = u1.get('/api/account/qr.svg')
check(r.status_code == 200 and b'svg' in r.data, 'standard user gets a QR')
check(app.test_client().get('/api/account/qr.svg').status_code == 401, 'QR needs login')

# ---------- applications ----------
good = {'full_name': 'Aysel M', 'email': 'a@example.com', 'phone': '+994501112233', 'birth_date': '2001-05-05', 'residence': 'Baku, Azerbaijan',
        'english_level': 'Advanced', 'motivation': 'I want to join because of the topic and the people.' * 2, 'cv_link': 'https://example.com/cv'}
check(app.test_client().post(f'/api/projects/{open_id}/apply', json=good).status_code == 401, 'apply needs login')
for bad, why in [({'motivation': 'short'}, 'motivation'), ({'cv_link': 'javascript:alert(1)'}, 'cv scheme'), ({'email': 'x'}, 'email'),
                 ({'english_level': 'Klingon'}, 'level'), ({'birth_date': '2999-01-01'}, 'birth date')]:
    check(u1.post(f'/api/projects/{open_id}/apply', json={**good, **bad}).status_code == 400, f'rejects bad {why}')
check(u1.post(f'/api/projects/{closed_id}/apply', json=good).status_code == 400, 'closed project rejects')
check(u1.post(f'/api/projects/{finished_id}/apply', json=good).status_code == 400, 'finished project rejects')
r = u1.post(f'/api/projects/{open_id}/apply', json=good)
check(r.status_code == 201, 'apply ok')
check(u1.post(f'/api/projects/{open_id}/apply', json=good).status_code == 409, 'no double apply')
check(u1.get(f'/api/projects/{open_id}').get_json()['my_application']['status'] == 'pending', 'detail shows my application')
check(pub.get(f'/api/projects/{open_id}').get_json()['my_application'] is None, 'others do not see it')
acct = u1.get('/api/account').get_json()
check(acct['applications'][0]['project_id'] == open_id, 'account lists application')

check(b'Open project' in ad.get('/admin/applications?status=pending').data, 'admin list')
with app.app_context():
    app_id = m.Application.query.first().id
r = ad.get(f'/admin/applications/{app_id}')
check(r.status_code == 200 and b'cv' in r.data, 'admin detail')
ad.post(f'/admin/applications/{app_id}', data={'status': 'accepted', 'admin_note': 'ok'})
check(u1.get('/api/account').get_json()['applications'][0]['status'] == 'accepted', 'decision reaches applicant')
acct = u1.get('/api/account').get_json()
check('qəbul olundu' in acct['notifications'][0]['title'] and acct['notifications'][0]['link'] == f'/projects/{open_id}', 'project decision notifies')
ad.post(f'/admin/applications/{app_id}', data={'status': 'accepted', 'admin_note': 'edit only'})
check(len(u1.get('/api/account').get_json()['notifications']) == 1, 'saving a note does not notify again')
check('edit only' not in str(u1.get(f'/api/projects/{open_id}').get_json()), 'team note stays private')
u1.post('/api/account/notifications/read')
check('admin_note' not in str(u1.get(f'/api/projects/{open_id}').get_json()), 'team note stays private')
u2, _ = signup('b@example.com', '=HYPERLINK("http://evil")')
u2.post(f'/api/projects/{open_id}/apply', json={**good, 'full_name': '=HYPERLINK("http://evil")'})
csv_text = ad.get('/admin/applications/export.csv').get_data(as_text=True)
check("'=HYPERLINK" in csv_text, 'csv neutralises formulas')

# ---------- events ----------
when = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%dT%H:%M')
was = (datetime.now() - timedelta(days=10)).strftime('%Y-%m-%dT%H:%M')
r = ad.post('/admin/events/add', data={'name': 'x', 'capacity': '-3'}, content_type='multipart/form-data')
check(r.status_code == 200 and b'positive number' in r.data, 'capacity validation')
def add_event(name, **kw):
    r = ad.post('/admin/events/add', data={'name': name, 'is_public': 'on', 'is_active': 'on', **kw}, content_type='multipart/form-data')
    check(r.status_code == 302, f'create event {name}')
    with app.app_context():
        return m.Event.query.filter_by(name=name).first().id
ev = add_event('Info Day', starts_at=when, capacity='1', poster=img('e.jpg'), location='Baku')
ev_past = add_event('Old Day', starts_at=was)
ev_nolimit = add_event('Open Day', starts_at=when)
ev_hidden = add_event('Secret Day', starts_at=when)
ad.post(f'/admin/events/edit/{ev_hidden}', data={'name': 'Secret Day', 'starts_at': when}, content_type='multipart/form-data')

up = {e['name'] for e in pub.get('/api/events').get_json()['items']}
old = {e['name'] for e in pub.get('/api/events?when=past').get_json()['items']}
check({'Info Day', 'Open Day'} <= up and 'Old Day' in old and 'Old Day' not in up, 'upcoming and past')
check('Secret Day' not in up and pub.get(f'/api/events/{ev_hidden}').status_code == 404, 'hidden event')
check(app.test_client().post(f'/api/events/{ev}/register').status_code == 401, 'guest must sign up')
check(u1.post(f'/api/events/{ev}/register').status_code == 400, 'no form, no applications')
check(pub.get(f'/api/events/{ev}').get_json()['registration_open'] is False, 'no form means closed')

import json as _json
def set_form(event_id, questions):
    return ad.post(f'/admin/events/{event_id}/form', data={'questions_json': _json.dumps(questions)})

def form_of(client, event_id):
    return {q['label']: q for q in client.get(f'/api/events/{event_id}').get_json()['questions']}

Q_ALL = [
    {'label': 'Why?', 'kind': 'long', 'required': True, 'help_text': 'Tell us'},
    {'label': 'City', 'kind': 'short', 'required': False},
    {'label': 'Diet', 'kind': 'single', 'required': True, 'options': ['Any', 'Vegan', 'Any', ' ']},
    {'label': 'Topics', 'kind': 'multiple', 'required': False, 'options': ['A', 'B']},
    {'label': 'Size', 'kind': 'dropdown', 'required': False, 'options': ['S', 'M']},
    {'label': 'Born', 'kind': 'date', 'required': False},
    {'label': 'Age', 'kind': 'number', 'required': False},
]
for bad, why in [('not json', 'bad json'), ('{"a":1}', 'not a list')]:
    check(b'could not be read' in ad.post(f'/admin/events/{ev}/form', data={'questions_json': bad}).data, f'form rejects {why}')
for q, why in [({'label': '', 'kind': 'short'}, 'empty label'), ({'label': 'x', 'kind': 'nope'}, 'bad kind'),
               ({'label': 'x', 'kind': 'single', 'options': ['one']}, 'one option'), ({'label': 'x', 'kind': 'multiple', 'options': []}, 'no options'),
               ({'label': 'x' * 301, 'kind': 'short'}, 'long label')]:
    r = set_form(ev, [q])
    check(r.status_code == 200 and b'Question 1' in r.data, f'form rejects {why}')
check(b'</script><b>' not in set_form(ev, [{'label': '</script><b>', 'kind': 'single', 'options': ['x']}]).data, 'bad form re-render is escaped')
check(set_form(ev, [{'label': 'x'}] * 51).status_code == 200, 'too many questions refused')
check(pub.get(f'/api/events/{ev}').get_json()['questions'] == [], 'rejected forms store nothing')
page = ad.get(f'/admin/events/{ev}/form')
check(page.status_code == 200 and b'question-list' in page.data, 'builder opens')
check(app.test_client().get(f'/admin/events/{ev}/form').status_code == 302, 'builder needs admin')
check(set_form(ev, Q_ALL).status_code == 302, 'form saves')
fq = form_of(pub, ev)
check(list(fq) == [q['label'] for q in Q_ALL] and fq['Diet']['options'] == ['Any', 'Vegan'], 'order kept, options cleaned')
check(pub.get(f'/api/events/{ev}').get_json()['registration_open'] is True, 'form opens applications')
check(pub.get(f'/api/events/{ev}').get_json()['registration'] is None, 'guest has no application')

def ans(**kw):
    out = {str(fq['Why?']['id']): 'Because', str(fq['Diet']['id']): 'Any'}
    out.update({str(fq[k.replace('_', ' ')]['id']): v for k, v in kw.items()})
    return {'answers': out}

base = str(fq['Why?']['id']); diet = str(fq['Diet']['id'])
for body, qid, why in [({}, fq['Why?']['id'], 'missing required'), ({'answers': 'x'}, fq['Why?']['id'], 'answers not a dict'),
                       ({'answers': {base: '   ', diet: 'Any'}}, fq['Why?']['id'], 'blank required'),
                       ({'answers': {base: 'ok', diet: 'Other'}}, fq['Diet']['id'], 'option not offered'),
                       (ans(Topics=['A', 'Z']), fq['Topics']['id'], 'checkbox not offered'), (ans(Size='XL'), fq['Size']['id'], 'dropdown not offered'),
                       (ans(Born='notdate'), fq['Born']['id'], 'bad date'), (ans(Age='abc'), fq['Age']['id'], 'bad number'),
                       (ans(City='x' * 501), fq['City']['id'], 'long short answer')]:
    r = u1.post(f'/api/events/{ev}/register', json=body)
    check(r.status_code == 400 and str(qid) in r.get_json()['errors'], f'answers reject {why}')
check(u1.get(f'/api/events/{ev}').get_json()['registration'] is None, 'rejected answers store nothing')

r = u1.post(f'/api/events/{ev}/register', json=ans(Topics=['B', 'A'], Size='M', Born='2000-01-02', Age='21', City='<b>Baku</b>'))
d = r.get_json()
check(r.status_code == 201 and d['registration']['status'] == 'pending', 'application is pending, not approved')
check(d['spots_left'] == 1, 'pending takes no seat')
values = {a['label']: a['value'] for a in d['registration']['answers']}
check(values['Topics'] == ['A', 'B'] and values['Age'] == '21', 'answers stored')
check(u1.post(f'/api/events/{ev}/register', json={}).status_code == 200, 'double tap keeps the first answers')
check({a['label']: a['value'] for a in u1.get(f'/api/events/{ev}').get_json()['registration']['answers']}['Why?'] == 'Because', 'answers not overwritten')
check(u2.post(f'/api/events/{ev}/register', json=ans()).status_code == 201, 'second person can apply for the last seat')
with app.app_context():
    rid1 = m.EventRegistration.query.filter_by(event_id=ev, status='pending').order_by(m.EventRegistration.id).first().id
    rid2 = m.EventRegistration.query.filter_by(event_id=ev, status='pending').order_by(m.EventRegistration.id.desc()).first().id
check(u1.get('/api/account').get_json()['event_registrations'][0]['status'] == 'pending', 'account shows pending')
check(u1.get('/api/auth/me').get_json()['user']['unread_notifications'] == 0, 'nothing to read yet')

# admin sees and decides
reg_url = f'/admin/events/{ev}/registrations/{rid1}'
check(app.test_client().get(reg_url).status_code == 302 and u1.get(reg_url).status_code == 302, 'decisions need admin')
check(app.test_client().post(reg_url, data={'decision': 'approved'}).status_code == 302, 'guest cannot decide')
check(u1.post(reg_url, data={'decision': 'approved'}).status_code == 302 and u1.get(f'/api/events/{ev}').get_json()['registration']['status'] == 'pending', 'member cannot approve themselves')
check(ad.get(f'/admin/events/{ev_past}/registrations/{rid1}').status_code == 404, 'registration under wrong event')
page = ad.get(reg_url).get_data(as_text=True)
check('Because' in page and 'A, B' in page and '&lt;b&gt;Baku' in page, 'admin sees escaped answers')
listing = ad.get(f'/admin/events/{ev}/attendance?status=pending').get_data(as_text=True)
check('Waiting' in listing and f'registrations/{rid1}' in listing, 'pending list')
check(f'registrations/{rid1}' not in ad.get(f'/admin/events/{ev}/attendance?status=approved').get_data(as_text=True), 'status filter')
check(b'waiting for a decision' in ad.get('/admin').data or b'waiting for a decision' in ad.get('/admin/').data, 'dashboard shows waiting')
check(ad.post(reg_url, data={'decision': 'nope'}).status_code == 400, 'bad decision')

sent = []
import services.mail as _mail
_real_send = _mail.send
r = ad.post(reg_url, data={'decision': 'approved', 'note': 'Bring ID'})
check(r.status_code == 302, 'approve')
d = u1.get(f'/api/events/{ev}').get_json()
check(d['registration']['status'] == 'approved' and d['registration']['note'] == 'Bring ID' and d['spots_left'] == 0, 'approval takes the seat')
check(u1.get('/api/auth/me').get_json()['user']['unread_notifications'] == 1, 'member gets a notification')
acct = u1.get('/api/account').get_json()
check('təsdiqləndi' in acct['notifications'][0]['title'] and 'Bring ID' in acct['notifications'][0]['body'] and acct['notifications'][0]['link'] == f'/events/{ev}', 'notification content')
check(u2.get('/api/account').get_json()['notifications'] == [], 'others get nothing')
with app.app_context():
    check(m.db.session.get(m.EventRegistration, rid1).email_status == 'off', 'no mail settings: no email, no failure')
ad.post(reg_url, data={'decision': 'approved'})
check(u1.get('/api/auth/me').get_json()['user']['unread_notifications'] == 1, 'same decision twice does not notify twice')

# the last seat is gone
reg2_url = f'/admin/events/{ev}/registrations/{rid2}'
r = ad.post(reg2_url, data={'decision': 'approved'}, follow_redirects=True)
check(b'All seats are taken' in r.data and u2.get(f'/api/events/{ev}').get_json()['registration']['status'] == 'pending', 'cannot approve past capacity')
check(u2.get('/api/auth/me').get_json()['user']['unread_notifications'] == 0, 'failed approval tells nobody')
r3, _ = signup('late@example.com', 'Late Person')
check(r3.post(f'/api/events/{ev}/register', json=ans()).status_code == 400, 'full event stops new applications')

# email
os.environ.update(MAIL_SERVER='mail.test', MAIL_FROM='IYDP <noreply@iydp.org>')
m.verification.is_enabled = lambda: False  # this part is about decision mails; codes have their own test
_mail_calls = []
def _fake(to, subject, body, ok=[True]):
    _mail_calls.append((to, subject, body))
    return ok[0]
_mail.send = _fake
check(u2.post(f'/api/events/{ev}/unregister').status_code == 200, 'withdraw while waiting')
check(u2.post(f'/api/events/{ev}/register', json=ans()).status_code == 400, 'still full after withdrawing')
ad.post(reg_url, data={'decision': 'rejected', 'note': 'Sorry'})
to, subject, body = _mail_calls[-1]
check(to == 'a@example.com' and 'qəbul olunmadı' in subject and 'Sorry' in body and 'Unfortunately' in body and f'/events/{ev}' in body, 'rejection email')
d = u1.get(f'/api/events/{ev}').get_json()
check(d['registration']['status'] == 'rejected' and d['spots_left'] == 1 and d['email_notifications'] is True, 'rejection frees the seat')
check(u1.post(f'/api/events/{ev}/unregister').status_code == 400, 'rejected cannot withdraw and re-apply')
check(u1.post(f'/api/events/{ev}/register', json=ans()).status_code == 200 and u1.get(f'/api/events/{ev}').get_json()['registration']['status'] == 'rejected', 'rejected stays rejected')
_fake.__defaults__[0][0] = False
r = ad.post(reg_url, data={'decision': 'approved'}, follow_redirects=True)
check(b'could not be sent' in r.data and u1.get(f'/api/events/{ev}').get_json()['registration']['status'] == 'approved', 'mail failure keeps the decision')
check(b'could not be sent' in ad.get(reg_url).data, 'admin sees the failed email')
_mail.send = _real_send
# a dead mail server must not raise
os.environ.update(MAIL_SERVER='127.0.0.1', MAIL_PORT='1', MAIL_FROM='x@iydp.org')
check(_mail.send('a@example.com', 'Line\nInjected: yes', 'b') is False, 'dead mail server returns False')
for k in ('MAIL_SERVER', 'MAIL_PORT', 'MAIL_FROM'):
    os.environ.pop(k)
ad.post(reg_url, data={'decision': 'rejected'})

# notifications
check(u1.get('/api/auth/me').get_json()['user']['unread_notifications'] >= 1, 'unread count')
check(app.test_client().post('/api/account/notifications/read').status_code == 401, 'read needs login')
check(u1.post('/api/account/notifications/read').get_json()['user']['unread_notifications'] == 0, 'mark read')
check(u1.get('/api/account').get_json()['notifications'][0]['is_read'] is True, 'stays read')

# editing the form later keeps old answers
set_form(ev, [{'label': 'New only', 'kind': 'short', 'required': False}])
check(b'Because' in ad.get(reg_url).data, 'old answers survive form edits')
csv_text = ad.get(f'/admin/events/{ev}/attendance/export.csv').get_data(as_text=True)
check('Why?' in csv_text and 'New only' in csv_text and 'A; B' in csv_text and 'rejected' in csv_text, 'csv has answers and removed questions')
# reordering keeps ids; ids from another event make new questions
keep = form_of(pub, ev)['New only']
set_form(ev, [{'label': 'Added', 'kind': 'short'}, {'id': keep['id'], 'label': 'Renamed', 'kind': 'short'}])
now = pub.get(f'/api/events/{ev}').get_json()['questions']
check([q['label'] for q in now] == ['Added', 'Renamed'] and now[1]['id'] == keep['id'], 'reorder and rename keep the id')
set_form(ev_nolimit, [{'id': keep['id'], 'label': 'Stolen', 'kind': 'short', 'required': True}])
check(pub.get(f'/api/events/{ev}').get_json()['questions'][1]['label'] == 'Renamed', 'cannot edit another event\'s question')
qn = form_of(pub, ev_nolimit)['Stolen']
check(u1.post(f'/api/events/{ev_past}/register', json={}).status_code == 400, 'past event refuses')
check(u1.post(f'/api/events/{ev_nolimit}/register', json={'answers': {str(qn['id']): 'yes'}}).status_code == 201, 'apply to open event')
with app.app_context():
    rid3 = m.EventRegistration.query.filter_by(event_id=ev_nolimit).first().id
ad.post(f'/admin/events/{ev_nolimit}/registrations/{rid3}', data={'decision': 'approved'})

# ---------- QR check-in works for every card ----------
with app.app_context():
    tok1 = m.User.query.filter_by(email='a@example.com').first().qr_token
    tok2 = m.User.query.filter_by(email='b@example.com').first().qr_token
    uid1 = m.User.query.filter_by(email='a@example.com').first().id
r = ad.post('/admin/scanner/checkin', json={'event_id': ev_nolimit, 'code': f'IYDPVIP:{tok1}'}).get_json()
check(r['status'] == 'ok' and r['card'] == 'Standard' and r['registered'] is True, 'approved member checks in')
check(ad.post('/admin/scanner/checkin', json={'event_id': ev_nolimit, 'code': f'IYDPVIP:{tok1}'}).get_json()['status'] == 'duplicate', 'duplicate scan')
r = ad.post('/admin/scanner/checkin', json={'event_id': ev_nolimit, 'code': f'IYDPVIP:{tok2}'}).get_json()
check(r['status'] == 'not_approved' and r['reason'] == 'Did not apply' and r['name'], 'scanner stops people without approval')
with app.app_context():
    uid2 = m.User.query.filter_by(email='b@example.com').first().id
    check(m.Attendance.query.filter_by(event_id=ev_nolimit, user_id=uid2).count() == 0, 'refused scan records nothing')
check(ad.post('/admin/scanner/checkin', json={'event_id': ev_nolimit, 'code': f'IYDPVIP:{tok2}', 'override': 'yes'}).get_json()['status'] == 'not_approved', 'override must be exactly true')
r = ad.post('/admin/scanner/checkin', json={'event_id': ev_nolimit, 'code': f'IYDPVIP:{tok2}', 'override': True}).get_json()
check(r['status'] == 'ok' and r['registered'] is False, 'door override works and is flagged')
ev_noform = add_event('Walk In Day', starts_at=when)
r = ad.post('/admin/scanner/checkin', json={'event_id': ev_noform, 'code': f'IYDPVIP:{tok2}'}).get_json()
check(r['status'] == 'ok', 'event without a form allows walk-ins')
check(ad.post('/admin/scanner/checkin', json={'event_id': ev_nolimit, 'code': 'garbage'}).get_json()['status'] == 'invalid', 'bad code')
page = ad.get(f'/admin/events/{ev_nolimit}/attendance')
check(page.status_code == 200 and b'walk-in' in page.data, 'attendance shows registered and walk-ins')
check('Standard' in ad.get(f'/admin/events/{ev_nolimit}/attendance/export.csv').get_data(as_text=True), 'attendance csv')

# ---------- card types ----------
ad.post(f'/admin/members/{uid1}/vip/activate', data={'note': 'cash'})
check(u1.get('/api/auth/me').get_json()['user']['card_type'] == 'vip', 'VIP card')
ad.post(f'/admin/members/{uid1}/staff', data={'is_staff': '1'})
check(u1.get('/api/auth/me').get_json()['user']['card_type'] == 'member', 'Member card wins')
check(u1.post('/api/vip/request').status_code == 400, 'staff cannot request VIP')
check(b'Member' in ad.get('/admin/members?vip=staff').data, 'member filter')
ad.post(f'/admin/members/{uid1}/staff', data={'is_staff': '0'})
ad.post(f'/admin/members/{uid1}/vip/deactivate')
check(u1.get('/api/auth/me').get_json()['user']['card_type'] == 'standard', 'back to standard')
check(u1.get('/api/account/qr.svg').status_code == 200, 'QR survives VIP removal')
with app.app_context():
    before = m.db.session.get(m.User, uid1).qr_token
ad.post(f'/admin/members/{uid1}/vip/regenerate-qr')
with app.app_context():
    after = m.db.session.get(m.User, uid1).qr_token
check(before != after, 'any member can get a new QR')
check(ad.post('/admin/scanner/checkin', json={'event_id': ev, 'code': f'IYDPVIP:{before}'}).get_json()['status'] == 'invalid', 'old QR dead')

# ---------- every admin page renders ----------
with app.app_context():
    mem = m.User.query.filter_by(email='b@example.com').first().id
    news_id = m.News.query.first().id
    story = m.Story.query.first()
    msg = m.ContactMessage.query.first()
pages = ['/admin', '/admin/messages', '/admin/news', '/admin/news/add', f'/admin/news/edit/{news_id}', '/admin/stories', '/admin/stories/add',
         '/admin/projects', '/admin/projects/add', f'/admin/projects/edit/{open_id}', f'/admin/projects/edit/{closed_id}', '/admin/applications',
         f'/admin/applications?project={open_id}', '/admin/members', '/admin/members?vip=none', f'/admin/members/{mem}', f'/admin/members/{uid1}',
         '/admin/vip-requests', '/admin/events', '/admin/events/add', f'/admin/events/edit/{ev}', f'/admin/events/{ev}/attendance',
         f'/admin/events/{ev_past}/attendance', '/admin/scanner', '/admin/settings']
if story:
    pages.append(f'/admin/stories/edit/{story.id}')
if msg:
    pages.append(f'/admin/message/{msg.id}')
for url in pages:
    r = ad.get(url)
    check(r.status_code == 200, f'{url} -> {r.status_code}')
    check(b'fa-solid' not in r.data, f'{url} old icon')

# ---------- password reset ----------
import re as _re
phone1, d3 = signup('r@example.com', 'Reset Me')
phone2 = app.test_client()
check(phone2.post('/api/auth/login', json={'email': 'r@example.com', 'password': 'secret12'}).status_code == 200, 'second device login')
rid = d3['id']
check(app.test_client().post(f'/admin/members/{rid}/reset-password').status_code == 302, 'reset needs admin')
check(phone1.post(f'/admin/members/{rid}/reset-password').status_code == 302, 'member cannot reset')
with app.app_context():
    admin_id = m.User.query.filter_by(is_admin=True).first().id
check(ad.post(f'/admin/members/{admin_id}/reset-password').status_code == 404, 'admin account cannot be reset here')
r = ad.post(f'/admin/members/{rid}/reset-password')
check(r.status_code == 200 and r.headers['Cache-Control'] == 'no-store', 'reset response not cached')
temp = _re.search(r'id="temp-password"[^>]*>([^<]+)<', r.get_data(as_text=True)).group(1)
check(len(temp) >= 12, 'temp password is long')
check(temp.encode() not in ad.get(f'/admin/members/{rid}').data, 'temp password shown only once')
with app.app_context():
    stored = m.db.session.get(m.User, rid).password
    check(temp not in stored and stored != temp, 'temp password is hashed')
check(phone1.get('/api/auth/me').get_json()['user'] is None and phone2.get('/api/auth/me').get_json()['user'] is None, 'all devices signed out')
c = app.test_client()
check(c.post('/api/auth/login', json={'email': 'r@example.com', 'password': 'secret12'}).status_code == 401, 'old password dead')
r = c.post('/api/auth/login', json={'email': 'r@example.com', 'password': temp})
check(r.status_code == 200 and r.get_json()['user']['must_change_password'] is True, 'temp login asks for change')
for body, why in [({'current_password': 'wrong1234', 'new_password': 'brandnew99', 'confirm_password': 'brandnew99'}, 'wrong current'),
                  ({'current_password': temp, 'new_password': 'short', 'confirm_password': 'short'}, 'short'),
                  ({'current_password': temp, 'new_password': 'brandnew99', 'confirm_password': 'different9'}, 'mismatch'),
                  ({'current_password': temp, 'new_password': temp, 'confirm_password': temp}, 'same')]:
    check(c.post('/api/account/password', json=body).status_code == 400, f'change rejects {why}')
other = app.test_client()
other.post('/api/auth/login', json={'email': 'r@example.com', 'password': temp})
r = c.post('/api/account/password', json={'current_password': temp, 'new_password': 'brandnew99', 'confirm_password': 'brandnew99'})
check(r.status_code == 200 and r.get_json()['user']['must_change_password'] is False, 'change ok')
check(c.get('/api/auth/me').get_json()['user'] is not None, 'stays signed in here')
check(other.get('/api/auth/me').get_json()['user'] is None, 'other device signed out')
check(app.test_client().post('/api/auth/login', json={'email': 'r@example.com', 'password': temp}).status_code == 401, 'temp password dead')
check(app.test_client().post('/api/auth/login', json={'email': 'r@example.com', 'password': 'brandnew99'}).status_code == 200, 'new password works')
check(app.test_client().post('/api/account/password', json={}).status_code == 401, 'change needs login')
check(app.test_client().post('/api/auth/register', json={'full_name': 'x', 'email': 'short@example.com', 'password': 'abc123', 'confirm_password': 'abc123'}).status_code == 400, '8 char minimum')

# admin changing their own password keeps this session, drops others
ad2 = app.test_client()
ad2.post('/admin/login', data={'username': admin_name, 'password': 'adminpw12345'})
r = ad.post('/admin/settings', data={'current_password': 'adminpw12345', 'new_password': 'adminpw67890', 'confirm_password': 'adminpw67890'})
check(r.status_code == 302, 'admin password change')
check(ad.get('/admin').status_code == 200, 'admin stays signed in')
check(ad2.get('/admin').status_code == 302, 'other admin session signed out')

# ---------- member profile ----------
check(app.test_client().get('/api/account/profile').status_code == 401, 'profile needs login')
check(app.test_client().post('/api/account/profile', json={}).status_code == 401, 'profile save needs login')
pa, pd = signup('p@example.com', 'Profile Person')
pb, pd2 = signup('p2@example.com', 'Other Person')
r = pa.get('/api/account/profile').get_json()
check(r['progress'] == 0 and r['complete'] is False and r['profile']['education'] == [] and 'interests' in r['options'], 'empty profile')
check(pa.get('/api/auth/me').get_json()['user']['profile_progress'] == 0, 'me reports progress')
for bad, why in [({'birth_date': '2999-01-01'}, 'future birth'), ({'birth_date': 'nonsense'}, 'bad birth'),
                 ({'gender': 'x'}, 'bad gender'), ({'occupation': 'x'}, 'bad occupation'),
                 ({'cv_link': 'javascript:alert(1)'}, 'js link'), ({'linkedin': 'javascript:alert(1)'}, 'js linkedin'),
                 ({'education': [{'institution': '', 'level': 'bachelor'}]}, 'edu no institution'),
                 ({'education': [{'institution': 'X', 'level': 'nope'}]}, 'edu bad level'),
                 ({'education': [{'institution': 'X', 'level': 'bachelor', 'start_year': '2020', 'end_year': '2010'}]}, 'edu years reversed'),
                 ({'education': [{'institution': 'X', 'level': 'bachelor', 'start_year': 'abcd'}]}, 'edu bad year'),
                 ({'experience': [{'organization': 'X', 'kind': 'nope'}]}, 'exp bad kind'),
                 ({'languages': [{'language': 'English', 'level': 'Z9'}]}, 'lang bad level')]:
    check(pa.post('/api/account/profile', json=bad).status_code == 400, f'profile rejects {why}')
check(pa.get('/api/account/profile').get_json()['progress'] == 0, 'rejected save stores nothing')
check(pa.post('/api/account/profile', data='not json', content_type='application/json').status_code == 200, 'garbage body is harmless')
check(pa.post('/api/account/profile', json={'education': 'x', 'interests': 'x', 'languages': [1, None]}).status_code == 200, 'wrong types ignored')
r = pa.post('/api/account/profile', json={'citizenship': 'Azerbaijan', 'education': [{'institution': '', 'level': '', 'field': ''}]})
check(r.status_code == 200 and r.get_json()['user']['profile_progress'] == 17 and r.get_json()['profile']['education'] == [], 'partial save, blank row dropped')
full = {'birth_date': '2001-05-06', 'gender': 'undisclosed', 'citizenship': 'Azerbaijan', 'residence': 'Baku', 'occupation': 'student',
        'skills': '<script>alert(1)</script>', 'interests': ['environment', 'nope', 'digital'], 'cv_link': 'https://example.com/cv',
        'education': [{'institution': 'BDU', 'level': 'bachelor', 'field': 'Law', 'start_year': '2019', 'end_year': ''}, {'institution': 'School 6', 'level': 'secondary'}],
        'experience': [{'kind': 'volunteer', 'organization': 'Red Crescent', 'role': 'Helper', 'start_year': 2021, 'end_year': 2022, 'description': 'Food'}],
        'languages': [{'language': 'English', 'level': 'B2'}]}
r = pa.post('/api/account/profile', json=full)
d = r.get_json()
check(r.status_code == 200 and d['user']['profile_complete'] is True and d['user']['profile_progress'] == 100, 'complete profile')
check(sorted(d['profile']['interests']) == ['digital', 'environment'] and len(d['profile']['education']) == 2 and d['profile']['experience'][0]['start_year'] == 2021, 'profile stored')
check(pb.get('/api/account/profile').get_json()['profile']['citizenship'] == '', 'profiles are separate')
check(pa.post('/api/account/profile', json=d['profile']).status_code == 200, 'the loaded profile saves back unchanged')
check(len(pa.get('/api/account/profile').get_json()['profile']['education']) == 2, 'rows replaced, not duplicated')
r = pa.post('/api/account/profile', json={**full, 'education': [full['education'][0]]})
with app.app_context():
    check(m.ProfileEducation.query.count() == 1, 'removed row is deleted')
r = pa.get('/api/account/profile')
check(r.headers['Cache-Control'] == 'no-store', 'profile not cached')
pid = pd['id']
check(pb.get(f'/admin/members/{pid}').status_code == 302, 'member cannot open admin view')
page = ad.get(f'/admin/members/{pid}').get_data(as_text=True)
check('BDU' in page and 'Red Crescent' in page and 'English (B2)' in page and 'Complete' in page, 'admin sees profile')
check('<script>alert(1)' not in page and '&lt;script&gt;' in page, 'admin view escapes profile text')
check('Not filled in yet' in ad.get(f"/admin/members/{pd2['id']}").get_data(as_text=True), 'admin sees empty profile')

# a project can require it
r = ad.post('/admin/projects/add', data={'title': 'Needs profile', 'description': 'd', 'is_active': 'on', 'accepts_applications': 'on', 'requires_profile': 'on'}, content_type='multipart/form-data')
check(r.status_code == 302, 'create requires_profile project')
with app.app_context():
    np_id = m.Opportunity.query.filter_by(title='Needs profile').first().id
check(b'name="requires_profile"' in ad.get(f'/admin/projects/edit/{np_id}').data, 'admin toggle shown')
check(app.test_client().get(f'/api/projects/{np_id}').get_json()['requires_profile'] is True, 'api exposes requirement')
body = {'full_name': 'A B', 'email': 'p@example.com', 'phone': '123', 'birth_date': '2001-05-06', 'residence': 'Baku', 'english_level': 'Advanced', 'motivation': 'x' * 40}
check(pb.post(f'/api/projects/{np_id}/apply', json={**body, 'email': 'p2@example.com'}).status_code == 403, 'incomplete profile blocked by server')
check(pa.post(f'/api/projects/{np_id}/apply', json=body).status_code == 201, 'complete profile can apply')
ad.post(f'/admin/projects/edit/{np_id}', data={'title': 'Needs profile', 'description': 'd', 'is_active': 'on', 'accepts_applications': 'on'}, content_type='multipart/form-data')
check(pb.post(f'/api/projects/{np_id}/apply', json={**body, 'email': 'p2@example.com'}).status_code == 201, 'toggle off lets them apply')
check(ad.post(f'/admin/projects/delete/{np_id}').status_code == 302, 'cleanup project')
with app.app_context():
    u = m.db.session.get(m.User, pid)
    m.db.session.delete(u)
    m.db.session.commit()
    check(m.MemberProfile.query.filter_by(user_id=pid).count() == 0 and m.ProfileEducation.query.count() == 0 and m.ProfileExperience.query.count() == 0 and m.ProfileLanguage.query.count() == 0, 'deleting a user removes the profile')

# ---------- a project's own form ----------
r = ad.post('/admin/projects/add', data={'title': 'Form project', 'description': 'd', 'is_active': 'on', 'accepts_applications': 'on'}, content_type='multipart/form-data')
with app.app_context():
    fp = m.Opportunity.query.filter_by(title='Form project').first().id
form_url = f'/admin/projects/{fp}/form'
check(app.test_client().get(form_url).status_code == 302, 'project builder needs admin')
check(u1.get(form_url).status_code == 302, 'member cannot open project builder')
check(ad.get(form_url).status_code == 200, 'project builder opens')
d = pub.get(f'/api/projects/{fp}').get_json()
check(d['has_form'] is False and d['questions'] == [], 'no form yet')
pa2, pd3 = signup('fp1@example.com', 'Standard Form')
std = {'full_name': 'S F', 'email': 'fp1@example.com', 'phone': '123', 'birth_date': '2001-05-05', 'residence': 'Baku', 'english_level': 'Advanced', 'motivation': 'x' * 40}
check(pa2.post(f'/api/projects/{fp}/apply', json=std).status_code == 201, 'without a form the standard form still works')
r = ad.post(form_url, data={'questions_json': _json.dumps([{'label': '', 'kind': 'short'}])})
check(r.status_code == 200 and b'Question 1' in r.data, 'project form validated')
r = ad.post(form_url, data={'questions_json': _json.dumps([{'label': 'Why this?', 'kind': 'long', 'required': True}, {'label': 'Pick', 'kind': 'multiple', 'required': False, 'options': ['X', 'Y']}])})
check(r.status_code == 302 and r.headers['Location'].endswith(form_url), 'project form saves')
d = pub.get(f'/api/projects/{fp}').get_json()
check(d['has_form'] is True and [q['label'] for q in d['questions']] == ['Why this?', 'Pick'], 'site gets the questions')
pq = {q['label']: q['id'] for q in d['questions']}
pb2, pd4 = signup('fp2@example.com', 'Custom Form')
check(app.test_client().post(f'/api/projects/{fp}/apply', json={}).status_code == 401, 'guest cannot apply')
r = pb2.post(f'/api/projects/{fp}/apply', json={'answers': {}})
check(r.status_code == 400 and str(pq['Why this?']) in r.get_json()['errors'], 'required answer enforced on projects')
check(pb2.post(f'/api/projects/{fp}/apply', json={'answers': {str(pq['Why this?']): 'ok', str(pq['Pick']): ['Z']}}).status_code == 400, 'project option checked')
r = pb2.post(f'/api/projects/{fp}/apply', json={'answers': {str(pq['Why this?']): '<b>Because</b>', str(pq['Pick']): ['Y']}})
check(r.status_code == 201 and r.get_json()['my_application']['status'] == 'pending' and r.get_json()['my_application']['answers'][0]['value'] == '<b>Because</b>', 'custom answers stored')
check(pb2.post(f'/api/projects/{fp}/apply', json={'answers': {str(pq['Why this?']): 'again'}}).status_code == 409, 'no second application')
with app.app_context():
    fa = m.Application.query.filter_by(opportunity_id=fp, email='fp2@example.com').first()
    check(fa.full_name == 'Custom Form' and fa.phone == '+994501112233' and fa.motivation is None, 'contact copied from the account')
    fa_id = fa.id
    other_q = m.EventQuestion.query.first()
page = ad.get(f'/admin/applications/{fa_id}').get_data(as_text=True)
check('Why this?' in page and '&lt;b&gt;Because' in page and 'Motivation' not in page, 'admin sees escaped answers')
check('Why this?' in ad.get(f'/admin/applications/export.csv?project={fp}').get_data(as_text=True), 'csv has project answers')
ad.post(form_url, data={'questions_json': _json.dumps([{'id': other_q.id, 'label': 'Hijack', 'kind': 'short'}])})
with app.app_context():
    check(m.db.session.get(m.EventQuestion, other_q.id).label != 'Hijack', 'event question cannot be edited from a project')
check(b'Why this?' in ad.get(f'/admin/applications/{fa_id}').data, 'old project answers survive form edits')
ad.post(f'/admin/applications/{fa_id}', data={'status': 'rejected', 'message': 'Next time', 'admin_note': 'secret team note'})
d = pb2.get(f'/api/projects/{fp}').get_json()['my_application']
check(d['status'] == 'rejected' and d['note'] == 'Next time', 'message reaches the applicant')
n = pb2.get('/api/account').get_json()['notifications'][0]
check('qəbul olunmadı' in n['title'] and 'Next time' in n['body'] and 'secret' not in str(n), 'project rejection notice, team note private')

# ---------- where admins find forms and people ----------
page = ad.get('/admin/events').get_data(as_text=True)
check('Registered (' in page and f'/admin/events/{ev}/form' in page and f'/admin/events/{ev}/attendance' in page, 'event list links people and form')
page = ad.get(f'/admin/events/edit/{ev}').get_data(as_text=True)
check(f'/admin/events/{ev}/form' in page and f'/admin/events/{ev}/attendance' in page, 'event edit links people and form')
page = ad.get(f'/admin/events/{ev}/attendance').get_data(as_text=True)
check('Registered people' in page and f'/admin/events/{ev}/form' in page, 'event page')
page = ad.get('/admin/projects').get_data(as_text=True)
check(f'/admin/projects/{fp}/form' in page and 'Applications (' in page, 'project list links form')
check(form_url.encode() in ad.get(f'/admin/projects/edit/{fp}').data and form_url.encode() in ad.get(f'/admin/applications?project={fp}').data, 'project pages link form')
check(ad.post(f'/admin/projects/delete/{fp}').status_code == 302, 'project with form, answers and notices deletes')
with app.app_context():
    check(m.ProjectQuestion.query.filter_by(opportunity_id=fp).count() == 0 and m.Notification.query.filter_by(opportunity_id=fp).count() == 0, 'project form and notices removed')

# ---------- database settings ----------
from sqlalchemy import text as _text
from sqlalchemy.exc import IntegrityError as _IE
with app.app_context():
    check(m.db.session.execute(_text('PRAGMA journal_mode')).scalar() == 'wal', 'WAL on')
    check(m.db.session.execute(_text('PRAGMA foreign_keys')).scalar() == 1, 'foreign keys on')
    check(m.db.session.execute(_text('PRAGMA busy_timeout')).scalar() == 15000, 'busy timeout set')
    m.db.session.add(m.EventRegistration(event_id=999999, user_id=999999))
    try:
        m.db.session.commit()
        check(False, 'orphan row must be rejected')
    except _IE:
        m.db.session.rollback()
        check(True, 'orphan row rejected')
    check(m.db.session.execute(_text('PRAGMA foreign_key_check')).fetchall() == [], 'no foreign key violations')

# delete cascades
check(ad.post(f'/admin/projects/delete/{open_id}').status_code == 302, 'delete project')
check(ad.post(f'/admin/events/delete/{ev}').status_code == 302, 'delete event')
with app.app_context():
    check(m.Application.query.filter_by(opportunity_id=open_id).count() == 0, 'applications go with the project')
    check(m.EventRegistration.query.filter_by(event_id=ev).count() == 0, 'registrations go with the event')

# ---------- CSRF is really on for the public API ----------
app.config['WTF_CSRF_ENABLED'] = True
c = app.test_client()
check(c.post('/api/auth/register', json={}).status_code == 400, 'no token rejected')
tok = c.get('/api/csrf-token').get_json()['csrf_token']
r = c.post('/api/auth/register', json={'full_name': 'C', 'email': 'c@example.com', 'password': 'secret12', 'confirm_password': 'secret12'}, headers={'X-CSRFToken': tok})
check(r.status_code == 201, 'token accepted')
with app.app_context():
    check(m.db.session.execute(_text('PRAGMA foreign_key_check')).fetchall() == [], 'no violations after all flows')
print('ALL PASSED:', passed, 'checks')
