import secrets
from datetime import datetime, timedelta, timezone

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


AZ_TZ = timezone(timedelta(hours=4))

# Membership card types shown on the account page and at the QR scanner.
CARD_LABELS = {'standard': 'Standard', 'vip': 'VIP', 'member': 'Member'}


def utcnow():
    return datetime.now(timezone.utc)


def az_now_naive():
    """Baku wall-clock time; event times are entered and stored this way."""
    return datetime.now(AZ_TZ).replace(tzinfo=None)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    # Set after an admin reset; the member is asked to choose a new password.
    must_change_password = db.Column(db.Boolean, default=False, nullable=False)
    # Part of the session id: bumping it signs this user out everywhere.
    session_version = db.Column(db.Integer, default=0, nullable=False)

    # Member profile
    full_name = db.Column(db.String(150), nullable=True)
    email = db.Column(db.String(150), unique=True, nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    # IYDP team: gets the "Member" card, set by an admin.
    is_staff_member = db.Column(db.Boolean, default=False, nullable=False)

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
    applications = db.relationship('Application', backref='user', lazy=True, cascade='all, delete-orphan')
    event_registrations = db.relationship('EventRegistration', backref='user', lazy=True, cascade='all, delete-orphan')

    def get_id(self):
        return f'{self.id}.{self.session_version}'

    def set_password_hash(self, password_hash):
        self.password = password_hash
        self.session_version = (self.session_version or 0) + 1

    def generate_qr_token(self):
        self.qr_token = secrets.token_urlsafe(24)
        return self.qr_token

    def assign_membership_no(self):
        if not self.membership_no:
            self.membership_no = f'IYDP-{self.id:05d}'
        return self.membership_no

    def ensure_card(self):
        """Every account has a card number and QR. The row must already have an id."""
        self.assign_membership_no()
        if not self.qr_token:
            self.generate_qr_token()

    @property
    def card_type(self):
        if self.is_staff_member:
            return 'member'
        if self.is_vip and self.vip_status == 'active':
            return 'vip'
        return 'standard'

    @property
    def card_label(self):
        return CARD_LABELS[self.card_type]

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
    poster_path = db.Column(db.String(255), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    # auto: finished once end_date has passed. present/finished: set by an admin.
    status_mode = db.Column(db.String(10), default='auto', nullable=False)
    accepts_applications = db.Column(db.Boolean, default=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.utcnow)
    photos = db.relationship(
        'OpportunityPhoto', backref='opportunity', lazy=True,
        order_by='OpportunityPhoto.position', cascade='all, delete-orphan'
    )
    tags = db.relationship('OpportunityTag', backref='opportunity', lazy=True, cascade='all, delete-orphan')
    applications = db.relationship('Application', backref='opportunity', lazy=True, cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(Opportunity, self).__init__(**kwargs)
        if self.view_count is None:
            self.view_count = 0

    @property
    def phase(self):
        if self.status_mode in ('present', 'finished'):
            return self.status_mode
        if self.end_date and self.end_date < az_now_naive().date():
            return 'finished'
        return 'present'

    @property
    def deadline_passed(self):
        return bool(self.deadline and self.deadline < az_now_naive())

    @property
    def applications_open(self):
        return bool(
            self.is_active and self.accepts_applications
            and self.phase == 'present' and not self.deadline_passed
        )


class OpportunityPhoto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunity.id'), nullable=False, index=True)
    path = db.Column(db.String(255), nullable=False)
    position = db.Column(db.Integer, default=0, nullable=False)


class OpportunityTag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunity.id'), nullable=False)


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunity.id'), nullable=False)
    applied_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), default='pending')  # pending | accepted | rejected
    # Copied from the form, so later profile edits don't rewrite what was submitted.
    full_name = db.Column(db.String(150), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    birth_date = db.Column(db.Date, nullable=True)
    residence = db.Column(db.String(150), nullable=True)
    english_level = db.Column(db.String(30), nullable=True)
    motivation = db.Column(db.Text, nullable=True)
    cv_link = db.Column(db.String(500), nullable=True)
    admin_note = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'opportunity_id', name='uq_application_user_opportunity'),
    )


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


class Story(db.Model):
    """A participant's first-hand account of an Erasmus+, ESC or similar project."""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    author_name = db.Column(db.String(120), nullable=False)
    # Short line under the name, e.g. "Youth Exchange · Poland, 2025".
    author_info = db.Column(db.String(160), nullable=True)
    program = db.Column(db.String(60), nullable=True)
    avatar_path = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=False)
    is_published = db.Column(db.Boolean, default=True, nullable=False)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    photos = db.relationship(
        'StoryPhoto', backref='story', lazy=True,
        order_by='StoryPhoto.position', cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<Story {self.title}>'


class StoryPhoto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    story_id = db.Column(db.Integer, db.ForeignKey('story.id'), nullable=False, index=True)
    path = db.Column(db.String(255), nullable=False)
    position = db.Column(db.Integer, default=0, nullable=False)


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
    poster_path = db.Column(db.String(255), nullable=True)
    capacity = db.Column(db.Integer, nullable=True)  # None = no limit
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)  # open for QR check-in
    created_at = db.Column(db.DateTime, default=utcnow)

    attendances = db.relationship('Attendance', backref='event', lazy=True, cascade='all, delete-orphan')
    registrations = db.relationship(
        'EventRegistration', backref='event', lazy=True,
        order_by='EventRegistration.created_at', cascade='all, delete-orphan'
    )

    @property
    def has_started(self):
        return bool(self.starts_at and self.starts_at <= az_now_naive())

    @property
    def spots_left(self):
        if self.capacity is None:
            return None
        return max(self.capacity - len(self.registrations), 0)

    @property
    def registration_open(self):
        return self.is_public and not self.has_started and self.spots_left != 0


class EventRegistration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='uq_event_registration_event_user'),
    )


class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    checked_in_at = db.Column(db.DateTime, default=utcnow)
    checked_in_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='uq_attendance_event_user'),
    )
