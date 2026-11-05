"""Event check-in logic used by the admin QR scanner page."""
from models import db, User, Attendance, EventRegistration

QR_PREFIX = 'IYDPVIP:'


def encode_qr_value(user):
    return f'{QR_PREFIX}{user.qr_token}'


def decode_qr_value(raw_code):
    raw_code = (raw_code or '').strip()
    if raw_code.startswith(QR_PREFIX):
        return raw_code[len(QR_PREFIX):]
    return raw_code


def check_in(event, raw_code, admin_user, override=False):
    """Returns (status, payload) where status is one of: 'ok', 'duplicate', 'invalid', 'not_approved'.

    An event with a registration form admits approved applicants. The person at the
    door can still let someone else in with override. Without a form, anyone can walk in.
    """
    token = decode_qr_value(raw_code)
    if not token:
        return 'invalid', None

    member = User.query.filter_by(qr_token=token).first()
    if member is None:
        return 'invalid', None

    existing = Attendance.query.filter_by(event_id=event.id, user_id=member.id).first()
    if existing:
        return 'duplicate', existing

    if event.has_form and not override:
        registration = EventRegistration.query.filter_by(event_id=event.id, user_id=member.id).first()
        if not registration or registration.status != 'approved':
            return 'not_approved', (member, registration)

    attendance = Attendance(
        event_id=event.id,
        user_id=member.id,
        checked_in_by_id=admin_user.id,
    )
    db.session.add(attendance)
    db.session.flush()
    return 'ok', attendance
