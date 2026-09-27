"""VIP membership business logic.

Payment collection is manual today (cash / bank transfer confirmed in person
by an admin) but every action goes through this module so a real payment
gateway can be dropped in later by adding a new provider that calls
``confirm_payment`` from a webhook instead of an admin click.
"""
from datetime import datetime, timezone

from models import db, Payment

VIP_FEE_AMOUNT = 50
VIP_FEE_CURRENCY = 'AZN'


def request_vip(user):
    """Called when a member asks to become VIP from their account page."""
    if user.vip_status == 'active':
        return None

    user.vip_status = 'pending'
    user.vip_requested_at = datetime.now(timezone.utc)

    payment = Payment(
        user_id=user.id,
        amount=VIP_FEE_AMOUNT,
        currency=VIP_FEE_CURRENCY,
        method='manual',
        provider='manual',
        status='pending',
    )
    db.session.add(payment)
    return payment


def confirm_payment(payment, admin_user, note=None):
    """Admin confirms a payment was received and activates VIP membership."""
    user = payment.user
    payment.status = 'completed'
    payment.confirmed_at = datetime.now(timezone.utc)
    payment.confirmed_by_id = admin_user.id
    if note:
        payment.note = note

    activate_vip(user)
    return user


def activate_vip(user):
    user.is_vip = True
    user.vip_status = 'active'
    user.vip_activated_at = datetime.now(timezone.utc)
    if not user.qr_token:
        user.generate_qr_token()
    if not user.membership_no:
        # id is only guaranteed to exist once the row has been flushed
        db.session.flush()
        user.assign_membership_no()
    return user


def revoke_vip(user):
    user.is_vip = False
    user.vip_status = 'revoked'
    return user


def reject_payment(payment, note=None):
    payment.status = 'rejected'
    if note:
        payment.note = note
    payment.user.vip_status = 'none'
    return payment


def regenerate_qr_token(user):
    """Invalidate the old QR (e.g. lost/leaked card) and issue a new one."""
    user.generate_qr_token()
    return user
