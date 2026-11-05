"""Lets a member who forgot their password set a new one through a link sent by mail.

Links are signed rather than stored, so there is nothing to clean up. They carry a hash
of the current password and address, so a link dies once it is used, once the password
changes some other way, and if the address changes.
"""
import hashlib
import os
from datetime import timedelta

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from services import mail

LINK_LIFETIME = timedelta(hours=1)


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='password-reset')


def _fingerprint(user):
    return hashlib.sha256(f'{user.password}|{user.email}'.encode()).hexdigest()[:16]


def make_token(user):
    return _serializer().dumps({'user': user.id, 'state': _fingerprint(user)})


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
    return data.get('state') == _fingerprint(user)


def can_reset(user):
    # Admin accounts are left out: a mailbox break-in must not open the panel.
    return bool(user and user.email and not user.is_admin and not user.deleted_at)


def send_link(user):
    """Sends in the background. Waiting for the mail server here would make the answer
    slower for addresses that have an account, which would reveal which ones do."""
    link = f"{os.environ['SITE_URL'].rstrip('/')}/reset-password?token={make_token(user)}"
    # No name here: anyone can sign up with any address and any name.
    body = '\n\n'.join([
        'Salam!',
        'IYDP hesabınız üçün yeni şifrə təyin etmək istəmisiniz. Bu linkə keçin. Link 1 saat işləyir:',
        link,
        'To set a new password for your IYDP account, open the link above. It works for 1 hour.',
        'Bunu siz istəməmisinizsə, bu məktubu silin. Şifrəniz dəyişməyəcək.\n'
        'If this was not you, delete this message. Your password will not change.',
    ])
    subject = 'IYDP: şifrənin yenilənməsi / password reset'
    mail.send_later(user.email, subject, body)
