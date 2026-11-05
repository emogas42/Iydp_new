"""Confirms that a member owns the email address on their account.

Links are signed rather than stored, so there is nothing to clean up. They carry a
hash of the address, which makes a link stop working if the address changes.
"""
import hashlib
import ipaddress
import math
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from services import mail

LINK_LIFETIME = timedelta(hours=24)
RESEND_WAIT = timedelta(seconds=60)


def _now():
    # Stored without a time zone, the way the database hands datetimes back.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def is_enabled():
    """Off without mail, or nobody could ever confirm. SITE_URL is required because
    otherwise the link would be built from the request's Host header, which a sender
    can forge to put their own domain in a mail to someone else."""
    return mail.is_configured() and bool(os.environ.get('SITE_URL'))


def site_url_problem():
    """Says why SITE_URL is wrong for mail to real people, or None if it is fine.

    A link to a local or numeric address can't be opened by the recipient, and spam
    filters treat numeric links as a sign of phishing.
    """
    site_url = os.environ.get('SITE_URL') or ''
    if not site_url:
        return None
    try:
        parts = urlsplit(site_url)
        host = parts.hostname or ''
    except ValueError:
        return f'{site_url} is not a valid address'
    try:
        ipaddress.ip_address(host)
        is_numeric = True
    except ValueError:
        is_numeric = False
    if is_numeric or host == 'localhost' or not host:
        return f'{site_url} is not a public domain, so links in emails will not open for members'
    if parts.scheme != 'https':
        return f'{site_url} does not use https'
    return None


def is_required(user):
    return is_enabled() and not user.is_admin and not user.email_verified_at


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='email-verification')


def _email_hash(email):
    return hashlib.sha256((email or '').encode()).hexdigest()[:16]


def make_token(user):
    return _serializer().dumps({'user': user.id, 'email': _email_hash(user.email)})


def read_token(token):
    """Returns (data, None), or (None, 'expired' or 'invalid')."""
    try:
        data = _serializer().loads(token, max_age=int(LINK_LIFETIME.total_seconds()))
    except SignatureExpired:
        return None, 'expired'
    except (BadSignature, TypeError, ValueError):
        return None, 'invalid'
    return data, None


def token_matches(data, user):
    return data.get('user') == user.id and data.get('email') == _email_hash(user.email)


def mark_verified(user):
    user.email_verified_at = _now()


def seconds_until_resend(user):
    if not user.email_verification_sent_at:
        return 0
    left = (user.email_verification_sent_at + RESEND_WAIT - _now()).total_seconds()
    return math.ceil(left) if left > 0 else 0


def send_link(user):
    """Returns True if the mail server accepted it. The caller commits."""
    if not is_enabled() or not user.email:
        return False
    link = f"{os.environ['SITE_URL'].rstrip('/')}/verify-email?token={make_token(user)}"
    # No name here. Anyone can sign up with any address and any name, so a name in this
    # mail would let them send their own text, or a link, to a stranger from our domain.
    body = '\n\n'.join([
        'Salam!',
        'IYDP hesabınızı aktivləşdirmək üçün bu linkə keçin. Link 24 saat işləyir:',
        link,
        'To activate your IYDP account, open the link above. It works for 24 hours.',
        'Bu hesabı siz yaratmamısınızsa, linkə keçməyin və bu məktubu silin.\n'
        'If you did not create this account, do not open the link and delete this message.',
    ])
    sent = mail.send(user.email, 'IYDP: email ünvanınızı təsdiqləyin / confirm your email', body)
    if sent:
        user.email_verification_sent_at = _now()
    return sent


def is_abandoned(user):
    """An account nobody confirmed in time and never used, so its address can be claimed.

    Without this, signing up with someone's address would lock them out of the site.
    """
    if not is_enabled() or user.email_verified_at or user.is_admin or user.is_staff_member:
        return False
    if user.is_vip or user.vip_status != 'none' or not user.created_at:
        return False
    if _now() - user.created_at.replace(tzinfo=None) < LINK_LIFETIME:
        return False
    return not (user.applications or user.event_registrations or user.payments or user.attendances or user.profile)

