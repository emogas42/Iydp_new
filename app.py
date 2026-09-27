import html
import io
import os
import re
import secrets
from datetime import datetime, timezone, timedelta
from functools import wraps

from dotenv import load_dotenv
from flask import (
    Flask, render_template, request, redirect, url_for, flash, session,
    jsonify, abort, Response, send_from_directory
)
from flask_login import (
    LoginManager, login_user, login_required, current_user, logout_user
)
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode
import qrcode.image.svg

from models import (
    db, User, ContactMessage, Opportunity, OpportunityTag, Application,
    News, BlogPost, Payment, Event, Attendance,
)
from services import vip as vip_service
from services import checkin as checkin_service

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'ceY<rA5a,82A')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'sqlite:///iydp.db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith('/api/'):
        return jsonify({'error': 'authentication_required'}), 401
    return redirect(url_for('login', next=request.path))

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

    return f"{day} {month}, {year} {hour:02d}:{minute:02d}"


@app.context_processor
def inject_now():
    return {'now': datetime.now()}


@app.context_processor
def inject_admin_counters():
    if current_user.is_authenticated and current_user.is_admin:
        return {'pending_vip_count': Payment.query.filter_by(status='pending').count()}
    return {}


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


with app.app_context():
    db.create_all()
    try:
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password=generate_password_hash('admin123'),
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
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
    opportunities = Opportunity.query.filter_by(is_active=True).order_by(Opportunity.created_at.desc()).all()
    news = News.query.filter_by(is_published=True).order_by(News.created_at.desc()).limit(3).all()
    posts = BlogPost.query.filter_by(is_published=True).order_by(BlogPost.created_at.desc()).limit(6).all()

    return render_template('index.html',
                         opportunities=opportunities,
                         news=news,
                         posts=posts)

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        raw_name = request.form.get('name', '')
        raw_email = request.form.get('email', '')
        raw_message = request.form.get('message', '')

        if not all([raw_name, raw_email, raw_message]):
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'status': 'error', 'message': 'Please fill in all fields.'}), 400
            flash('Please fill in all fields.', 'danger')
            return redirect(request.referrer or url_for('home'))

        clean_name = html.escape(raw_name)
        clean_email = html.escape(raw_email)
        clean_message = html.escape(raw_message)

        new_message = ContactMessage(
            name=clean_name,
            email=clean_email,
            message=clean_message
        )

        try:
            db.session.add(new_message)
            db.session.commit()

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'status': 'success', 'message': 'Message sent successfully!'}), 200

            flash('Message sent successfully!', 'success')
            return redirect((request.referrer or url_for('home')) + '#contact')

        except Exception as e:
            db.session.rollback()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'status': 'error', 'message': 'Database error.'}), 500
            flash('An error occurred.', 'danger')
            return redirect(request.referrer or url_for('home'))

    return render_template('contact.html')

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
        'is_vip': u.is_vip,
        'vip_status': u.vip_status,
        'membership_no': u.membership_no,
        'vip_requested_at': u.vip_requested_at.isoformat() if u.vip_requested_at else None,
        'vip_activated_at': u.vip_activated_at.isoformat() if u.vip_activated_at else None,
        'created_at': u.created_at.isoformat() if u.created_at else None,
    }


@app.route('/api/auth/register', methods=['POST'])
def api_register():
    if current_user.is_authenticated:
        return jsonify({'error': 'already_authenticated'}), 400

    data = request.get_json(silent=True) or request.form
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    errors = []
    if not full_name:
        errors.append('Ad və soyadınızı daxil edin.')
    if not EMAIL_RE.match(email):
        errors.append('Düzgün email ünvanı daxil edin.')
    if len(password) < 6:
        errors.append('Şifrə ən azı 6 simvoldan ibarət olmalıdır.')
    if password != confirm_password:
        errors.append('Şifrələr uyğun gəlmir.')
    if email and User.query.filter_by(email=email).first():
        errors.append('Bu email ilə artıq qeydiyyatdan keçilib.')

    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    username = email
    if User.query.filter_by(username=username).first():
        username = f'{email}.{secrets.token_hex(3)}'

    member = User(
        username=username,
        email=email,
        full_name=full_name,
        phone=phone,
        password=generate_password_hash(password),
        is_admin=False,
    )
    db.session.add(member)
    db.session.commit()

    login_user(member)
    return jsonify({'user': user_to_dict(member)}), 201


@app.route('/api/auth/login', methods=['POST'])
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
    })


@app.route('/api/vip/request', methods=['POST'])
@login_required
def api_request_vip():
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
    if not current_user.is_vip or current_user.vip_status != 'active' or not current_user.qr_token:
        abort(404)

    factory = qrcode.image.svg.SvgPathImage
    value = checkin_service.encode_qr_value(current_user)
    img = qrcode.make(value, image_factory=factory, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return Response(buf.getvalue(), mimetype='image/svg+xml', headers={
        'Cache-Control': 'no-store',
    })


@app.route('/admin/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            flash('Successfully logged in!', 'success')

            next_page = request.args.get('next')

            if not next_page or not next_page.startswith('/'):
                next_page = url_for('admin_dashboard')

            return redirect(next_page)
        else:
            flash('Invalid username or password', 'error')

    return render_template('admin/login.html')
@app.route('/admin/logout')
@login_required
def logout():
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

    total_members = User.query.filter_by(is_admin=False).count()
    total_vip = User.query.filter_by(is_vip=True, vip_status='active').count()
    pending_vip = Payment.query.filter_by(status='pending').count()
    total_events = Event.query.count()

    return render_template('admin/dashboard.html',
                         recent_news=recent_news,
                         recent_messages=recent_messages,
                         unread_count=unread_count,
                         total_messages=total_messages_count,
                         total_news=total_news_count,
                         total_members=total_members,
                         total_vip=total_vip,
                         pending_vip=pending_vip,
                         total_events=total_events)

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
    flash('Message deleted successfully!', 'success')
    return redirect(url_for('admin_dashboard'))
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

    messages = query.order_by(ContactMessage.created_at.desc()).paginate(page=page, per_page=5, error_out=False)

    return render_template('admin/messages/list.html',
                         messages=messages,
                         search=search,
                         unread_count=unread_count)
@app.route('/admin/opportunities')
@login_required
@admin_required
def list_opportunities():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = Opportunity.query
    if search:
        query = query.filter(Opportunity.title.ilike(f'%{search}%'))

    items = query.order_by(Opportunity.created_at.desc()).paginate(page=page, per_page=5, error_out=False)

    return render_template('admin/opportunities/list.html',
                         items=items,
                         search=search,
                         unread_count=unread_count)

@app.route('/admin/opportunities/add', methods=['GET', 'POST'])
@admin_required
def add_opportunity():
    if request.method == 'POST':
        try:
            title = request.form.get('title')
            description = request.form.get('description')
            requirements = request.form.get('requirements')
            location = request.form.get('location')
            deadline_str = request.form.get('deadline')
            is_active = 'is_active' in request.form

            deadline = None
            if deadline_str:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
                deadline = datetime.combine(deadline, datetime.max.time(), tzinfo=timezone.utc)

            opportunity = Opportunity(
                title=title,
                description=description,
                requirements=requirements,
                location=location,
                deadline=deadline,
                is_active=is_active
            )

            tags_str = request.form.get('tags', '').strip()
            if tags_str:
                tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
                for tag_name in tags:
                    tag = OpportunityTag(name=tag_name, opportunity=opportunity)
                    db.session.add(tag)

            db.session.add(opportunity)
            db.session.commit()

            flash('Opportunity added successfully!', 'success')
            return redirect(url_for('list_opportunities'))

        except Exception as e:
            db.session.rollback()
            flash(f'Error adding opportunity: {str(e)}', 'danger')

    unread_count = ContactMessage.query.filter_by(is_read=False).count()
    return render_template('admin/opportunities/add.html', unread_count=unread_count)

@app.route('/admin/opportunities/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_opportunity(id):
    opportunity = Opportunity.query.get_or_404(id)
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        try:
            deadline_str = request.form.get('deadline')
            deadline = None
            if deadline_str:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
                deadline = datetime.combine(deadline, datetime.max.time(), tzinfo=timezone.utc)

            opportunity.title = request.form['title']
            opportunity.description = request.form['description']
            opportunity.requirements = request.form.get('requirements')
            opportunity.location = request.form.get('location')
            opportunity.deadline = deadline
            opportunity.is_active = 'is_active' in request.form

            existing_tags = {tag.name for tag in opportunity.tags}
            new_tags_str = request.form.get('tags', '').strip()
            new_tags = {tag.strip() for tag in new_tags_str.split(',') if tag.strip()}

            for tag in list(opportunity.tags):
                if tag.name not in new_tags:
                    db.session.delete(tag)

            for tag_name in new_tags - existing_tags:
                tag = OpportunityTag(name=tag_name, opportunity=opportunity)
                db.session.add(tag)

            db.session.commit()
            flash('Opportunity updated successfully!', 'success')
            return redirect(url_for('list_opportunities'))

        except Exception as e:
            db.session.rollback()
            flash(f'Error updating opportunity: {str(e)}', 'danger')

    deadline = ''
    if opportunity.deadline:
        if opportunity.deadline.tzinfo:
            deadline = opportunity.deadline.astimezone(timezone.utc).strftime('%Y-%m-%d')
        else:
            deadline = opportunity.deadline.strftime('%Y-%m-%d')

    return render_template('admin/opportunities/edit.html',
                         opportunity=opportunity,
                         deadline=deadline,
                         unread_count=unread_count)

@app.route('/admin/opportunities/delete/<int:id>', methods=['POST'])
@admin_required
def delete_opportunity(id):
    opportunity = Opportunity.query.get_or_404(id)
    try:
        db.session.delete(opportunity)
        db.session.commit()
        flash('Opportunity deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting opportunity: {str(e)}', 'danger')
    return redirect(url_for('list_opportunities'))
@app.route('/opportunities')
def opportunities():
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort', 'newest')
    current_status = request.args.get('status', '')
    current_duration = request.args.get('duration', '')
    page = request.args.get('page', 1, type=int)
    per_page = 9
    now_ref = datetime.utcnow()
    query = Opportunity.query

    if search_query:
        query = query.filter(
            (Opportunity.title.ilike(f'%{search_query}%')) |
            (Opportunity.location.ilike(f'%{search_query}%'))
        )

    if current_status == 'active':
        query = query.filter(
            Opportunity.is_active == True,
            ((Opportunity.deadline == None) | (Opportunity.deadline >= now_ref))
        )
    elif current_status == 'closed':
        query = query.filter(
            (Opportunity.is_active == False) |
            ((Opportunity.deadline != None) & (Opportunity.deadline < now_ref))
        )
    else:
        query = query.filter(Opportunity.is_active == True)

    if current_duration == 'short':
        query = query.filter(
            (Opportunity.title.ilike('%short%')) |
            (Opportunity.description.ilike('%short%')) |
            Opportunity.tags.any(OpportunityTag.name.ilike('%short%'))
        )
    elif current_duration == 'long':
        query = query.filter(
            (Opportunity.title.ilike('%long%')) |
            (Opportunity.description.ilike('%long%')) |
            Opportunity.tags.any(OpportunityTag.name.ilike('%long%'))
        )

    if sort_by == 'alphabetical':
        query = query.order_by(Opportunity.title.asc())
    elif sort_by == 'deadline_soon':
        query = query.order_by(Opportunity.deadline.asc().nullslast())
    elif sort_by == 'oldest':
        query = query.order_by(Opportunity.created_at.asc())
    else:
        query = query.order_by(Opportunity.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    active_opportunities = pagination.items

    for opp in active_opportunities:
        opp.applicant_count = len(opp.applications) if hasattr(opp, 'applications') else 0
        opp.is_closed = bool(opp.deadline and opp.deadline < now_ref)

    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    return render_template('opportunities.html',
                         opportunities=active_opportunities,
                         pagination=pagination,
                         search_query=search_query,
                         current_sort=sort_by,
                         current_status=current_status,
                         current_duration=current_duration,
                         unread_count=unread_count,
                         title='Opportunities - IYDP')

@app.route('/opportunity/<int:id>')
def view_opportunity(id):
    opportunity = Opportunity.query.get_or_404(id)
    if not opportunity.is_active:
        abort(404)

    opportunity.view_count = (opportunity.view_count or 0) + 1
    db.session.commit()

    opportunity.applicant_count = len(opportunity.applications)
    return render_template('opportunity_detail.html',
                         opportunity=opportunity,
                         title=f'{opportunity.title} - IYDP',
                         now=datetime.now(timezone.utc))
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

    items = query.order_by(News.created_at.desc()).paginate(page=page, per_page=5, error_out=False)

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

    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    for item in pagination.items:
        album_images = get_news_album_images(getattr(item, 'keyword_image', None))
        item.album_images = album_images
        item.cover_image = album_images[0] if album_images else item.image_url

    return render_template('news.html',
                         news=pagination,
                         search=search_query,
                         current_sort=sort_by,
                         unread_count=unread_count,
                         title='Latest News - IYDP')




@app.route('/news/<int:id>')
def news_detail(id):
    news = News.query.get_or_404(id)

    if not news.is_published and not (current_user.is_authenticated and current_user.is_admin):
        abort(404)

    news.view_count = (news.view_count or 0) + 1
    db.session.commit()

    album_images = get_news_album_images(getattr(news, 'keyword_image', None))
    news.album_images = album_images
    news.cover_image = album_images[0] if album_images else news.image_url

    related_news = News.query.filter(
        News.id != news.id,
        News.is_published == True
    ).order_by(News.created_at.desc()).limit(3).all()

    for item in related_news:
        related_album = get_news_album_images(getattr(item, 'keyword_image', None))
        item.cover_image = related_album[0] if related_album else item.image_url

    return render_template('news_detail.html',
                         news=news,
                         related_news=related_news,
                         title=f'{news.title} - IYDP')
@app.route('/admin/blog')
@login_required
@admin_required
def list_blog_posts():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = BlogPost.query

    if search:
        query = query.filter(
            (BlogPost.title.ilike(f'%{search}%')) |
            (BlogPost.content.ilike(f'%{search}%'))
        )

    posts = query.order_by(BlogPost.created_at.desc()).paginate(
        page=page,
        per_page=5,
        error_out=False
    )

    return render_template('admin/blog/list.html',
                         posts=posts,
                         search=search,
                         unread_count=unread_count)

@app.route('/admin/blog/add', methods=['GET', 'POST'])
@login_required
@admin_required
def add_blog_post():
    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        excerpt = request.form.get('excerpt')
        image_url = request.form.get('image_url')
        is_published = 'is_published' in request.form

        if not title or not content:
            flash('Başlıq və məzmunu daxil etmək məcburidir', 'error')
            return redirect(url_for('add_blog_post'))

        try:
            new_post = BlogPost(
                title=title,
                content=content,
                excerpt=excerpt,
                image_url=image_url,
                is_published=is_published
            )

            db.session.add(new_post)
            db.session.commit()

            flash('Blog yazısı uğurla əlavə edildi', 'success')
            return redirect(url_for('list_blog_posts'))

        except Exception as e:
            db.session.rollback()
            flash(f'Xəta baş verdi: {str(e)}', 'error')

    unread_count = ContactMessage.query.filter_by(is_read=False).count()
    return render_template('admin/blog/add.html', unread_count=unread_count)

@app.route('/admin/blog/edit/<int:id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_blog_post(id):
    post = BlogPost.query.get_or_404(id)
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        post.title = request.form.get('title', post.title)
        post.content = request.form.get('content', post.content)
        post.excerpt = request.form.get('excerpt', post.excerpt)
        post.image_url = request.form.get('image_url', post.image_url)
        post.is_published = 'is_published' in request.form

        try:
            db.session.commit()
            flash('Blog yazısı uğurla yeniləndi', 'success')
            return redirect(url_for('list_blog_posts'))
        except Exception as e:
            db.session.rollback()
            flash(f'Xəta baş verdi: {str(e)}', 'error')

    return render_template('admin/blog/edit.html', post=post, unread_count=unread_count)

@app.route('/admin/blog/delete/<int:id>', methods=['POST'])
@login_required
@admin_required
def delete_blog_post(id):
    post = BlogPost.query.get_or_404(id)
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    try:
        db.session.delete(post)
        db.session.commit()
        flash('Blog yazısı uğurla silindi', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Xəta baş verdi: {str(e)}', 'error')

    return redirect(url_for('list_blog_posts'))

@app.route('/blog')
def blog():
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort', 'newest')
    page = request.args.get('page', 1, type=int)
    per_page = 9

    query = BlogPost.query.filter_by(is_published=True)

    if search_query:
        query = query.filter(
            (BlogPost.title.ilike(f'%{search_query}%')) |
            (BlogPost.content.ilike(f'%{search_query}%'))
        )

    if sort_by == 'alphabetical':
        query = query.order_by(BlogPost.title.asc())
    elif sort_by == 'oldest':
        query = query.order_by(BlogPost.created_at.asc())
    else:
        query = query.order_by(BlogPost.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return render_template('blog.html',
                         posts=pagination,
                         search=search_query,
                         current_sort=sort_by,
                         title='Youth Blog - IYDP')
@app.route('/blog/<string:slug>')
def blog_post(slug):
    post = BlogPost.query.filter_by(slug=slug, is_published=True).first_or_404()

    post.view_count += 1
    db.session.commit()

    related_posts = BlogPost.query.filter(
        BlogPost.id != post.id,
        BlogPost.is_published == True
    ).order_by(BlogPost.created_at.desc()).limit(3).all()

    return render_template('blog_detail.html', post=post, related_posts=related_posts)

# ══════════════════════════════════════════════════════════════
# ADMIN — MEMBERS & VIP MEMBERSHIP
# ══════════════════════════════════════════════════════════════

@app.route('/admin/members')
@admin_required
def list_members():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    vip_filter = request.args.get('vip', '')
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    query = User.query.filter_by(is_admin=False)
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
    elif vip_filter == 'none':
        query = query.filter(User.vip_status.in_(['none', 'revoked']))

    members = query.order_by(User.created_at.desc()).paginate(page=page, per_page=10, error_out=False)

    return render_template('admin/members/list.html',
                         members=members, search=search, vip_filter=vip_filter,
                         unread_count=unread_count)


@app.route('/admin/members/<int:id>')
@admin_required
def view_member(id):
    member = User.query.filter_by(id=id, is_admin=False).first_or_404()
    unread_count = ContactMessage.query.filter_by(is_read=False).count()
    payments = Payment.query.filter_by(user_id=member.id).order_by(Payment.created_at.desc()).all()
    attendances = (
        Attendance.query.filter_by(user_id=member.id)
        .order_by(Attendance.checked_in_at.desc()).all()
    )
    return render_template('admin/members/detail.html',
                         member=member, payments=payments, attendances=attendances,
                         unread_count=unread_count)


@app.route('/admin/members/<int:id>/vip/activate', methods=['POST'])
@admin_required
def activate_member_vip(id):
    member = User.query.filter_by(id=id, is_admin=False).first_or_404()
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
    flash(f'{member.display_name} üçün VIP üzvlük aktivləşdirildi.', 'success')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/members/<int:id>/vip/deactivate', methods=['POST'])
@admin_required
def deactivate_member_vip(id):
    member = User.query.filter_by(id=id, is_admin=False).first_or_404()
    vip_service.revoke_vip(member)
    db.session.commit()
    flash(f'{member.display_name} üçün VIP üzvlük deaktiv edildi.', 'info')
    return redirect(url_for('view_member', id=member.id))


@app.route('/admin/members/<int:id>/vip/regenerate-qr', methods=['POST'])
@admin_required
def regenerate_member_qr(id):
    member = User.query.filter_by(id=id, is_admin=False).first_or_404()
    if not member.is_vip:
        flash('Bu istifadəçi VIP üzv deyil.', 'danger')
        return redirect(url_for('view_member', id=member.id))
    vip_service.regenerate_qr_token(member)
    db.session.commit()
    flash('Yeni QR kod yaradıldı. Köhnə kart artıq işləməyəcək.', 'success')
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
    flash(f'{member.display_name} üçün ödəniş təsdiqləndi və VIP üzvlük aktivləşdirildi.', 'success')
    return redirect(url_for('list_vip_requests'))


@app.route('/admin/vip-requests/<int:payment_id>/reject', methods=['POST'])
@admin_required
def reject_vip_payment(payment_id):
    payment = Payment.query.get_or_404(payment_id)
    note = request.form.get('note', '').strip() or None
    vip_service.reject_payment(payment, note=note)
    db.session.commit()
    flash('VIP sorğusu rədd edildi.', 'info')
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


@app.route('/admin/events/add', methods=['GET', 'POST'])
@admin_required
def add_event():
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        location = request.form.get('location', '').strip()
        starts_at_str = request.form.get('starts_at')
        is_active = 'is_active' in request.form

        if not name:
            flash('Tədbirin adını daxil edin.', 'danger')
            return redirect(url_for('add_event'))

        starts_at = None
        if starts_at_str:
            try:
                starts_at = datetime.strptime(starts_at_str, '%Y-%m-%dT%H:%M')
            except ValueError:
                starts_at = None

        event = Event(name=name, description=description or None, location=location or None,
                       starts_at=starts_at, is_active=is_active)
        db.session.add(event)
        db.session.commit()
        flash('Tədbir yaradıldı.', 'success')
        return redirect(url_for('list_events'))

    return render_template('admin/events/add.html', unread_count=unread_count)


@app.route('/admin/events/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_event(id):
    event = Event.query.get_or_404(id)
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    if request.method == 'POST':
        event.name = request.form.get('name', event.name).strip()
        event.description = request.form.get('description', '').strip() or None
        event.location = request.form.get('location', '').strip() or None
        starts_at_str = request.form.get('starts_at')
        if starts_at_str:
            try:
                event.starts_at = datetime.strptime(starts_at_str, '%Y-%m-%dT%H:%M')
            except ValueError:
                pass
        event.is_active = 'is_active' in request.form

        db.session.commit()
        flash('Tədbir yeniləndi.', 'success')
        return redirect(url_for('list_events'))

    starts_at_value = event.starts_at.strftime('%Y-%m-%dT%H:%M') if event.starts_at else ''
    return render_template('admin/events/edit.html', event=event, starts_at_value=starts_at_value, unread_count=unread_count)


@app.route('/admin/events/delete/<int:id>', methods=['POST'])
@admin_required
def delete_event(id):
    event = Event.query.get_or_404(id)
    db.session.delete(event)
    db.session.commit()
    flash('Tədbir silindi.', 'success')
    return redirect(url_for('list_events'))


@app.route('/admin/events/<int:id>/attendance')
@admin_required
def event_attendance(id):
    event = Event.query.get_or_404(id)
    unread_count = ContactMessage.query.filter_by(is_read=False).count()

    attendances = (
        Attendance.query.filter_by(event_id=event.id)
        .order_by(Attendance.checked_in_at.desc()).all()
    )
    total_vip = User.query.filter_by(is_vip=True, vip_status='active').count()

    return render_template('admin/events/attendance.html',
                         event=event, attendances=attendances,
                         total_vip=total_vip, unread_count=unread_count)


@app.route('/admin/events/<int:id>/attendance/export.csv')
@admin_required
def export_event_attendance(id):
    event = Event.query.get_or_404(id)
    attendances = (
        Attendance.query.filter_by(event_id=event.id)
        .order_by(Attendance.checked_in_at.asc()).all()
    )

    lines = ['Membership No,Full Name,Email,Phone,Checked In At (UTC)']
    for a in attendances:
        m = a.user
        row = [
            m.membership_no or '', m.full_name or '', m.email or '', m.phone or '',
            a.checked_in_at.strftime('%Y-%m-%d %H:%M') if a.checked_in_at else '',
        ]
        escaped = ['"' + str(v).replace('"', '""') + '"' for v in row]
        lines.append(','.join(escaped))

    csv_data = '\n'.join(lines)
    filename = f'attendance-event-{event.id}.csv'
    return Response(csv_data, mimetype='text/csv', headers={
        'Content-Disposition': f'attachment; filename={filename}'
    })


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
        return jsonify({'status': 'invalid', 'message': 'Tədbir seçilməyib.'}), 400

    status, payload = checkin_service.check_in(event, code, current_user)

    if status == 'ok':
        db.session.commit()
        member = payload.user
        return jsonify({
            'status': 'ok',
            'name': member.display_name,
            'membership_no': member.membership_no,
            'time': payload.checked_in_at.strftime('%H:%M'),
        })
    if status == 'duplicate':
        db.session.rollback()
        member = payload.user
        return jsonify({
            'status': 'duplicate',
            'name': member.display_name,
            'membership_no': member.membership_no,
            'time': payload.checked_in_at.strftime('%H:%M'),
        })
    if status == 'not_vip':
        db.session.rollback()
        return jsonify({'status': 'not_vip', 'name': payload.display_name if payload else None})

    db.session.rollback()
    return jsonify({'status': 'invalid', 'message': 'Bu QR kod tanınmadı.'})

# ══════════════════════════════════════════════════════════════
# JSON API ENDPOINTS (for React SPA)
# ══════════════════════════════════════════════════════════════

@app.route('/api/home')
def api_home():
    opportunities = Opportunity.query.filter_by(is_active=True).order_by(Opportunity.created_at.desc()).limit(6).all()
    news = News.query.filter_by(is_published=True).order_by(News.created_at.desc()).limit(3).all()
    posts = BlogPost.query.filter_by(is_published=True).order_by(BlogPost.created_at.desc()).limit(6).all()

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
        'posts': [{
            'id': p.id,
            'title': p.title,
            'content': p.content,
            'excerpt': p.excerpt,
            'image_url': p.image_url,
            'slug': p.slug,
            'view_count': p.view_count or 0,
            'created_at': p.created_at.isoformat() if p.created_at else None,
        } for p in posts],
    })


@app.route('/api/opportunities')
def api_opportunities():
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort', 'newest')
    current_status = request.args.get('status', '')
    page = request.args.get('page', 1, type=int)
    per_page = 9
    now_ref = datetime.utcnow()

    query = Opportunity.query

    if search_query:
        query = query.filter(
            (Opportunity.title.ilike(f'%{search_query}%')) |
            (Opportunity.location.ilike(f'%{search_query}%'))
        )

    if current_status == 'active':
        query = query.filter(
            Opportunity.is_active == True,
            ((Opportunity.deadline == None) | (Opportunity.deadline >= now_ref))
        )
    elif current_status == 'closed':
        query = query.filter(
            (Opportunity.is_active == False) |
            ((Opportunity.deadline != None) & (Opportunity.deadline < now_ref))
        )
    else:
        query = query.filter(Opportunity.is_active == True)

    if sort_by == 'alphabetical':
        query = query.order_by(Opportunity.title.asc())
    elif sort_by == 'deadline_soon':
        query = query.order_by(Opportunity.deadline.asc().nullslast())
    elif sort_by == 'oldest':
        query = query.order_by(Opportunity.created_at.asc())
    else:
        query = query.order_by(Opportunity.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [{
            'id': o.id,
            'title': o.title,
            'description': o.description,
            'requirements': o.requirements,
            'location': o.location or 'Remote',
            'deadline': o.deadline.isoformat() if o.deadline else None,
            'is_closed': bool(o.deadline and o.deadline < now_ref),
            'keyword_image': o.keyword_image,
            'view_count': o.view_count or 0,
            'tags': [t.name for t in o.tags],
            'applicant_count': len(o.applications),
            'created_at': o.created_at.isoformat() if o.created_at else None,
        } for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    })


@app.route('/api/opportunity/<int:id>')
def api_opportunity(id):
    o = Opportunity.query.get_or_404(id)
    if not o.is_active:
        return jsonify({'error': 'Not found'}), 404

    o.view_count = (o.view_count or 0) + 1
    db.session.commit()

    return jsonify({
        'id': o.id,
        'title': o.title,
        'description': o.description,
        'requirements': o.requirements,
        'location': o.location or 'Remote',
        'deadline': o.deadline.isoformat() if o.deadline else None,
        'is_closed': bool(o.deadline and o.deadline < datetime.utcnow()),
        'keyword_image': o.keyword_image,
        'view_count': o.view_count or 0,
        'tags': [t.name for t in o.tags],
        'applicant_count': len(o.applications),
        'created_at': o.created_at.isoformat() if o.created_at else None,
    })


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


@app.route('/api/blog')
def api_blog():
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort', 'newest')
    page = request.args.get('page', 1, type=int)
    per_page = 9

    query = BlogPost.query.filter_by(is_published=True)

    if search_query:
        query = query.filter(
            (BlogPost.title.ilike(f'%{search_query}%')) |
            (BlogPost.content.ilike(f'%{search_query}%'))
        )

    if sort_by == 'alphabetical':
        query = query.order_by(BlogPost.title.asc())
    elif sort_by == 'oldest':
        query = query.order_by(BlogPost.created_at.asc())
    else:
        query = query.order_by(BlogPost.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [{
            'id': p.id,
            'title': p.title,
            'content': p.content,
            'excerpt': p.excerpt,
            'image_url': p.image_url,
            'slug': p.slug,
            'view_count': p.view_count or 0,
            'created_at': p.created_at.isoformat() if p.created_at else None,
        } for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    })


@app.route('/api/blog/<string:slug>')
def api_blog_post(slug):
    p = BlogPost.query.filter_by(slug=slug, is_published=True).first_or_404()

    p.view_count += 1
    db.session.commit()

    related = BlogPost.query.filter(
        BlogPost.id != p.id, BlogPost.is_published == True
    ).order_by(BlogPost.created_at.desc()).limit(3).all()

    return jsonify({
        'id': p.id,
        'title': p.title,
        'content': p.content,
        'excerpt': p.excerpt,
        'image_url': p.image_url,
        'slug': p.slug,
        'view_count': p.view_count,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'related': [{
            'id': r.id,
            'title': r.title,
            'slug': r.slug,
            'image_url': r.image_url,
            'created_at': r.created_at.isoformat() if r.created_at else None,
        } for r in related],
    })


@app.route('/api/contact', methods=['POST'])
def api_contact():
    raw_name = request.form.get('name', '')
    raw_email = request.form.get('email', '')
    raw_message = request.form.get('message', '')

    if not all([raw_name, raw_email, raw_message]):
        return jsonify({'status': 'error', 'message': 'Please fill in all fields.'}), 400

    new_message = ContactMessage(
        name=html.escape(raw_name),
        email=html.escape(raw_email),
        message=html.escape(raw_message)
    )

    try:
        db.session.add(new_message)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Message sent successfully!'}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': 'An error occurred.'}), 500


# ══════════════════════════════════════════════════════════════
# REACT SPA (built `dist/`) — serves routes the Jinja pages above don't
# own (e.g. /login, /register, /account, /faq, /stories, /erasmus), and
# their static assets. Only active once `npm run build` has produced a
# dist/ folder; in local dev those routes are served by `npm run dev`
# (port 3000) instead, via its own proxy to this Flask app.
# ══════════════════════════════════════════════════════════════

DIST_DIR = os.path.join(app.root_path, 'dist')


@app.route('/<path:path>')
def spa_catch_all(path):
    if not os.path.isdir(DIST_DIR):
        abort(404)
    file_path = os.path.join(DIST_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(DIST_DIR, path)
    index_path = os.path.join(DIST_DIR, 'index.html')
    if os.path.isfile(index_path):
        return send_from_directory(DIST_DIR, 'index.html')
    abort(404)


if __name__ == '__main__':
    app.run(debug=True)
