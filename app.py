import csv
import html
import io
import json
import os
import re
import secrets
import time
from datetime import date, datetime, timezone, timedelta
from functools import wraps

import logging
import warnings

from dotenv import load_dotenv
from flask import (
    Flask, render_template, request, redirect, url_for, flash, session,
    jsonify, abort, Response, send_from_directory
)
from flask.sessions import SecureCookieSessionInterface
from flask_login import (
    LoginManager, login_user, login_required, current_user, logout_user
)
from flask_migrate import Migrate
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode
import qrcode.image.svg

from models import (
    db, User, ContactMessage, Opportunity, OpportunityTag, OpportunityPhoto, Application,
    News, Story, StoryPhoto, Payment, Event, EventRegistration, Attendance,
    MemberProfile, ProfileEducation, ProfileExperience, ProfileLanguage,
    Notification, EventQuestion, ProjectQuestion, QUESTION_KINDS, utcnow,
    GENDERS, OCCUPATIONS, EDUCATION_LEVELS, EXPERIENCE_KINDS, LANGUAGE_LEVELS, INTERESTS,
    az_now_naive,
)
from services import vip as vip_service
from services import checkin as checkin_service
from services import uploads as upload_service
from services import mail as mail_service
from services import registrations as registration_service
from services import accounts
from services import email_verification as verification
from services import password_reset
from services import bot_check
from services import seo

load_dotenv()

app = Flask(__name__)

# Behind nginx or Cloudflare every request seems to come from the proxy, so one
# visitor's failed logins would use up the rate limit for everyone.
_proxy_hops = int(os.environ.get('TRUSTED_PROXY_HOPS', '0'))
if _proxy_hops:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=_proxy_hops, x_proto=1)

_secret_key = os.environ.get('SECRET_KEY')
if not _secret_key:
    _secret_key = secrets.token_hex(32)
    warnings.warn(
        'SECRET_KEY is not set in the environment. Generated a random one for '
        'this process only, so all sessions will be invalidated on restart. '
        'Set SECRET_KEY in your .env / hosting environment before deploying.',
        RuntimeWarning,
    )
elif _secret_key == 'change-me-to-a-long-random-value':
    # The placeholder from .env.example is public: anyone could sign an admin session with it.
    raise RuntimeError('SECRET_KEY is still the example value. Generate one with: '
                       'python -c "import secrets; print(secrets.token_hex(32))"')
elif len(_secret_key) < 32:
    warnings.warn('SECRET_KEY is short. Use at least 32 random characters in production.', RuntimeWarning)
app.config['SECRET_KEY'] = _secret_key

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'sqlite:///iydp.db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Pick up template edits without restarting the server (cheap: one stat per render).
app.config['TEMPLATES_AUTO_RELOAD'] = True
# Story albums are uploaded in one request; individual images are
# downscaled on save, so this only bounds the raw upload.
app.config['MAX_CONTENT_LENGTH'] = 80 * 1024 * 1024

# Session cookie hardening. SESSION_COOKIE_SECURE defaults to on (cookies only
# sent over HTTPS); set SESSION_COOKIE_SECURE=0 in .env for local HTTP dev.
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', '1') == '1'
# A signed-in member stays signed in while they keep coming back, and no longer. This also
# limits how long a copied cookie works, since sessions live in the cookie.
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=14)
ADMIN_IDLE_SECONDS = 2 * 60 * 60
# The token already belongs to the session. With the default one-hour limit, any form left
# open for an hour failed when sent.
app.config['WTF_CSRF_TIME_LIMIT'] = None
ASSET_PREFIXES = ('/assets/', '/static/', '/images/')


class AssetAwareSessionInterface(SecureCookieSessionInterface):
    def should_set_cookie(self, app, session):
        # Files that caches may keep must never carry someone's session cookie.
        return not request.path.startswith(ASSET_PREFIXES) and super().should_set_cookie(app, session)


app.session_interface = AssetAwareSessionInterface()

db.init_app(app)
migrate = Migrate(app, db)


# What pages may load. React and framer-motion set inline styles, so those stay allowed.
_CSP_COMMON = (
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; "
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; "
)
SITE_CSP = _CSP_COMMON + "script-src 'self'; img-src 'self' data: https:"
# The admin templates use inline scripts and handlers. All of their output is escaped by
# Jinja, and scripts can still only load from this site. The scanner shows the camera as blob:.
ADMIN_CSP = _CSP_COMMON + "script-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob:"


@app.after_request
def set_security_headers(response):
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')  # blocks clickjacking of the admin panel
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.setdefault('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()')
    if response.mimetype == 'text/html':
        response.headers.setdefault('Content-Security-Policy', ADMIN_CSP if request.path.startswith('/admin') else SITE_CSP)
    # Only over HTTPS. Browsers then refuse plain http for this domain, not its subdomains.
    if request.is_secure:
        response.headers.setdefault('Strict-Transport-Security', 'max-age=15552000')
    if request.path.startswith(('/admin', '/api/')):
        response.headers.setdefault('X-Robots-Tag', 'noindex')
    # Member data must not be left in a shared computer's browser cache.
    if request.path.startswith(('/admin', '/api/account', '/api/auth')):
        response.headers['Cache-Control'] = 'no-store'
    return response

csrf = CSRFProtect(app)
limiter = Limiter(get_remote_address, app=app, default_limits=[])

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith('/api/'):
        return jsonify({'error': 'authentication_required'}), 401
    return redirect(url_for('login', next=request.path))

# React SPA (built `dist/`) — public pages below that have a matching React
# page serve it directly instead of rendering the old Jinja templates.
DIST_DIR = os.path.join(app.root_path, 'dist')


def _site_url():
    return os.environ.get('SITE_URL') or request.url_root


def _detail_page(path):
    """(title, description, image) for a page about one item, or None if it isn't public."""
    kind, _, key = path.strip('/').partition('/')
    if kind == 'stories':
        story = Story.query.filter_by(slug=key, is_published=True).first()
        return story and (story.title, seo.description_from(story.content), story.avatar_path)
    if not re.fullmatch(r'\d{1,9}', key):
        return None
    if kind == 'news':
        item = News.query.filter_by(id=int(key), is_published=True).first()
        return item and (item.title, seo.description_from(item.content), item.image_url)
    if kind == 'projects':
        item = Opportunity.query.filter_by(id=int(key), is_active=True).first()
        return item and (item.title, seo.description_from(item.description), item.poster_path)
    if kind == 'events':
        item = Event.query.filter_by(id=int(key), is_public=True).first()
        return item and (item.name, seo.description_from(item.description), item.poster_path)
    return None


def serve_spa():
    index_path = os.path.join(DIST_DIR, 'index.html')
    if not os.path.isfile(index_path):
        abort(404)

    path = request.path.rstrip('/') or '/'
    status, image, noindex = 200, None, False
    if path in seo.PUBLIC_PAGES:
        title, description = seo.PUBLIC_PAGES[path]
    elif path in seo.PRIVATE_PAGES:
        title, description, noindex = seo.PRIVATE_PAGES[path], seo.DEFAULT_DESCRIPTION, True
    else:
        detail = _detail_page(path) if path.startswith(('/news/', '/projects/', '/events/', '/stories/')) else None
        if detail:
            title, description, image = detail
        else:
            # React shows its own page, and search engines are told it isn't a real address.
            title, description, status, noindex = seo.NOT_FOUND_TITLE, seo.DEFAULT_DESCRIPTION, 404, True

    with open(index_path, encoding='utf-8') as f:
        page = seo.render(f.read(), _site_url(), path, title, description, image, noindex)
    return Response(page, status=status, mimetype='text/html', headers={'Cache-Control': 'no-cache'})


@app.route('/robots.txt')
def robots_txt():
    lines = ['User-agent: *'] + [f'Disallow: {p}' for p in ('/admin', '/api/', '/account', '/forgot-password', '/reset-password', '/verify-email')]
    lines += ['', f"Sitemap: {seo.absolute_url(_site_url(), 'sitemap.xml')}"]
    return Response('\n'.join(lines) + '\n', mimetype='text/plain', headers={'Cache-Control': 'public, max-age=3600'})


@app.route('/sitemap.xml')
def sitemap_xml():
    site = _site_url()
    urls = [(seo.absolute_url(site, p.lstrip('/')), None) for p in seo.PUBLIC_PAGES if p not in ('/login', '/register')]
    urls += [(seo.absolute_url(site, f'news/{n.id}'), n.updated_at) for n in News.query.filter_by(is_published=True)]
    urls += [(seo.absolute_url(site, f'projects/{o.id}'), None) for o in Opportunity.query.filter_by(is_active=True)]
    urls += [(seo.absolute_url(site, f'events/{e.id}'), None) for e in Event.query.filter_by(is_public=True)]
    urls += [(seo.absolute_url(site, f'stories/{s.slug}'), None) for s in Story.query.filter_by(is_published=True)]
    return Response(seo.sitemap(urls), mimetype='application/xml', headers={'Cache-Control': 'public, max-age=3600'})


@app.route('/favicon.ico')
def favicon():
    return redirect('/logo.png', code=301)


AZERBAIJAN_TZ = timezone(timedelta(hours=4))
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def datetimeformat(value, format='%Y-%m-%d %H:%M'):
    if value is None:
        return ''
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return value
    return value.strftime(format)


app.jinja_env.filters['datetimeformat'] = datetimeformat


def az_datetime():
    return datetime.now(AZERBAIJAN_TZ)


@app.template_filter('az_time')
def format_az_time(dt, format='%d %B, %Y %H:%M'):
    if dt is None:
        return ''

    az_months = {
        1: 'Yanvar', 2: 'Fevral', 3: 'Mart', 4: 'Aprel',
        5: 'May', 6: 'İyun', 7: 'İyul', 8: 'Avqust',
        9: 'Sentyabr', 10: 'Oktyabr', 11: 'Noyabr', 12: 'Dekabr'
    }

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    az_dt = dt.astimezone(AZERBAIJAN_TZ)

    day = az_dt.day
    month = az_months[az_dt.month]
    year = az_dt.year
    hour = az_dt.hour
    minute = az_dt.minute

    if '%H' not in format:
        return f"{day} {month} {year}"
    return f"{day} {month} {year}, {hour:02d}:{minute:02d}"


@app.context_processor
def inject_now():
    return {'now': datetime.now(), 'az_now': az_datetime()}


@app.context_processor
def inject_admin_counters():
    if current_user.is_authenticated and current_user.is_admin:
        return {
            'pending_vip_count': Payment.query.filter_by(status='pending').count(),
            # Views may still pass their own value; this is the fallback for the nav badge.
            'unread_count': ContactMessage.query.filter_by(is_read=False).count(),
            'pending_applications_count': Application.query.filter_by(status='pending').count(),
            'pending_registrations_count': EventRegistration.query.filter_by(status='pending').count(),
        }
    return {}


@app.before_request
def apply_session_limits():
    if request.path.startswith(ASSET_PREFIXES):
        return
    if not current_user.is_authenticated or not current_user.is_admin:
        session.permanent = True
        return
    # An admin's session ends with the browser, or after two hours away from it.
    session.permanent = False
    now = time.time()
    if now - session.get('admin_seen', now) > ADMIN_IDLE_SECONDS:
        logout_user()
        session.pop('admin_seen', None)
        flash('Signed out after two hours without activity.', 'info')
    else:
        session['admin_seen'] = now


@login_manager.user_loader
def load_user(session_id):
    user_id, _, version = session_id.partition('.')
    user = db.session.get(User, int(user_id))
    if user and not user.deleted_at and str(user.session_version) == version:
        return user
    return None


with app.app_context():
    db.create_all()
    try:
        # The first admin comes from the environment: no default password in the code.
        if not User.query.filter_by(is_admin=True).first():
            admin_password = os.environ.get('ADMIN_PASSWORD')
            if admin_password:
                admin = User(
                    username=os.environ.get('ADMIN_USERNAME', 'admin'),
                    password=generate_password_hash(admin_password),
                    is_admin=True,
                )
                db.session.add(admin)
                db.session.flush()
                admin.ensure_card()
                db.session.commit()
            else:
                warnings.warn('No admin account exists. Set ADMIN_PASSWORD and restart to create one.', RuntimeWarning)
    except Exception:
        # Schema not migrated yet (e.g. `flask db migrate` inspecting models
        # before `flask db upgrade` has run). Safe to skip on this pass.
        db.session.rollback()


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated_admin_required(*args, **kwargs):
        if not current_user.is_admin:
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated_admin_required


def get_news_album_images(keyword_image):
    folder_name = (keyword_image or '').strip()
    if not folder_name or any(x in folder_name for x in ('..', '/', '\\')):
        return []

    album_dir = os.path.join(app.static_folder, 'news', folder_name)
    if not os.path.isdir(album_dir):
        return []

    allowed_ext = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    image_files = []
    static_base = app.static_url_path or '/static'
    for name in sorted(os.listdir(album_dir), key=str.lower):
        _, ext = os.path.splitext(name)
        if ext.lower() in allowed_ext:
            image_files.append(f'{static_base}/news/{folder_name}/{name}')
    return image_files


@app.route('/')
def home():
    return serve_spa()

@app.route('/contact')
def contact():
    return serve_spa()

# ══════════════════════════════════════════════════════════════
# MEMBER ACCOUNT API (consumed by the React SPA — public self-registration,
# login, VIP digital card). JSON in, JSON out; session cookie auth via
# Flask-Login, same as the rest of the site.
# ══════════════════════════════════════════════════════════════

def user_to_dict(u):
    return {
        'id': u.id,
        'full_name': u.full_name,
        'email': u.email,
        'phone': u.phone,
        'is_admin': u.is_admin,
        'must_change_password': u.must_change_password,
        'email_verified': bool(u.email_verified_at),
        'email_verification_required': verification.is_required(u),
        'verification_sent_at': u.email_verification_sent_at.isoformat() if u.email_verification_sent_at else None,
        'profile_progress': u.profile_progress,
        'profile_complete': u.profile_complete,
        'unread_notifications': Notification.query.filter_by(user_id=u.id, read_at=None).count(),
        'is_vip': u.is_vip,
        'vip_status': u.vip_status,
        'card_type': u.card_type,
        'membership_no': u.membership_no,
        'vip_requested_at': u.vip_requested_at.isoformat() if u.vip_requested_at else None,
        'vip_activated_at': u.vip_activated_at.isoformat() if u.vip_activated_at else None,
        'created_at': u.created_at.isoformat() if u.created_at else None,
    }


@app.route('/api/csrf-token')
def api_csrf_token():
    return jsonify({'csrf_token': generate_csrf()})


def _username_for(email):
    if User.query.filter_by(username=email).first():
        return f'{email}.{secrets.token_hex(3)}'
    return email


def verified_email_required(view):
    """For actions that reach the team. Goes under login_required."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        if verification.is_required(current_user):
            return jsonify({'error': 'Əvvəlcə email ünvanınızı təsdiqləyin.', 'code': 'email_not_verified'}), 403
        return view(*args, **kwargs)
    return wrapped


@app.route('/api/form-token')
def api_form_token():
    response = jsonify({'token': bot_check.make_token()})
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.route('/api/auth/register', methods=['POST'])
@limiter.limit('5 per minute')
# Every sign-up sends a mail to the address given, so this also protects the domain's
# reputation. High enough for a room of participants signing up from one network.
@limiter.limit('60 per hour')
def api_register():
    if current_user.is_authenticated:
        return jsonify({'error': 'already_authenticated'}), 400

    data = request.get_json(silent=True) or request.form
    if bot_check.problem(data):
        return jsonify({'error': 'Bir az gözləyib yenidən cəhd edin.', 'code': 'form_check'}), 400
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    errors = []
    if not full_name or len(full_name) > 150:
        errors.append('Ad və soyadınızı daxil edin.')
    if not EMAIL_RE.match(email) or len(email) > 150:
        errors.append('Düzgün email ünvanı daxil edin.')
    if len(phone) > 30:
        errors.append('Telefon nömrəsi çox uzundur.')
    if len(password) < 8:
        errors.append('Şifrə ən azı 8 simvoldan ibarət olmalıdır.')
    if password != confirm_password:
        errors.append('Şifrələr uyğun gəlmir.')
    existing = User.query.filter_by(email=email).first() if email else None
    if existing and not verification.is_abandoned(existing):
        errors.append('Bu email ilə artıq qeydiyyatdan keçilib.')

    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    if existing:
        accounts.erase(existing)
        db.session.flush()

    member = User(
        username=_username_for(email),
        email=email,
        full_name=full_name,
        phone=phone,
        password=generate_password_hash(password),
        is_admin=False,
    )
    db.session.add(member)
    db.session.flush()
    member.ensure_card()
    db.session.commit()

    # A failed send doesn't stop the sign-up: the account page offers to send it again.
    verification.send_link(member)
    db.session.commit()

    login_user(member)
    return jsonify({'user': user_to_dict(member)}), 201


@app.route('/api/auth/login', methods=['POST'])
@limiter.limit('10 per minute')
def api_login():
    if current_user.is_authenticated:
        return jsonify({'user': user_to_dict(current_user)})

    data = request.get_json(silent=True) or request.form
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    member = User.query.filter_by(email=email).first()
    if member and check_password_hash(member.password, password):
        login_user(member)
        return jsonify({'user': user_to_dict(member)})

    return jsonify({'error': 'Email və ya şifrə yanlışdır.'}), 401


def _reset_address_limit_key():
    data = request.get_json(silent=True)
    address = data.get('email') if isinstance(data, dict) else ''
    return f'reset:{str(address or "").strip().lower()[:150]}'


@app.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit('5 per minute')
# Stops the form being used to flood someone's mailbox. Counts every address alike,
# so being limited says nothing about whether an account exists.
@limiter.limit('5 per hour', key_func=_reset_address_limit_key)
def api_forgot_password():
    if not verification.is_enabled():
        return jsonify({'error': 'Hazırda məktub göndərilə bilmir. Bizimlə əlaqə saxlayın.', 'code': 'mail_off'}), 503
    data = request.get_json(silent=True)
    email = data.get('email') if isinstance(data, dict) else None
    email = email.strip().lower() if isinstance(email, str) else ''
    if not EMAIL_RE.match(email) or len(email) > 150:
        return jsonify({'error': 'Düzgün email ünvanı daxil edin.'}), 400
    member = User.query.filter_by(email=email).first()
    if password_reset.can_reset(member):
        password_reset.send_link(member)
    # The same answer either way, so nobody can test whether an address has an account.
    return jsonify({'status': 'ok'})


@app.route('/api/auth/reset-password', methods=['POST'])
@limiter.limit('10 per minute')
def api_reset_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    token_data, failure = password_reset.read_token(data.get('token'))
    if failure:
        return jsonify({'error': 'Link işləmir.', 'code': failure}), 400
    member = db.session.get(User, token_data.get('user'))
    if not password_reset.can_reset(member) or not password_reset.token_matches(token_data, member):
        return jsonify({'error': 'Link işləmir.', 'code': 'invalid'}), 400

    password = data.get('password')
    if not isinstance(password, str) or len(password) < 8:
        return jsonify({'error': 'Şifrə ən azı 8 simvoldan ibarət olmalıdır.'}), 400
    if password != data.get('confirm_password'):
        return jsonify({'error': 'Şifrələr uyğun gəlmir.'}), 400

    # Also signs out every device, which removes anyone who got in with the old password.
    member.set_password_hash(generate_password_hash(password))
    member.must_change_password = False
    # Opening a link sent to this address proves the member owns it.
    if not member.email_verified_at:
        verification.mark_verified(member)
    db.session.commit()
    return jsonify({'status': 'ok'})


def _account_limit_key():
    return current_user.get_id() or get_remote_address()


@app.route('/api/auth/verify-email', methods=['POST'])
@limiter.limit('30 per minute')
def api_verify_email():
    data, failure = verification.read_token((request.get_json(silent=True) or {}).get('token'))
    if failure:
        return jsonify({'error': 'Link işləmir.', 'code': failure}), 400
    # Signing in proves the password too. Otherwise someone could open an account with
    # another person's address, and that person's click would confirm it for them.
    if not current_user.is_authenticated:
        return jsonify({'error': 'Daxil olun.', 'code': 'login_required'}), 401
    if data.get('user') != current_user.id:
        return jsonify({'error': 'Bu link başqa hesab üçündür.', 'code': 'wrong_account'}), 403
    if not verification.token_matches(data, current_user):
        return jsonify({'error': 'Link işləmir.', 'code': 'invalid'}), 400
    if not current_user.email_verified_at:
        verification.mark_verified(current_user)
        db.session.commit()
    return jsonify({'user': user_to_dict(current_user)})


@app.route('/api/account/verify-email/resend', methods=['POST'])
@login_required
@limiter.limit('10 per hour', key_func=_account_limit_key)
def api_resend_verification():
    if not verification.is_required(current_user):
        return jsonify({'user': user_to_dict(current_user)})
    wait = verification.seconds_until_resend(current_user)
    if wait:
        return jsonify({'error': f'Yeni link üçün {wait} saniyə gözləyin.'}), 429
    if not verification.send_link(current_user):
        return jsonify({'error': 'Məktub göndərilmədi. Bir az sonra yenidən cəhd edin.'}), 502
    db.session.commit()
    return jsonify({'user': user_to_dict(current_user)})


@app.route('/api/account/email', methods=['POST'])
@login_required
@limiter.limit('5 per minute')
def api_change_unconfirmed_email():
    # Only for fixing a typo. Changing a confirmed address would need its own checks.
    if current_user.email_verified_at or current_user.is_admin:
        return jsonify({'error': 'Təsdiqlənmiş email burada dəyişdirilə bilməz.'}), 400

    data = request.get_json(silent=True) or {}
    email = str(data.get('email') or '').strip().lower()
    if not check_password_hash(current_user.password, str(data.get('password') or '')):
        return jsonify({'error': 'Şifrə yanlışdır.'}), 400
    if not EMAIL_RE.match(email) or len(email) > 150:
        return jsonify({'error': 'Düzgün email ünvanı daxil edin.'}), 400
    if email == current_user.email:
        return jsonify({'error': 'Hesabınızda artıq bu email var.'}), 400

    existing = User.query.filter_by(email=email).first()
    if existing and not verification.is_abandoned(existing):
        return jsonify({'error': 'Bu email ilə artıq qeydiyyatdan keçilib.'}), 400
    if existing:
        accounts.erase(existing)
        db.session.flush()

    if current_user.username == current_user.email:
        current_user.username = _username_for(email)
    current_user.email = email
    current_user.email_verification_sent_at = None
    db.session.commit()

    sent = verification.send_link(current_user)
    db.session.commit()
    if not sent:
        return jsonify({'error': 'Email dəyişdirildi, amma məktub göndərilmədi. Linki yenidən istəyin.'}), 502
    return jsonify({'user': user_to_dict(current_user)})


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({'status': 'ok'})


@app.route('/api/auth/me')
def api_me():
    if not current_user.is_authenticated:
        return jsonify({'user': None}), 200
    return jsonify({'user': user_to_dict(current_user)})


@app.route('/api/account')
@login_required
def api_account():
    payments = Payment.query.filter_by(user_id=current_user.id).order_by(Payment.created_at.desc()).all()
    attendances = (
        Attendance.query.filter_by(user_id=current_user.id)
        .order_by(Attendance.checked_in_at.desc()).all()
    )
    return jsonify({
        'user': user_to_dict(current_user),
        'payments': [{
            'id': p.id,
            'amount': float(p.amount),
            'currency': p.currency,
            'status': p.status,
            'created_at': p.created_at.isoformat() if p.created_at else None,
        } for p in payments],
        'attendances': [{
            'id': a.id,
            'event_name': a.event.name,
            'checked_in_at': a.checked_in_at.isoformat() if a.checked_in_at else None,
        } for a in attendances],
        'notifications': [{
            'id': n.id,
            'title': n.title,
            'body': n.body,
            'link': n.link,
            'is_read': n.read_at is not None,
            'created_at': n.created_at.isoformat() if n.created_at else None,
        } for n in Notification.query.filter_by(user_id=current_user.id).order_by(Notification.id.desc()).limit(20)],
        'applications': [{
            'id': a.id,
            'project_id': a.opportunity_id,
            'project_title': a.opportunity.title,
            'status': a.status,
            'applied_at': a.applied_at.isoformat() if a.applied_at else None,
        } for a in sorted(current_user.applications, key=lambda a: a.id, reverse=True)],
        'event_registrations': [{
            'id': r.id,
            'event_id': r.event_id,
            'event_name': r.event.name,
            'starts_at': r.event.starts_at.isoformat() if r.event.starts_at else None,
            'status': r.status,
        } for r in sorted(current_user.event_registrations, key=lambda r: r.id, reverse=True) if r.event.is_public],
    })


@app.route('/api/account/notifications/read', methods=['POST'])
@login_required
def api_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, read_at=None).update({'read_at': utcnow()})
    db.session.commit()
    return jsonify({'user': user_to_dict(current_user)})


@app.route('/api/account/delete', methods=['POST'])
@login_required
@limiter.limit('5 per minute')
def api_delete_account():
    # Admin accounts stay: the panel would have nobody left to run it.
    if current_user.is_admin:
        return jsonify({'error': 'Admin hesabı burada silinə bilməz.'}), 403
    password = str((request.get_json(silent=True) or {}).get('password') or '')
    if not check_password_hash(current_user.password, password):
        return jsonify({'error': 'Şifrə yanlışdır.'}), 400
    accounts.erase(current_user._get_current_object())
    db.session.commit()
    logout_user()
    return jsonify({'status': 'ok'})


@app.route('/api/account/password', methods=['POST'])
@login_required
@limiter.limit('10 per minute')
def api_change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''

    if not check_password_hash(current_user.password, current_password):
        return jsonify({'error': 'Hazırkı şifrə yanlışdır.'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'Yeni şifrə ən azı 8 simvoldan ibarət olmalıdır.'}), 400
    if new_password != (data.get('confirm_password') or ''):
        return jsonify({'error': 'Şifrələr uyğun gəlmir.'}), 400
    if new_password == current_password:
        return jsonify({'error': 'Yeni şifrə köhnəsindən fərqli olmalıdır.'}), 400

    current_user.set_password_hash(generate_password_hash(new_password))
    current_user.must_change_password = False
    db.session.commit()
    # Other devices are signed out; keep this one signed in.
    login_user(current_user._get_current_object())
    return jsonify({'user': user_to_dict(current_user)})


MAX_PROFILE_ROWS = 20
LINK_RE = re.compile(r'^https?://\S+$')


def _profile_to_dict(p):
    return {
        'birth_date': p.birth_date.isoformat() if p and p.birth_date else '',
        'gender': (p and p.gender) or '',
        'citizenship': (p and p.citizenship) or '',
        'residence': (p and p.residence) or '',
        'occupation': (p and p.occupation) or '',
        'about': (p and p.about) or '',
        'skills': (p and p.skills) or '',
        'interests': (p and p.interests) or [],
        'past_programmes': (p and p.past_programmes) or '',
        'cv_link': (p and p.cv_link) or '',
        'linkedin': (p and p.linkedin) or '',
        'education': [{
            'institution': e.institution, 'level': e.level, 'field': e.field or '',
            'start_year': e.start_year or '', 'end_year': e.end_year or '',
        } for e in (p.education if p else [])],
        'experience': [{
            'kind': e.kind, 'organization': e.organization, 'role': e.role or '',
            'start_year': e.start_year or '', 'end_year': e.end_year or '', 'description': e.description or '',
        } for e in (p.experience if p else [])],
        'languages': [{'language': l.language, 'level': l.level} for l in (p.languages if p else [])],
    }


def _profile_rows(data, name, fields):
    """Rows of one repeating section as clean strings. A row left fully blank is dropped."""
    rows = data.get(name)
    rows = rows if isinstance(rows, list) else []
    clean = []
    for row in rows[:MAX_PROFILE_ROWS]:
        if isinstance(row, dict):
            values = {f: str(row.get(f) or '').strip()[:limit] for f, limit in fields.items()}
            if any(values.values()):
                clean.append(values)
    return clean


def _profile_years(row, errors):
    """Both years as ints or None. A bad value adds an error."""
    years = []
    for name in ('start_year', 'end_year'):
        raw = row.get(name)
        if not raw:
            years.append(None)
        elif raw.isdecimal() and 1950 <= int(raw) <= date.today().year + 10:
            years.append(int(raw))
        else:
            errors.append(f'İl düzgün deyil: {raw}.')
            years.append(None)
    if years[0] and years[1] and years[1] < years[0]:
        errors.append('Bitmə ili başlama ilindən əvvəl ola bilməz.')
    return years


@app.route('/api/account/profile')
@login_required
def api_get_profile():
    return jsonify({
        'profile': _profile_to_dict(current_user.profile),
        'progress': current_user.profile_progress,
        'complete': current_user.profile_complete,
        'options': {
            'genders': GENDERS, 'occupations': OCCUPATIONS, 'education_levels': EDUCATION_LEVELS,
            'experience_kinds': EXPERIENCE_KINDS, 'language_levels': LANGUAGE_LEVELS, 'interests': INTERESTS,
        },
    })


@app.route('/api/account/profile', methods=['POST'])
@login_required
@limiter.limit('30 per minute')
def api_save_profile():
    # Half-filled profiles can be saved: only what is entered gets checked.
    data = request.get_json(silent=True) or {}
    field = lambda name, limit: str(data.get(name) or '').strip()[:limit]  # noqa: E731
    errors = []

    raw_birth_date = field('birth_date', 10)
    birth_date = _parse_date(raw_birth_date)
    if raw_birth_date and (not birth_date or not date(1900, 1, 1) <= birth_date < date.today()):
        errors.append('Doğum tarixi düzgün deyil.')
    gender, occupation = field('gender', 20), field('occupation', 20)
    if gender and gender not in GENDERS:
        errors.append('Cinsiyyət seçimi düzgün deyil.')
    if occupation and occupation not in OCCUPATIONS:
        errors.append('Məşğuliyyət seçimi düzgün deyil.')
    # Shown as links in the admin panel, so only http(s) is accepted.
    cv_link, linkedin = field('cv_link', 500), field('linkedin', 500)
    if (cv_link and not LINK_RE.match(cv_link)) or (linkedin and not LINK_RE.match(linkedin)):
        errors.append('Linklər http:// və ya https:// ilə başlamalıdır.')
    raw_interests = data.get('interests')
    interests = [i for i in INTERESTS if isinstance(raw_interests, list) and i in raw_interests]

    education = []
    for row in _profile_rows(data, 'education', {'institution': 200, 'level': 20, 'field': 150, 'start_year': 4, 'end_year': 4}):
        if not row['institution'] or row['level'] not in EDUCATION_LEVELS:
            errors.append('Təhsil üçün müəssisə adını və səviyyəni daxil edin.')
        start_year, end_year = _profile_years(row, errors)
        education.append(ProfileEducation(
            institution=row['institution'], level=row['level'], field=row['field'] or None,
            start_year=start_year, end_year=end_year,
        ))
    experience = []
    for row in _profile_rows(data, 'experience', {'kind': 20, 'organization': 200, 'role': 150, 'start_year': 4, 'end_year': 4, 'description': 2000}):
        if not row['organization'] or row['kind'] not in EXPERIENCE_KINDS:
            errors.append('Təcrübə üçün təşkilatın adını və növünü daxil edin.')
        start_year, end_year = _profile_years(row, errors)
        experience.append(ProfileExperience(
            kind=row['kind'], organization=row['organization'], role=row['role'] or None,
            start_year=start_year, end_year=end_year, description=row['description'] or None,
        ))
    languages = []
    for row in _profile_rows(data, 'languages', {'language': 60, 'level': 10}):
        if not row['language'] or row['level'] not in LANGUAGE_LEVELS:
            errors.append('Dil üçün adını və səviyyəni daxil edin.')
        languages.append(ProfileLanguage(language=row['language'], level=row['level']))
    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    profile = current_user.profile or MemberProfile(user_id=current_user.id)
    profile.birth_date = birth_date
    profile.gender = gender or None
    profile.citizenship = field('citizenship', 100) or None
    profile.residence = field('residence', 150) or None
    profile.occupation = occupation or None
    profile.about = field('about', 3000) or None
    profile.skills = field('skills', 2000) or None
    profile.interests = interests
    profile.past_programmes = field('past_programmes', 2000) or None
    profile.cv_link = cv_link or None
    profile.linkedin = linkedin or None
    profile.education = education
    profile.experience = experience
    profile.languages = languages
    db.session.add(profile)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Profil başqa pəncərədə saxlanılıb. Səhifəni yeniləyin.'}), 409
    db.session.refresh(current_user)
    return jsonify({
        'profile': _profile_to_dict(current_user.profile),
        'user': user_to_dict(current_user),
    })


@app.route('/api/vip/request', methods=['POST'])
@login_required
@verified_email_required
def api_request_vip():
    if current_user.is_staff_member:
        return jsonify({'error': 'Komanda üzvlərinin artıq Member kartı var.'}), 400
    if current_user.is_vip and current_user.vip_status == 'active':
        return jsonify({'error': 'Siz artıq VIP üzvsünüz.'}), 400
    if current_user.vip_status == 'pending':
        return jsonify({'error': 'VIP sorğunuz artıq nəzərdən keçirilir.'}), 400

    vip_service.request_vip(current_user)
    db.session.commit()
    return jsonify({'user': user_to_dict(current_user)})


@app.route('/api/account/qr.svg')
@login_required
def api_account_qr():
    if not current_user.qr_token:
        current_user.ensure_card()
        db.session.commit()

    factory = qrcode.image.svg.SvgPathImage
    value = checkin_service.encode_qr_value(current_user)
    img = qrcode.make(value, image_factory=factory, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return Response(buf.getvalue(), mimetype='image/svg+xml', headers={
        'Cache-Control': 'no-store',
    })


@app.route('/admin/login', methods=['GET', 'POST'])
@limiter.limit('10 per minute', methods=['POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)

            next_page = request.args.get('next')

            # Only same-site paths: "//host" and "/\\host" would leave the site.
            if not next_page or not next_page.startswith('/') or next_page[1:2] in ('/', '\\'):
                next_page = url_for('admin_dashboard')

            return redirect(next_page)
        else:
            flash('Invalid username or password', 'error')

    return render_template('admin/login.html')
@app.route('/admin/logout')
@login_required
def logout():
    # Sessions live in the cookie, so signing out alone would leave a copied one working.
    if current_user.is_admin:
        current_user.session_version = (current_user.session_version or 0) + 1
        db.session.commit()
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))
@app.route('/admin')
@admin_required
def admin_dashboard():
    recent_news = News.query.order_by(News.created_at.desc()).limit(5).all()
    recent_messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).limit(5).all()

    total_messages_count = ContactMessage.query.count()
    total_news_count = News.query.count()
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    total_members = User.query.filter_by(is_admin=False, deleted_at=None).count()
    total_vip = User.query.filter_by(is_vip=True, vip_status='active').count()
    pending_vip = Payment.query.filter_by(status='pending').count()
    total_events = Event.query.count()
    pending_applications = Application.query.filter_by(status='pending').count()
    pending_registrations = EventRegistration.query.filter_by(status='pending').count()
    first_pending = EventRegistration.query.filter_by(status='pending').order_by(EventRegistration.created_at).first()

    return render_template('admin/dashboard.html',
                         email_verification_on=verification.is_enabled(),
                         site_url_problem=verification.site_url_problem(),
                         recent_news=recent_news,
                         recent_messages=recent_messages,
                         unread_count=unread_count,
                         total_messages=total_messages_count,
                         total_news=total_news_count,
                         total_members=total_members,
                         total_vip=total_vip,
                         pending_vip=pending_vip,
                         pending_applications=pending_applications,
                         pending_registrations=pending_registrations,
                         first_pending_event_id=first_pending.event_id if first_pending else None,
                         total_events=total_events)

@app.route('/admin/settings', methods=['GET', 'POST'])
@admin_required
@limiter.limit('10 per minute', methods=['POST'])
def admin_settings():
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        current_password = request.form.get('current_password', '')
        new_password = request.form.get('new_password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not check_password_hash(current_user.password, current_password):
            flash('Current password is incorrect.', 'danger')
        elif len(new_password) < 8:
            flash('New password must be at least 8 characters.', 'danger')
        elif new_password != confirm_password:
            flash('New passwords do not match.', 'danger')
        else:
            current_user.set_password_hash(generate_password_hash(new_password))
            db.session.commit()
            # Other devices are signed out; keep this one signed in.
            login_user(current_user._get_current_object())
            flash('Password updated successfully.', 'success')
            return redirect(url_for('admin_settings'))

    return render_template('admin/settings.html', unread_count=unread_count)


@app.route('/admin/message/<int:message_id>')
@admin_required
def view_message(message_id):
    message = ContactMessage.query.get_or_404(message_id)
    if not message.is_read:
        message.is_read = True
        db.session.commit()
    if message.created_at.tzinfo is None:
        message.created_at = message.created_at.replace(tzinfo=timezone.utc)

    unread_count = ContactMessage.query.filter_by(is_read=False).count()
    return render_template('admin/view_message.html',
                         message=message,
                         unread_count=unread_count,
                         current_time=datetime.now(timezone.utc))

@app.route('/admin/message/<int:message_id>/delete', methods=['POST'])
@admin_required
def delete_message(message_id):
    message = ContactMessage.query.get_or_404(message_id)
    db.session.delete(message)
    db.session.commit()
    flash('Message deleted.', 'success')
    return redirect(url_for('list_messages'))
@app.route('/admin/messages')
@admin_required
def list_messages():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = ContactMessage.query
    if search:
        query = query.filter(
            (ContactMessage.name.ilike(f'%{search}%')) |
            (ContactMessage.email.ilike(f'%{search}%')) |
            (ContactMessage.message.ilike(f'%{search}%'))
        )

    messages = query.order_by(ContactMessage.created_at.desc()).paginate(page=page, per_page=20, error_out=False)

    return render_template('admin/messages/list.html',
                         messages=messages,
                         search=search,
                         unread_count=unread_count)
STATUS_MODES = ('auto', 'present', 'finished')


def _parse_date(value):
    try:
        return datetime.strptime(value, '%Y-%m-%d').date() if value else None
    except ValueError:
        return None


def _project_form_errors(form):
    errors = []
    if not form.get('title', '').strip():
        errors.append('Title is required.')
    if not form.get('description', '').strip():
        errors.append('Description is required.')
    start, end = _parse_date(form.get('start_date')), _parse_date(form.get('end_date'))
    if start and end and end < start:
        errors.append('The end date cannot be before the start date.')
    return errors


def _apply_project_form(project, form, stale):
    """Copy the form and uploads onto project. Returns upload error strings."""
    project.title = form['title'].strip()
    project.description = form['description'].strip()
    project.requirements = form.get('requirements', '').strip() or None
    project.location = form.get('location', '').strip() or None
    project.start_date = _parse_date(form.get('start_date'))
    project.end_date = _parse_date(form.get('end_date'))
    deadline = _parse_date(form.get('deadline'))
    project.deadline = datetime.combine(deadline, datetime.max.time()) if deadline else None
    mode = form.get('status_mode')
    project.status_mode = mode if mode in STATUS_MODES else 'auto'
    project.accepts_applications = 'accepts_applications' in form
    project.requires_profile = 'requires_profile' in form
    project.is_active = 'is_active' in form

    wanted = {t.strip() for t in form.get('tags', '').split(',') if t.strip()}
    for tag in list(project.tags):
        if tag.name not in wanted:
            project.tags.remove(tag)
    for name in sorted(wanted - {t.name for t in project.tags}):
        project.tags.append(OpportunityTag(name=name[:50]))

    errors = []
    poster = request.files.get('poster')
    if poster and poster.filename:
        try:
            new_path = upload_service.save_photo(
                poster, app.static_folder, app.static_url_path or '/static', folder='projects', kind='posters'
            )
            if project.poster_path:
                stale.append(project.poster_path)
            project.poster_path = new_path
        except upload_service.UploadError as e:
            errors.append(str(e))
    elif form.get('remove_poster') and project.poster_path:
        stale.append(project.poster_path)
        project.poster_path = None

    _apply_photo_edits(project, form, stale)
    errors.extend(_add_uploaded_photos(project, OpportunityPhoto, 'projects'))
    return errors


def _project_form_values(project):
    if project is None:
        return {}
    return {'deadline': project.deadline.strftime('%Y-%m-%d') if project.deadline else ''}


@app.route('/admin/projects')
@admin_required
def list_opportunities():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')

    query = Opportunity.query
    if search:
        query = query.filter(Opportunity.title.ilike(f'%{search}%'))

    items = query.order_by(Opportunity.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    return render_template('admin/opportunities/list.html', items=items, search=search)


@app.route('/admin/projects/add', methods=['GET', 'POST'])
@admin_required
def add_opportunity():
    if request.method == 'POST':
        errors = _project_form_errors(request.form)
        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('admin/opportunities/form.html', project=None, form=request.form, **_project_form_values(None))

        project = Opportunity()
        upload_errors = _apply_project_form(project, request.form, stale=[])
        db.session.add(project)
        db.session.commit()
        for e in upload_errors:
            flash(e, 'error')
        flash('Project created.', 'success')
        return redirect(url_for('edit_opportunity', id=project.id) if upload_errors else url_for('list_opportunities'))

    return render_template('admin/opportunities/form.html', project=None, form={}, **_project_form_values(None))


@app.route('/admin/projects/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_opportunity(id):
    project = Opportunity.query.get_or_404(id)

    if request.method == 'POST':
        errors = _project_form_errors(request.form)
        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('admin/opportunities/form.html', project=project, form=request.form, **_project_form_values(project))

        stale = []
        upload_errors = _apply_project_form(project, request.form, stale)
        db.session.commit()
        _delete_files(stale)
        for e in upload_errors:
            flash(e, 'error')
        flash('Project updated.', 'success')
        return redirect(url_for('edit_opportunity', id=project.id) if upload_errors else url_for('list_opportunities'))

    return render_template('admin/opportunities/form.html', project=project, form={}, **_project_form_values(project))


@app.route('/admin/projects/delete/<int:id>', methods=['POST'])
@admin_required
def delete_opportunity(id):
    project = Opportunity.query.get_or_404(id)
    paths = [project.poster_path] + [p.path for p in project.photos]
    db.session.delete(project)
    db.session.commit()
    _delete_files(paths)
    flash('Project deleted.', 'success')
    return redirect(url_for('list_opportunities'))


# ---- admin: project applications ----

APPLICATION_STATUSES = ('pending', 'accepted', 'rejected')


def _filtered_applications():
    project_id = request.args.get('project', type=int)
    status = request.args.get('status', '')
    query = Application.query
    if project_id:
        query = query.filter_by(opportunity_id=project_id)
    if status in APPLICATION_STATUSES:
        query = query.filter_by(status=status)
    return query.order_by(Application.applied_at.desc()), project_id, status


@app.route('/admin/applications')
@admin_required
def list_applications():
    query, project_id, status = _filtered_applications()
    page = request.args.get('page', 1, type=int)
    items = query.paginate(page=page, per_page=20, error_out=False)
    project = db.session.get(Opportunity, project_id) if project_id else None
    return render_template('admin/applications/list.html', items=items, project=project, project_id=project_id, status=status)


@app.route('/admin/applications/export.csv')
@admin_required
def export_applications():
    query, _, _ = _filtered_applications()
    applications = query.all()
    columns = _answer_columns(applications)
    rows = [[
        a.opportunity.title, a.full_name, a.email, a.phone, a.birth_date, a.residence,
        a.english_level, a.motivation, a.cv_link, a.status,
        a.applied_at.strftime('%Y-%m-%d %H:%M') if a.applied_at else '',
    ] + _answer_cells(a, columns) for a in applications]
    return _csv_response(
        ['Project', 'Full name', 'Email', 'Phone', 'Birth date', 'Residence', 'English', 'Motivation', 'CV link', 'Status', 'Applied at (UTC)'] + list(columns.values()),
        rows, 'applications.csv',
    )


@app.route('/admin/applications/<int:id>', methods=['GET', 'POST'])
@admin_required
def view_application(id):
    application = Application.query.get_or_404(id)
    if request.method == 'POST':
        status = request.form.get('status')
        decided = status in ('accepted', 'rejected') and status != application.status
        if status in APPLICATION_STATUSES:
            application.status = status
        application.admin_note = request.form.get('admin_note', '').strip() or None
        if decided:
            application.decision_note = request.form.get('message', '').strip()[:1000] or None
        db.session.commit()
        if decided:
            registration_service.notify_project_decision(application, os.environ.get('SITE_URL') or request.url_root)
        if decided and application.email_status == 'failed':
            flash('Decision saved, but the email could not be sent. The applicant can still see it on their account page.', 'error')
        elif decided:
            flash('Decision saved. The applicant has been told.', 'success')
        else:
            flash('Application updated.', 'success')
        return redirect(url_for('view_application', id=application.id))
    return render_template('admin/applications/detail.html', application=application)


@app.route('/opportunities')
def opportunities():
    return redirect('/projects', code=301)

@app.route('/opportunity/<int:id>')
def view_opportunity(id):
    return redirect(f'/projects/{id}', code=301)
@app.route('/admin/news')
@login_required
@admin_required
def list_news():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = News.query
    if search:
        query = query.filter(News.title.ilike(f'%{search}%'))

    items = query.order_by(News.created_at.desc()).paginate(page=page, per_page=20, error_out=False)

    return render_template('admin/news/list.html',
                         items=items,
                         search=search,
                         unread_count=unread_count)
@app.route('/admin/news/add', methods=['GET', 'POST'])
@admin_required
def add_news():
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        image_url = request.form.get('image_url')
        is_published = 'is_published' in request.form

        if not title or not content:
            flash('Title and content are required', 'error')
            return redirect(url_for('add_news'))

        news = News(
            title=title,
            content=content,
            image_url=image_url if image_url else None,
            is_published=is_published
        )

        db.session.add(news)
        db.session.commit()

        flash('News added successfully', 'success')
        return redirect(url_for('list_news'))

    return render_template('admin/news/add.html', unread_count=unread_count)

@app.route('/admin/news/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_news(id):
    news = News.query.get_or_404(id)
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        news.title = request.form.get('title', news.title)
        news.content = request.form.get('content', news.content)
        news.image_url = request.form.get('image_url', news.image_url)
        news.is_published = 'is_published' in request.form
        news.updated_at = datetime.now(timezone.utc)

        db.session.commit()
        flash('News updated successfully', 'success')
        return redirect(url_for('list_news'))

    return render_template('admin/news/edit.html', news=news, unread_count=unread_count)

@app.route('/admin/news/delete/<int:id>', methods=['POST'])
@admin_required
def delete_news(id):
    news = News.query.get_or_404(id)
    db.session.delete(news)
    db.session.commit()
    flash('News deleted successfully', 'success')
    return redirect(url_for('list_news'))
@app.route('/news')
def news():
    return serve_spa()




@app.route('/news/<int:id>')
def news_detail(id):
    return serve_spa()
STORY_PROGRAMS = [
    'Erasmus+ Youth Exchange',
    'Erasmus+ Training Course',
    'European Solidarity Corps',
    'Other',
]

_SLUG_TRANSLIT = str.maketrans({
    'ə': 'e', 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ə': 'e', 'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u',
})


def unique_story_slug(title, exclude_id=None):
    base = re.sub(r'[^a-z0-9]+', '-', title.translate(_SLUG_TRANSLIT).lower()).strip('-')[:80] or 'story'
    slug, n = base, 2
    while True:
        q = Story.query.filter_by(slug=slug)
        if exclude_id:
            q = q.filter(Story.id != exclude_id)
        if not q.first():
            return slug
        slug, n = f'{base}-{n}', n + 1


def _story_form_errors(form):
    errors = []
    if not form.get('title', '').strip():
        errors.append('Title is required.')
    if not form.get('author_name', '').strip():
        errors.append("Participant's name is required.")
    if not form.get('content', '').strip():
        errors.append('The story text is required.')
    return errors


def _add_uploaded_photos(owner, photo_model, folder):
    """Append the request's `photos` files to owner.photos. Returns error strings."""
    errors = []
    next_pos = max((p.position for p in owner.photos), default=-1) + 1
    for f in request.files.getlist('photos'):
        if not f or not f.filename:
            continue
        try:
            path = upload_service.save_photo(f, app.static_folder, app.static_url_path or '/static', folder=folder)
            owner.photos.append(photo_model(path=path, position=next_pos))
            next_pos += 1
        except upload_service.UploadError as e:
            errors.append(str(e))
    return errors


def _apply_photo_edits(owner, form, stale):
    """Apply the photo manager's removals and drag-and-drop order."""
    remove_ids = {int(x) for x in form.getlist('remove_photos') if x.isdigit()}
    for photo in list(owner.photos):
        if photo.id in remove_ids:
            stale.append(photo.path)
            owner.photos.remove(photo)

    # Order arrives as "id,id,id".
    order = [int(x) for x in form.get('photo_order', '').split(',') if x.isdigit()]
    rank = {pid: i for i, pid in enumerate(order)}
    for photo in owner.photos:
        photo.position = rank.get(photo.id, len(rank) + photo.position)


def _delete_files(paths):
    for path in paths:
        upload_service.delete_upload(path, app.static_folder, app.static_url_path or '/static')


def _answer_columns(records, questions=()):
    """One CSV column per question, including ones since removed from the form."""
    columns = {q.id: q.label for q in questions}
    for record in records:
        for answer in record.answers or []:
            columns.setdefault(answer['question_id'], answer['label'])
    return columns


def _answer_cells(record, columns):
    answers = {a['question_id']: a['value'] for a in (record.answers or [])} if record else {}
    cells = []
    for key in columns:
        value = answers.get(key, '')
        cells.append('; '.join(value) if isinstance(value, list) else value)
    return cells


def _csv_response(header, rows, filename):
    def safe(value):
        # Names come from the public: stop spreadsheets running them as formulas.
        text = '' if value is None else str(value)
        return "'" + text if text[:1] in ('=', '+', '-', '@', '\t', '\r') else text

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    for row in rows:
        writer.writerow([safe(v) for v in row])
    # BOM so Excel reads Azerbaijani letters correctly.
    return Response('\ufeff' + buf.getvalue(), mimetype='text/csv', headers={
        'Content-Disposition': f'attachment; filename={filename}'
    })


def _apply_story_uploads(story, stale):
    """Save avatar/photos from the request onto `story`.

    Replaced files are appended to `stale` so the caller can delete them once
    the database commit has succeeded. Returns a list of error strings.
    """
    errors = []
    static = app.static_folder
    url_base = app.static_url_path or '/static'

    avatar = request.files.get('avatar')
    if avatar and avatar.filename:
        try:
            new_path = upload_service.save_avatar(avatar, static, url_base)
            if story.avatar_path:
                stale.append(story.avatar_path)
            story.avatar_path = new_path
        except upload_service.UploadError as e:
            errors.append(str(e))

    errors.extend(_add_uploaded_photos(story, StoryPhoto, 'stories'))
    return errors


def _story_admin_context(**extra):
    return {
        'unread_count': ContactMessage.query.filter_by(is_read=False).count(),
        'programs': STORY_PROGRAMS,
        **extra,
    }


@app.route('/admin/stories')
@admin_required
def list_stories():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '').strip()

    query = Story.query
    if search:
        query = query.filter(
            Story.title.ilike(f'%{search}%') | Story.author_name.ilike(f'%{search}%')
        )
    items = query.order_by(Story.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    return render_template('admin/stories/list.html', **_story_admin_context(items=items, search=search))


@app.route('/admin/stories/add', methods=['GET', 'POST'])
@admin_required
def add_story():
    if request.method == 'POST':
        form = request.form
        errors = _story_form_errors(form)
        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('admin/stories/form.html', **_story_admin_context(story=None, form=form))

        title = form['title'].strip()
        story = Story(
            title=title,
            slug=unique_story_slug(title),
            author_name=form['author_name'].strip(),
            author_info=form.get('author_info', '').strip() or None,
            program=form.get('program', '').strip() or None,
            content=form['content'].strip(),
            is_published='is_published' in form,
        )
        upload_errors = _apply_story_uploads(story, stale=[])
        db.session.add(story)
        db.session.commit()

        for e in upload_errors:
            flash(e, 'error')
        flash('Story created.', 'success')
        return redirect(url_for('edit_story', id=story.id) if upload_errors else url_for('list_stories'))

    return render_template('admin/stories/form.html', **_story_admin_context(story=None, form={}))


@app.route('/admin/stories/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_story(id):
    story = Story.query.get_or_404(id)

    if request.method == 'POST':
        form = request.form
        errors = _story_form_errors(form)
        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('admin/stories/form.html', **_story_admin_context(story=story, form=form))

        title = form['title'].strip()
        if title != story.title:
            story.slug = unique_story_slug(title, exclude_id=story.id)
        story.title = title
        story.author_name = form['author_name'].strip()
        story.author_info = form.get('author_info', '').strip() or None
        story.program = form.get('program', '').strip() or None
        story.content = form['content'].strip()
        story.is_published = 'is_published' in form

        stale = []
        if form.get('remove_avatar') and story.avatar_path:
            stale.append(story.avatar_path)
            story.avatar_path = None

        _apply_photo_edits(story, form, stale)

        upload_errors = _apply_story_uploads(story, stale)
        db.session.commit()
        for path in stale:
            upload_service.delete_upload(path, app.static_folder, app.static_url_path or '/static')

        for e in upload_errors:
            flash(e, 'error')
        flash('Story updated.', 'success')
        return redirect(url_for('edit_story', id=story.id) if upload_errors else url_for('list_stories'))

    return render_template('admin/stories/form.html', **_story_admin_context(story=story, form={}))


@app.route('/admin/stories/delete/<int:id>', methods=['POST'])
@admin_required
def delete_story(id):
    story = Story.query.get_or_404(id)
    static, url_base = app.static_folder, app.static_url_path or '/static'
    paths = [story.avatar_path] + [p.path for p in story.photos]
    db.session.delete(story)
    db.session.commit()
    for path in paths:
        upload_service.delete_upload(path, static, url_base)
    flash('Story deleted.', 'success')
    return redirect(url_for('list_stories'))


@app.errorhandler(413)
def upload_too_large(_e):
    if request.path.startswith('/admin/'):
        flash('The upload is too large (80 MB max per save). Add the photos in smaller batches.', 'error')
        return redirect(request.path)
    return jsonify({'error': 'payload_too_large'}), 413


@app.route('/stories')
def stories_page():
    return serve_spa()


@app.route('/stories/<string:slug>')
def story_page(slug):
    return serve_spa()


@app.route('/admin/members')
@admin_required
def list_members():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    vip_filter = request.args.get('vip', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = User.query.filter_by(is_admin=False, deleted_at=None)
    if search:
        query = query.filter(
            (User.full_name.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%')) |
            (User.phone.ilike(f'%{search}%'))
        )
    if vip_filter == 'active':
        query = query.filter(User.vip_status == 'active')
    elif vip_filter == 'pending':
        query = query.filter(User.vip_status == 'pending')
    elif vip_filter == 'staff':
        query = query.filter(User.is_staff_member == True)  # noqa: E712
    elif vip_filter == 'none':
        query = query.filter(User.vip_status.in_(['none', 'revoked']), User.is_staff_member == False)  # noqa: E712

    members = query.order_by(User.created_at.desc()).paginate(page=page, per_page=10, error_out=False)

    return render_template('admin/members/list.html',
                         members=members, search=search, vip_filter=vip_filter,
                         unread_count=unread_count)


@app.route('/admin/members/<int:id>')
@admin_required
def view_member(id):
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    return _render_member_detail(member)


def _render_member_detail(member, temp_password=None):
    payments = Payment.query.filter_by(user_id=member.id).order_by(Payment.created_at.desc()).all()
    attendances = (
        Attendance.query.filter_by(user_id=member.id)
        .order_by(Attendance.checked_in_at.desc()).all()
    )
    return render_template('admin/members/detail.html',
                         member=member, payments=payments, attendances=attendances,
                         temp_password=temp_password,
                         genders=GENDERS, occupations=OCCUPATIONS, education_levels=EDUCATION_LEVELS,
                         experience_kinds=EXPERIENCE_KINDS, language_levels=LANGUAGE_LEVELS, interests=INTERESTS)


@app.route('/admin/members/<int:id>/verify-email', methods=['POST'])
@admin_required
def verify_member_email(id):
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    if not member.email_verified_at:
        verification.mark_verified(member)
        db.session.commit()
        flash('Email marked as confirmed.', 'success')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/members/<int:id>/delete', methods=['POST'])
@admin_required
@limiter.limit('20 per minute')
def delete_member(id):
    # Admin accounts are excluded by the query.
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    if request.form.get('confirm_word', '').strip() != 'DELETE':
        flash('Account not deleted: type DELETE to confirm.', 'danger')
        return redirect(url_for('view_member', id=member.id))
    name = member.display_name
    accounts.erase(member)
    db.session.commit()
    flash(f'{name}: account deleted.', 'success')
    return redirect(url_for('list_members'))


@app.route('/admin/members/<int:id>/reset-password', methods=['POST'])
@admin_required
@limiter.limit('20 per minute')
def reset_member_password(id):
    # Admin accounts are excluded: they change their own password in Settings.
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    temp_password = secrets.token_urlsafe(9)
    member.set_password_hash(generate_password_hash(temp_password))
    member.must_change_password = True
    db.session.commit()
    # Rendered here, not flashed: flash messages live in the session cookie.
    return Response(_render_member_detail(member, temp_password), headers={'Cache-Control': 'no-store'})


@app.route('/admin/members/<int:id>/vip/activate', methods=['POST'])
@admin_required
def activate_member_vip(id):
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    note = request.form.get('note', '').strip() or None

    pending_payment = Payment.query.filter_by(user_id=member.id, status='pending').order_by(Payment.created_at.desc()).first()
    if pending_payment:
        vip_service.confirm_payment(pending_payment, current_user, note=note)
    else:
        payment = Payment(
            user_id=member.id, amount=vip_service.VIP_FEE_AMOUNT,
            currency=vip_service.VIP_FEE_CURRENCY, method='manual',
            provider='manual', status='pending',
        )
        db.session.add(payment)
        db.session.flush()
        vip_service.confirm_payment(payment, current_user, note=note)

    db.session.commit()
    flash(f'VIP membership activated for {member.display_name}.', 'success')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/members/<int:id>/vip/deactivate', methods=['POST'])
@admin_required
def deactivate_member_vip(id):
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    vip_service.revoke_vip(member)
    db.session.commit()
    flash(f'VIP membership deactivated for {member.display_name}.', 'info')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/members/<int:id>/vip/regenerate-qr', methods=['POST'])
@admin_required
def regenerate_member_qr(id):
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    vip_service.regenerate_qr_token(member)
    db.session.commit()
    flash('A new QR code has been issued. The old card will no longer work.', 'success')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/members/<int:id>/staff', methods=['POST'])
@admin_required
def set_member_staff(id):
    member = User.query.filter_by(id=id, is_admin=False, deleted_at=None).first_or_404()
    member.is_staff_member = request.form.get('is_staff') == '1'
    db.session.commit()
    flash(f'{member.display_name} now has the {member.card_label} card.', 'success')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/vip-requests')
@admin_required
def list_vip_requests():
    unread_count = ContactMessage.query.filter_by(is_read=False).count()
    pending_payments = (
        Payment.query.filter_by(status='pending')
        .order_by(Payment.created_at.asc()).all()
    )
    return render_template('admin/vip_requests/list.html',
                         pending_payments=pending_payments, unread_count=unread_count)


@app.route('/admin/vip-requests/<int:payment_id>/confirm', methods=['POST'])
@admin_required
def confirm_vip_payment(payment_id):
    payment = Payment.query.get_or_404(payment_id)
    note = request.form.get('note', '').strip() or None
    member = vip_service.confirm_payment(payment, current_user, note=note)
    db.session.commit()
    flash(f'Payment confirmed and VIP membership activated for {member.display_name}.', 'success')
    return redirect(url_for('list_vip_requests'))


@app.route('/admin/vip-requests/<int:payment_id>/reject', methods=['POST'])
@admin_required
def reject_vip_payment(payment_id):
    payment = Payment.query.get_or_404(payment_id)
    note = request.form.get('note', '').strip() or None
    vip_service.reject_payment(payment, note=note)
    db.session.commit()
    flash('VIP request rejected.', 'info')
    return redirect(url_for('list_vip_requests'))

# ══════════════════════════════════════════════════════════════
# ADMIN — EVENTS & QR CHECK-IN
# ══════════════════════════════════════════════════════════════

@app.route('/admin/events')
@admin_required
def list_events():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = Event.query
    if search:
        query = query.filter(Event.name.ilike(f'%{search}%'))

    items = query.order_by(Event.starts_at.desc().nullslast(), Event.created_at.desc()).paginate(page=page, per_page=10, error_out=False)

    return render_template('admin/events/list.html', items=items, search=search, unread_count=unread_count)


def _event_form_errors(form):
    errors = []
    if not form.get('name', '').strip():
        errors.append('Please enter an event name.')
    capacity = form.get('capacity', '').strip()
    if capacity and (not capacity.isdigit() or int(capacity) < 1):
        errors.append('The seat limit must be a positive number, or empty for no limit.')
    return errors


def _apply_event_form(event, form, stale):
    event.name = form['name'].strip()
    event.description = form.get('description', '').strip() or None
    event.location = form.get('location', '').strip() or None
    try:
        event.starts_at = datetime.strptime(form.get('starts_at', ''), '%Y-%m-%dT%H:%M')
    except ValueError:
        event.starts_at = None
    capacity = form.get('capacity', '').strip()
    event.capacity = int(capacity) if capacity else None
    event.is_public = 'is_public' in form
    event.is_active = 'is_active' in form

    poster = request.files.get('poster')
    if poster and poster.filename:
        try:
            new_path = upload_service.save_photo(
                poster, app.static_folder, app.static_url_path or '/static', folder='events', kind='posters'
            )
            if event.poster_path:
                stale.append(event.poster_path)
            event.poster_path = new_path
        except upload_service.UploadError as e:
            return [str(e)]
    elif form.get('remove_poster') and event.poster_path:
        stale.append(event.poster_path)
        event.poster_path = None
    return []


@app.route('/admin/events/add', methods=['GET', 'POST'])
@admin_required
def add_event():
    if request.method == 'POST':
        errors = _event_form_errors(request.form)
        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('admin/events/form.html', event=None, form=request.form)

        event = Event()
        upload_errors = _apply_event_form(event, request.form, stale=[])
        db.session.add(event)
        db.session.commit()
        for e in upload_errors:
            flash(e, 'error')
        if upload_errors:
            flash('Event created.', 'success')
            return redirect(url_for('edit_event', id=event.id))
        flash('Event created. Now add the questions people answer to apply.', 'success')
        return redirect(url_for('event_form', id=event.id))

    return render_template('admin/events/form.html', event=None, form={})


@app.route('/admin/events/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_event(id):
    event = Event.query.get_or_404(id)

    if request.method == 'POST':
        errors = _event_form_errors(request.form)
        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('admin/events/form.html', event=event, form=request.form)

        stale = []
        upload_errors = _apply_event_form(event, request.form, stale)
        db.session.commit()
        _delete_files(stale)
        for e in upload_errors:
            flash(e, 'error')
        flash('Event updated.', 'success')
        return redirect(url_for('event_attendance', id=event.id))

    return render_template('admin/events/form.html', event=event, form={})


@app.route('/admin/events/delete/<int:id>', methods=['POST'])
@admin_required
def delete_event(id):
    event = Event.query.get_or_404(id)
    poster = event.poster_path
    db.session.delete(event)
    db.session.commit()
    _delete_files([poster])
    flash('Event deleted.', 'success')
    return redirect(url_for('list_events'))


def _event_people(event):
    """Everyone who applied or checked in, as (user, registration, attendance) rows."""
    checked_in = {a.user_id: a for a in event.attendances}
    people = [(r.user, r, checked_in.pop(r.user_id, None)) for r in event.registrations]
    # Whoever is left walked in without applying.
    people += [(a.user, None, a) for a in checked_in.values()]
    return people


@app.route('/admin/events/<int:id>/attendance')
@admin_required
def event_attendance(id):
    event = Event.query.get_or_404(id)
    status = request.args.get('status', '')
    people = _event_people(event)
    shown = [row for row in people if row[1] and row[1].status == status] if status else people
    return render_template(
        'admin/events/attendance.html', event=event, people=shown, status=status, all_count=len(people),
    )


def _form_builder(owner, question_class, **page):
    """The question builder page, shared by events and projects."""
    if request.method == 'POST':
        try:
            submitted = json.loads(request.form.get('questions_json') or '[]')
        except ValueError:
            submitted = None
        rows, errors = registration_service.clean_questions(submitted)
        if not errors:
            registration_service.apply_questions(owner, question_class, rows)
            db.session.commit()
            flash('Form saved.', 'success')
            return redirect(request.path)
        for error in errors:
            flash(error, 'error')
        # Keep what they typed.
        questions = submitted if isinstance(submitted, list) else []
    else:
        questions = [{
            'id': q.id, 'label': q.label, 'help_text': q.help_text, 'kind': q.kind,
            'required': q.required, 'options': q.options,
        } for q in owner.questions]
    return render_template('admin/form_builder.html', questions=questions, kinds=QUESTION_KINDS, **page)


@app.route('/admin/events/<int:id>/form', methods=['GET', 'POST'])
@admin_required
def event_form(id):
    event = Event.query.get_or_404(id)
    return _form_builder(
        event, EventQuestion, owner_name=event.name,
        back_url=url_for('event_attendance', id=event.id), back_label='Registered people',
        view_url=f'/events/{event.id}' if event.is_public else None, has_responses=bool(event.registrations),
        empty_note='Applications stay closed until this event has at least one question.',
    )


@app.route('/admin/projects/<int:id>/form', methods=['GET', 'POST'])
@admin_required
def project_form(id):
    project = Opportunity.query.get_or_404(id)
    return _form_builder(
        project, ProjectQuestion, owner_name=project.title,
        back_url=url_for('list_applications', project=project.id), back_label='Applications',
        view_url=f'/projects/{project.id}' if project.is_active else None, has_responses=bool(project.applications),
        empty_note='Without questions, people see the standard form: date of birth, city, English level, motivation and CV link.',
    )


@app.route('/admin/events/<int:event_id>/registrations/<int:id>', methods=['GET', 'POST'])
@admin_required
def event_registration(event_id, id):
    registration = EventRegistration.query.filter_by(id=id, event_id=event_id).first_or_404()
    event = registration.event
    if request.method == 'POST':
        decision = request.form.get('decision')
        if decision not in registration_service.DECISIONS:
            abort(400)
        note = request.form.get('note', '').strip()[:1000]
        site_url = os.environ.get('SITE_URL') or request.url_root
        try:
            changed = registration_service.decide(registration, decision, note, current_user, site_url)
        except registration_service.EventFull:
            flash('All seats are taken. Raise the seat limit or free a seat first.', 'error')
            return redirect(url_for('event_registration', event_id=event_id, id=id))
        if changed and registration.email_status == 'failed':
            flash('Decision saved, but the email could not be sent. The member can still see it on their account page.', 'error')
        elif changed:
            flash(f'{"Approved" if decision == "approved" else "Rejected"}. The member has been told.', 'success')
        return redirect(url_for('event_attendance', id=event_id, status='pending' if event.pending_count else None))
    return render_template('admin/events/registration.html', event=event, registration=registration)


@app.route('/admin/events/<int:id>/attendance/export.csv')
@admin_required
def export_event_attendance(id):
    event = Event.query.get_or_404(id)
    people = _event_people(event)

    columns = _answer_columns([row[1] for row in people if row[1]], event.questions)

    rows = []
    for u, registration, attendance in people:
        rows.append([
            u.membership_no, u.card_label, u.full_name, u.email, u.phone,
            registration.status if registration else 'walk-in',
            registration.created_at.strftime('%Y-%m-%d %H:%M') if registration and registration.created_at else '',
            attendance.checked_in_at.strftime('%Y-%m-%d %H:%M') if attendance and attendance.checked_in_at else '',
        ] + _answer_cells(registration, columns))
    return _csv_response(
        ['Membership No', 'Card', 'Full Name', 'Email', 'Phone', 'Status', 'Applied At (UTC)', 'Checked In At (UTC)']
        + list(columns.values()),
        rows, f'event-{event.id}-applications.csv',
    )


@app.route('/admin/scanner')
@admin_required
def scanner():
    unread_count = ContactMessage.query.filter_by(is_read=False).count()
    events = Event.query.filter_by(is_active=True).order_by(Event.starts_at.desc().nullslast()).all()
    return render_template('admin/scanner.html', events=events, unread_count=unread_count)


@app.route('/admin/scanner/checkin', methods=['POST'])
@admin_required
def scanner_checkin():
    data = request.get_json(silent=True) or {}
    event_id = data.get('event_id')
    code = data.get('code', '')

    event = Event.query.get(event_id) if event_id else None
    if not event:
        return jsonify({'status': 'invalid', 'message': 'No event selected.'}), 400

    status, payload = checkin_service.check_in(event, code, current_user, override=data.get('override') is True)

    if status == 'not_approved':
        db.session.rollback()
        member, registration = payload
        reasons = {'pending': 'Application still waiting', 'rejected': 'Application rejected'}
        return jsonify({
            'status': status,
            'name': member.display_name,
            'membership_no': member.membership_no,
            'card': member.card_label,
            'reason': reasons.get(registration.status, 'Not approved') if registration else 'Did not apply',
        })

    if status in ('ok', 'duplicate'):
        member = payload.user
        registered = EventRegistration.query.filter_by(event_id=event.id, user_id=member.id, status='approved').first() is not None
        result = {
            'status': status,
            'name': member.display_name,
            'membership_no': member.membership_no,
            'card': member.card_label,
            'card_type': member.card_type,
            'registered': registered,
            'time': payload.checked_in_at.strftime('%H:%M'),
        }
        if status == 'ok':
            db.session.commit()
        else:
            db.session.rollback()
        return jsonify(result)

    db.session.rollback()
    return jsonify({'status': 'invalid', 'message': 'This QR code was not recognized.'})

# ══════════════════════════════════════════════════════════════
# JSON API ENDPOINTS (for React SPA)
# ══════════════════════════════════════════════════════════════

@app.route('/api/home')
def api_home():
    opportunities = Opportunity.query.filter_by(is_active=True).order_by(Opportunity.created_at.desc()).limit(6).all()
    news = News.query.filter_by(is_published=True).order_by(News.created_at.desc()).limit(3).all()
    stories = Story.query.filter_by(is_published=True).order_by(Story.created_at.desc()).limit(6).all()

    return jsonify({
        'opportunities': [{
            'id': o.id,
            'title': o.title,
            'description': o.description,
            'requirements': o.requirements,
            'location': o.location or 'Remote',
            'deadline': o.deadline.isoformat() if o.deadline else None,
            'keyword_image': o.keyword_image,
            'view_count': o.view_count or 0,
            'tags': [t.name for t in o.tags],
            'created_at': o.created_at.isoformat() if o.created_at else None,
        } for o in opportunities],
        'news': [{
            'id': n.id,
            'title': n.title,
            'content': n.content,
            'image_url': n.image_url,
            'keyword_image': n.keyword_image,
            'cover_image': (get_news_album_images(n.keyword_image) or [n.image_url])[0] if n.keyword_image or n.image_url else None,
            'view_count': n.view_count or 0,
            'created_at': n.created_at.isoformat() if n.created_at else None,
        } for n in news],
        'stories': [story_card(st) for st in stories],
    })


def project_cover(o):
    if o.poster_path:
        return o.poster_path
    return f'{app.static_url_path or "/static"}/esc/{o.keyword_image}' if o.keyword_image else None


def project_to_dict(o):
    return {
        'id': o.id,
        'title': o.title,
        'description': o.description,
        'requirements': o.requirements,
        'location': o.location or 'Remote',
        'start_date': o.start_date.isoformat() if o.start_date else None,
        'end_date': o.end_date.isoformat() if o.end_date else None,
        'deadline': o.deadline.isoformat() if o.deadline else None,
        'phase': o.phase,
        'accepts_applications': o.accepts_applications,
        'requires_profile': o.requires_profile,
        'has_form': o.has_form,
        'deadline_passed': o.deadline_passed,
        'applications_open': o.applications_open,
        'poster': project_cover(o),
        'view_count': o.view_count or 0,
        'tags': [t.name for t in o.tags],
        'created_at': o.created_at.isoformat() if o.created_at else None,
    }


@app.route('/api/projects')
def api_projects():
    search_query = request.args.get('search', '').strip()
    phase = request.args.get('phase', 'present')
    page = request.args.get('page', 1, type=int)

    today = az_now_naive().date()
    finished = or_(
        Opportunity.status_mode == 'finished',
        and_(Opportunity.status_mode == 'auto', Opportunity.end_date != None, Opportunity.end_date < today),  # noqa: E711
    )
    query = Opportunity.query.filter(Opportunity.is_active == True)  # noqa: E712
    if phase == 'finished':
        query = query.filter(finished).order_by(Opportunity.end_date.desc().nullslast(), Opportunity.created_at.desc())
    else:
        query = query.filter(~finished).order_by(Opportunity.created_at.desc())

    if search_query:
        like = f'%{search_query}%'
        query = query.filter(
            Opportunity.title.ilike(like) | Opportunity.location.ilike(like) | Opportunity.description.ilike(like)
        )

    pagination = query.paginate(page=page, per_page=9, error_out=False)
    return jsonify({
        'items': [project_to_dict(o) for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    })


@app.route('/api/projects/<int:id>')
def api_project(id):
    o = db.session.get(Opportunity, id)
    if not o or not o.is_active:
        return jsonify({'error': 'Not found'}), 404

    o.view_count = (o.view_count or 0) + 1
    db.session.commit()

    mine = None
    if current_user.is_authenticated:
        mine = Application.query.filter_by(user_id=current_user.id, opportunity_id=o.id).first()
    return jsonify({
        **project_to_dict(o),
        'photos': [p.path for p in o.photos],
        'questions': [{
            'id': q.id, 'label': q.label, 'help_text': q.help_text, 'kind': q.kind,
            'required': q.required, 'options': q.options or [],
        } for q in o.questions],
        'my_application': _my_application(mine) if mine else None,
    })


def _my_application(a):
    return {
        'status': a.status,
        'applied_at': a.applied_at.isoformat() if a.applied_at else None,
        # A team note stays with the team: only the message to the applicant goes out.
        'note': a.decision_note,
        'answers': a.answers or [],
    }


def _save_application(application):
    db.session.add(application)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'You have already applied to this project.'}), 409
    return jsonify({'my_application': _my_application(application)}), 201


ENGLISH_LEVELS = ('Basic', 'Intermediate', 'Advanced', 'Fluent')


@app.route('/api/projects/<int:id>/apply', methods=['POST'])
@login_required
@verified_email_required
@limiter.limit('10 per minute')
def api_project_apply(id):
    project = db.session.get(Opportunity, id)
    if not project or not project.is_active:
        return jsonify({'error': 'Not found'}), 404
    if not project.applications_open:
        return jsonify({'error': 'Applications for this project are closed.'}), 400
    if project.requires_profile and not current_user.profile_complete:
        return jsonify({'error': 'Please complete your profile before applying.'}), 403

    data = request.get_json(silent=True) or {}
    if project.has_form:
        answers, answer_errors = registration_service.clean_answers(project, data.get('answers'))
        if answer_errors:
            return jsonify({'error': 'Please check the highlighted answers.', 'errors': answer_errors}), 400
        return _save_application(Application(
            user_id=current_user.id, opportunity_id=project.id, full_name=current_user.full_name,
            email=current_user.email, phone=current_user.phone, answers=answers,
        ))

    field = lambda name: str(data.get(name) or '').strip()  # noqa: E731
    full_name, email, phone = field('full_name'), field('email').lower(), field('phone')
    residence, motivation, cv_link = field('residence'), field('motivation'), field('cv_link')
    english_level = field('english_level')
    birth_date = _parse_date(field('birth_date'))

    errors = []
    if not full_name or len(full_name) > 150:
        errors.append('Please enter your full name.')
    if not EMAIL_RE.match(email) or len(email) > 150:
        errors.append('Please enter a valid email address.')
    if not phone or len(phone) > 30:
        errors.append('Please enter your phone number.')
    if not birth_date or birth_date >= date.today():
        errors.append('Please enter your date of birth.')
    if not residence or len(residence) > 150:
        errors.append('Please enter where you live.')
    if english_level not in ENGLISH_LEVELS:
        errors.append('Please choose your English level.')
    if len(motivation) < 30:
        errors.append('Please tell us a little more about your motivation (at least 30 characters).')
    if len(motivation) > 5000:
        errors.append('Your motivation text is too long (5000 characters at most).')
    if cv_link and (len(cv_link) > 500 or not re.match(r'^https?://\S+$', cv_link)):
        errors.append('The CV link must start with http:// or https://.')
    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    return _save_application(Application(
        user_id=current_user.id, opportunity_id=project.id, full_name=full_name, email=email, phone=phone,
        birth_date=birth_date, residence=residence, english_level=english_level, motivation=motivation,
        cv_link=cv_link or None,
    ))


# ---- public events api ----

def event_to_dict(e):
    return {
        'id': e.id,
        'name': e.name,
        'description': e.description,
        'location': e.location,
        'starts_at': e.starts_at.isoformat() if e.starts_at else None,
        'poster': e.poster_path,
        'capacity': e.capacity,
        'spots_left': e.spots_left,
        'has_started': e.has_started,
        'registration_open': e.registration_open,
    }


def _registration_to_dict(r):
    return {
        'status': r.status,
        'submitted_at': r.created_at.isoformat() if r.created_at else None,
        'decided_at': r.decided_at.isoformat() if r.decided_at else None,
        'note': r.decision_note,
        'answers': r.answers or [],
    }


def event_detail(e):
    registration = current_user.is_authenticated and EventRegistration.query.filter_by(
        event_id=e.id, user_id=current_user.id
    ).first()
    return {
        **event_to_dict(e),
        'registration': _registration_to_dict(registration) if registration else None,
        'email_notifications': mail_service.is_configured(),
        'questions': [{
            'id': q.id, 'label': q.label, 'help_text': q.help_text, 'kind': q.kind,
            'required': q.required, 'options': q.options or [],
        } for q in e.questions],
    }


@app.route('/api/events')
def api_events():
    when = request.args.get('when', 'upcoming')
    page = request.args.get('page', 1, type=int)
    now = az_now_naive()

    query = Event.query.filter(Event.is_public == True)  # noqa: E712
    if when == 'past':
        query = query.filter(Event.starts_at != None, Event.starts_at <= now).order_by(Event.starts_at.desc())  # noqa: E711
    else:
        query = query.filter(or_(Event.starts_at == None, Event.starts_at > now)).order_by(Event.starts_at.asc().nullslast())  # noqa: E711

    pagination = query.paginate(page=page, per_page=9, error_out=False)
    return jsonify({
        'items': [event_to_dict(e) for e in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    })


def _public_event_or_none(id):
    event = db.session.get(Event, id)
    return event if event and event.is_public else None


@app.route('/api/events/<int:id>')
def api_event(id):
    event = _public_event_or_none(id)
    if not event:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(event_detail(event))


@app.route('/api/events/<int:id>/register', methods=['POST'])
@login_required
@verified_email_required
@limiter.limit('20 per minute')
def api_event_register(id):
    event = _public_event_or_none(id)
    if not event:
        return jsonify({'error': 'Not found'}), 404

    if EventRegistration.query.filter_by(event_id=event.id, user_id=current_user.id).first():
        return jsonify(event_detail(event))
    if event.has_started:
        return jsonify({'error': 'This event has already started.'}), 400
    if event.spots_left == 0:
        return jsonify({'error': 'This event is full.'}), 400
    if not event.registration_open:
        return jsonify({'error': 'Applications for this event are not open yet.'}), 400

    data = request.get_json(silent=True) or {}
    answers, errors = registration_service.clean_answers(event, data.get('answers'))
    if errors:
        return jsonify({'error': 'Please check the highlighted answers.', 'errors': errors}), 400

    db.session.add(EventRegistration(event_id=event.id, user_id=current_user.id, answers=answers))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()  # a double tap: already applied
    db.session.refresh(event)
    return jsonify(event_detail(event)), 201


@app.route('/api/events/<int:id>/unregister', methods=['POST'])
@login_required
def api_event_unregister(id):
    event = _public_event_or_none(id)
    if not event:
        return jsonify({'error': 'Not found'}), 404
    if event.has_started:
        return jsonify({'error': 'This event has already started.'}), 400

    registration = EventRegistration.query.filter_by(event_id=event.id, user_id=current_user.id).first()
    if registration:
        # Otherwise a rejected applicant could withdraw and apply again.
        if registration.status == 'rejected':
            return jsonify({'error': 'This application has already been decided.'}), 400
        db.session.delete(registration)
        db.session.commit()
        db.session.refresh(event)
    return jsonify(event_detail(event))


@app.route('/api/news')
def api_news():
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort', 'newest')
    page = request.args.get('page', 1, type=int)
    per_page = 9

    query = News.query.filter_by(is_published=True)

    if search_query:
        query = query.filter(
            (News.title.ilike(f'%{search_query}%')) |
            (News.content.ilike(f'%{search_query}%'))
        )

    if sort_by == 'alphabetical':
        query = query.order_by(News.title.asc())
    elif sort_by == 'oldest':
        query = query.order_by(News.created_at.asc())
    else:
        query = query.order_by(News.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    items = []
    for n in pagination.items:
        album = get_news_album_images(getattr(n, 'keyword_image', None))
        items.append({
            'id': n.id,
            'title': n.title,
            'content': n.content,
            'image_url': n.image_url,
            'keyword_image': n.keyword_image,
            'cover_image': album[0] if album else n.image_url,
            'album_images': album,
            'view_count': n.view_count or 0,
            'created_at': n.created_at.isoformat() if n.created_at else None,
        })

    return jsonify({
        'items': items,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    })


@app.route('/api/news/<int:id>')
def api_news_detail(id):
    n = News.query.get_or_404(id)
    if not n.is_published:
        return jsonify({'error': 'Not found'}), 404

    n.view_count = (n.view_count or 0) + 1
    db.session.commit()

    album = get_news_album_images(getattr(n, 'keyword_image', None))

    related = News.query.filter(
        News.id != n.id, News.is_published == True
    ).order_by(News.created_at.desc()).limit(3).all()

    return jsonify({
        'id': n.id,
        'title': n.title,
        'content': n.content,
        'image_url': n.image_url,
        'cover_image': album[0] if album else n.image_url,
        'album_images': album,
        'view_count': n.view_count or 0,
        'created_at': n.created_at.isoformat() if n.created_at else None,
        'related': [{
            'id': r.id,
            'title': r.title,
            'cover_image': (get_news_album_images(r.keyword_image) or [r.image_url])[0] if r.keyword_image or r.image_url else None,
            'created_at': r.created_at.isoformat() if r.created_at else None,
        } for r in related],
    })


def story_card(st):
    plain = re.sub(r'\s+', ' ', st.content).strip()
    return {
        'id': st.id,
        'slug': st.slug,
        'title': st.title,
        'excerpt': plain[:220] + ('…' if len(plain) > 220 else ''),
        'author_name': st.author_name,
        'author_info': st.author_info,
        'program': st.program,
        'avatar': st.avatar_path,
        'cover_image': st.photos[0].path if st.photos else None,
        'photo_count': len(st.photos),
        'created_at': st.created_at.isoformat() if st.created_at else None,
    }


@app.route('/api/stories')
def api_stories():
    search_query = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)

    query = Story.query.filter_by(is_published=True)
    if search_query:
        like = f'%{search_query}%'
        query = query.filter(
            Story.title.ilike(like) | Story.content.ilike(like) |
            Story.author_name.ilike(like) | Story.program.ilike(like)
        )

    pagination = query.order_by(Story.created_at.desc()).paginate(page=page, per_page=9, error_out=False)

    return jsonify({
        'items': [story_card(st) for st in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    })


@app.route('/api/stories/<string:slug>')
def api_story(slug):
    st = Story.query.filter_by(slug=slug, is_published=True).first()
    if not st:
        return jsonify({'error': 'Not found'}), 404

    st.view_count = (st.view_count or 0) + 1
    db.session.commit()

    related = Story.query.filter(
        Story.id != st.id, Story.is_published == True  # noqa: E712
    ).order_by(Story.created_at.desc()).limit(3).all()

    return jsonify({
        **story_card(st),
        'content': st.content,
        'photos': [p.path for p in st.photos],
        'view_count': st.view_count,
        'related': [story_card(r) for r in related],
    })


@app.route('/api/contact', methods=['POST'])
@limiter.limit('5 per minute')
def api_contact():
    if bot_check.problem(request.form):
        return jsonify({'status': 'error', 'message': 'Please wait a moment and try again.'}), 400

    name = request.form.get('name', '').strip()[:100]
    email = request.form.get('email', '').strip()[:120]
    message = request.form.get('message', '').strip()[:5000]

    if not all([name, email, message]):
        return jsonify({'status': 'error', 'message': 'Please fill in all fields.'}), 400
    if not EMAIL_RE.match(email):
        return jsonify({'status': 'error', 'message': 'Please enter a valid email address.'}), 400

    try:
        db.session.add(ContactMessage(name=name, email=email, message=message))
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'An error occurred.'}), 500

    _tell_team_about_message(name, email, message)
    return jsonify({'status': 'success', 'message': 'Message sent successfully!'}), 200


def _tell_team_about_message(name, email, message):
    to = os.environ.get('CONTACT_NOTIFY_EMAIL')
    if not to:
        return
    # Reply-To lets the team answer the visitor directly. The visitor's text stays out of
    # the subject, and the mail only ever goes to our own address.
    body = f'Saytdan yeni mesaj / New message from the site\n\nAd: {name}\nEmail: {email}\n\n{message}'
    mail_service.send_later(to, 'IYDP: saytdan yeni mesaj / new site message', body, reply_to=email)


# ══════════════════════════════════════════════════════════════
# REACT SPA (built `dist/`) — catch-all for routes the explicit handlers
# above don't own (e.g. /login, /register, /account, /faq, /stories,
# /erasmus), and their static assets. Only active once `npm run build`
# has produced a dist/ folder; in local dev those routes are served by
# `npm run dev` (port 3000) instead, via its own proxy to this Flask app.
# ══════════════════════════════════════════════════════════════


@app.route('/<path:path>')
def spa_catch_all(path):
    if not os.path.isdir(DIST_DIR):
        abort(404)
    file_path = os.path.join(DIST_DIR, path)
    if os.path.isfile(file_path):
        # File names under assets/ change with their content, so they can be kept for good.
        if path.startswith('assets/'):
            response = send_from_directory(DIST_DIR, path, max_age=31536000)
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response
        return send_from_directory(DIST_DIR, path, max_age=86400)
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    # A missing script from an older build must fail as one, not arrive as a web page.
    if path.startswith('assets/'):
        abort(404)
    return serve_spa()


if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG', '0') == '1')
