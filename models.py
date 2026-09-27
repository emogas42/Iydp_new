import secrets
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    # Member profile
    full_name = db.Column(db.String(150), nullable=True)
    email = db.Column(db.String(150), unique=True, nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    # VIP membership
    is_vip = db.Column(db.Boolean, default=False, nullable=False)
    vip_status = db.Column(db.String(20), default='none', nullable=False)  # none | pending | active | revoked
    vip_requested_at = db.Column(db.DateTime, nullable=True)
    vip_activated_at = db.Column(db.DateTime, nullable=True)
    membership_no = db.Column(db.String(30), unique=True, nullable=True)
    qr_token = db.Column(db.String(64), unique=True, nullable=True)

    payments = db.relationship(
        'Payment', backref='user', lazy=True,
        foreign_keys='Payment.user_id', cascade='all, delete-orphan'
    )
    attendances = db.relationship(
        'Attendance', backref='user', lazy=True,
        foreign_keys='Attendance.user_id', cascade='all, delete-orphan'
    )

    def get_id(self):
        return str(self.id)

    def generate_qr_token(self):
        self.qr_token = secrets.token_urlsafe(24)
        return self.qr_token

    def assign_membership_no(self):
        if not self.membership_no:
            self.membership_no = f'IYDP-VIP-{self.id:05d}'
        return self.membership_no

    @property
    def display_name(self):
        return self.full_name or self.username


class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_read = db.Column(db.Boolean, default=False)


class Opportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(100), nullable=True)
    deadline = db.Column(db.DateTime, nullable=True)
    keyword_image = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.utcnow)
    tags = db.relationship('OpportunityTag', backref='opportunity', lazy=True, cascade='all, delete-orphan')
    applications = db.relationship('Application', backref='opportunity', lazy=True, cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(Opportunity, self).__init__(**kwargs)
        if self.view_count is None:
            self.view_count = 0


class OpportunityTag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunity.id'), nullable=False)


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunity.id'), nullable=False)
    applied_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), default='pending')


class News(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    keyword_image = db.Column(db.String(255), nullable=True)
    is_published = db.Column(db.Boolean, default=True)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.utcnow)

    def __init__(self, **kwargs):
        super(News, self).__init__(**kwargs)
        if self.view_count is None:
            self.view_count = 0

    def __repr__(self):
        return f'<News {self.title}>'


class BlogPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    is_published = db.Column(db.Boolean, default=True)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.utcnow)

    def __init__(self, **kwargs):
        super(BlogPost, self).__init__(**kwargs)
        if self.view_count is None:
            self.view_count = 0
        if not self.slug and self.title:
            self.slug = self.title.lower().replace(' ', '-').replace('ə', 'e').replace('ç', 'c').replace('ğ', 'g').replace('ı', 'i').replace('ö', 'o').replace('ş', 's').replace('ü', 'u')

    def __repr__(self):
        return f'<BlogPost {self.title}>'


class Payment(db.Model):
    """A VIP membership payment/activation record.

    method='manual' today (cash/bank transfer confirmed by an admin in person).
    provider/provider_reference are kept free so a real payment gateway can be
    plugged in later without changing this schema.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False, default=50)
    currency = db.Column(db.String(10), nullable=False, default='AZN')
    method = db.Column(db.String(20), nullable=False, default='manual')  # manual | gateway
    provider = db.Column(db.String(40), nullable=True)
    provider_reference = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending | completed | rejected
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    confirmed_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(150), nullable=True)
    starts_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    attendances = db.relationship('Attendance', backref='event', lazy=True, cascade='all, delete-orphan')


class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    checked_in_at = db.Column(db.DateTime, default=utcnow)
    checked_in_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='uq_attendance_event_user'),
    )
