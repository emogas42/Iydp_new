"""Stops simple bots on the public forms, with nothing for a person to solve.

A hidden field that people never see, and a signed start time from the page, so a form
can't be posted without opening it or be sent back within two seconds. A bot that runs
a real browser and waits gets through: the rate limits are what is left then.
"""
import time
from datetime import timedelta

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

MIN_SECONDS = 2
MAX_AGE = timedelta(days=1)
HIDDEN_FIELD = 'homepage_url'


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='form-start')


def make_token():
    return _serializer().dumps({'at': time.time()})


def problem(data):
    """Returns None for a person, or 'bot' or 'expired'. The caller refuses the form."""
    if not current_app.config.get('BOT_CHECK_ENABLED', True):
        return None
    if data.get(HIDDEN_FIELD):
        return 'bot'
    try:
        started = _serializer().loads(data.get('form_token'), max_age=int(MAX_AGE.total_seconds()))
    except SignatureExpired:
        return 'expired'
    except (BadSignature, TypeError, ValueError):
        return 'bot'
    return 'bot' if time.time() - started.get('at', 0) < MIN_SECONDS else None
