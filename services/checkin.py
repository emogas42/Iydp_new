"""Event check-in logic used by the admin QR scanner page."""
from models import db, User, Attendance

QR_PREFIX = 'IYDPVIP:'


def encode_qr_value(user):
    return f'{QR_PREFIX}{user.qr_token}'


def decode_qr_value(raw_code):
    raw_code = (raw_code or '').strip()
    if raw_code.startswith(QR_PREFIX):
        return raw_code[len(QR_PREFIX):]
    return raw_code


def check_in(event, raw_code, admin_user):
    """Returns (status, payload) where status is one of:
    'ok', 'duplicate', 'invalid', 'not_vip'
    """
    token = decode_qr_value(raw_code)
    if not token:
        return 'invalid', None

    member = User.query.filter_by(qr_token=token).first()
    if member is None:
        return 'invalid', None

    if not member.is_vip or member.vip_status != 'active':
        return 'not_vip', member

    existing = Attendance.query.filter_by(event_id=event.id, user_id=member.id).first()
    if existing:
        return 'duplicate', existing

    attendance = Attendance(
        event_id=event.id,
        user_id=member.id,
        checked_in_by_id=admin_user.id,
    )
    db.session.add(attendance)
    db.session.flush()
    return 'ok', attendance
