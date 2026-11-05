"""Sends one test mail using the settings in .env and says plainly what went wrong.

    python scripts/test_mail.py you@example.com

Never prints the password.
"""
import os
import smtplib
import ssl
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(ROOT, '.env'))

from services import email_verification, mail


def main():
    if len(sys.argv) != 2:
        print('Usage: python scripts/test_mail.py you@example.com')
        return 2

    for name in ('MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_FROM', 'SITE_URL'):
        print(f'{name}: {os.environ.get(name) or "(empty)"}')
    print(f'MAIL_PASSWORD: {"set" if os.environ.get("MAIL_PASSWORD") else "(empty)"}')

    if not mail.is_configured():
        print('\nFAILED: MAIL_SERVER and MAIL_FROM must both be filled in .env')
        return 1

    try:
        mail.deliver(sys.argv[1], 'IYDP mail test', 'If you can read this, IYDP can send email.')
    except smtplib.SMTPAuthenticationError:
        print('\nFAILED: the server refused MAIL_USERNAME or MAIL_PASSWORD')
    except ssl.SSLCertVerificationError:
        print("\nFAILED: MAIL_SERVER does not match the server's certificate")
    except smtplib.SMTPSenderRefused:
        print('\nFAILED: the server refused MAIL_FROM. It must be the address of this mailbox')
    except smtplib.SMTPRecipientsRefused:
        print('\nFAILED: the server refused the recipient address')
    except (smtplib.SMTPException, OSError, ValueError) as error:
        print(f'\nFAILED: {type(error).__name__}. Could not reach or use the mail server')
    else:
        print('\nACCEPTED: the server took the mail. Check the inbox and the spam folder')
        print('In the received mail, open "Show original" and look for spf=pass, dkim=pass and dmarc=pass')
        if not os.environ.get('SITE_URL'):
            print('SITE_URL is empty, so email confirmation stays off until it is set')
        problem = email_verification.site_url_problem()
        if problem:
            print(f'WARNING: {problem}')
        return 0
    return 1


if __name__ == '__main__':
    sys.exit(main())
