"""Outgoing email over SMTP. Settings come from the environment (see .env.example).

Without MAIL_SERVER nothing is sent: members still get the notice on their account page.
Mail is plain text on purpose: this form reached the inbox where HTML versions did not.
"""
import logging
import os
import smtplib
import ssl
import threading
from email.message import EmailMessage
from email.utils import formatdate, make_msgid, parseaddr

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10

# The signature on every mail the site sends. Edit the text here.
SIGNATURE = 'IYDP - International Youth Dialogue Platform'


def is_configured():
    return bool(os.environ.get('MAIL_SERVER') and os.environ.get('MAIL_FROM'))


def _sender_domain():
    return parseaddr(os.environ['MAIL_FROM'])[1].rpartition('@')[2] or None


def build_message(to, subject, body, reply_to=None):
    message = EmailMessage()
    message['From'] = os.environ['MAIL_FROM']
    message['To'] = to
    # A line break in a header would let text from a form add headers of its own.
    message['Subject'] = ' '.join(subject.split())
    # smtplib adds neither of these, and Gmail refuses mail without a valid Message-ID.
    message['Date'] = formatdate(usegmt=True)
    message['Message-ID'] = make_msgid(domain=_sender_domain())
    # Tells mail servers not to send out-of-office replies to an automatic message.
    message['Auto-Submitted'] = 'auto-generated'
    reply_to = reply_to or os.environ.get('MAIL_REPLY_TO')
    if reply_to:
        message['Reply-To'] = reply_to
    # Left to choose, Python can pick base64, which spam filters count against a text mail.
    message.set_content(f'{body}\n\n{SIGNATURE}', cte='quoted-printable')
    return message


def deliver(to, subject, body, reply_to=None):
    """Hands the message to the mail server, or raises to say why it could not."""
    message = build_message(to, subject, body, reply_to)

    host = os.environ['MAIL_SERVER']
    port = int(os.environ.get('MAIL_PORT', '465'))
    username = os.environ.get('MAIL_USERNAME')
    # smtplib does not check certificates unless given a context, and the password goes
    # down this connection.
    tls = ssl.create_default_context()
    # Otherwise the greeting names this machine, which can be a private address.
    greeting_name = _sender_domain()
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, local_hostname=greeting_name, timeout=TIMEOUT_SECONDS, context=tls)
    else:
        server = smtplib.SMTP(host, port, local_hostname=greeting_name, timeout=TIMEOUT_SECONDS)
    with server:
        # MAIL_USE_TLS=0 is only for a local test server such as Mailpit.
        if port != 465 and os.environ.get('MAIL_USE_TLS', '1') == '1':
            server.starttls(context=tls)
        if username:
            server.login(username, os.environ.get('MAIL_PASSWORD', ''))
        server.send_message(message)


def send(to, subject, body, reply_to=None):
    """Returns True once the mail server has accepted the message. Never raises."""
    if not is_configured():
        return False
    try:
        deliver(to, subject, body, reply_to)
    except (smtplib.SMTPException, OSError, ValueError) as error:
        logger.error('Email to user could not be sent: %s', type(error).__name__)
        return False
    return True


def send_later(to, subject, body, reply_to=None):
    """Sends without making the visitor wait for the mail server, or see if it failed."""
    threading.Thread(target=send, args=(to, subject, body, reply_to), daemon=True).start()
