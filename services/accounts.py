"""Deleting a member's account."""
import os
import secrets

from werkzeug.security import generate_password_hash

from models import utcnow


def erase(user):
    """Removes the person's data and signs them out everywhere. The caller commits.

    An empty row stays on purpose. Sessions are tied to the user id, and a database may give
    a deleted id to the next account, which would log the old holder in to someone else's.
    Payments stay with it, without a name, because the accounts must still add up.
    """
    for payment in user.payments:
        if payment.status == 'pending':
            payment.status = 'rejected'

    user.applications = []
    user.event_registrations = []
    user.attendances = []
    user.notifications = []
    user.profile = None

    user.deleted_at = utcnow()
    user.username = f'deleted-{user.id}-{os.urandom(4).hex()}'
    user.password = generate_password_hash(secrets.token_urlsafe(32))
    user.session_version = (user.session_version or 0) + 1
    user.must_change_password = False
    user.full_name = None
    user.email = None
    user.phone = None
    user.email_verified_at = None
    user.email_verification_sent_at = None
    user.is_staff_member = False
    user.is_vip = False
    user.vip_status = 'none'
    user.vip_requested_at = None
    user.vip_activated_at = None
    # A new random value rather than none, so the old QR code stops working and no
    # lookup can ever match an empty value.
    user.generate_qr_token()
