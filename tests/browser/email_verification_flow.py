"""Sign-up to confirmed email in a real browser, with mail going over real SMTP."""
import email, email.policy, os, re, sys, time
from aiosmtpd.controller import Controller
from playwright.sync_api import sync_playwright, expect

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _site import Site
inbox = []
raw = []


class Handler:
    async def handle_DATA(self, server, session, envelope):
        msg = email.message_from_bytes(envelope.content, policy=email.policy.default)
        inbox.append((envelope.rcpt_tos[0], msg['Subject'], msg.get_body(('plain',)).get_content()))
        raw.append(msg)
        return '250 OK'


smtp = Controller(Handler(), hostname='127.0.0.1', port=2525)
smtp.start()
site = Site(os.path.join(HERE, '_seed.py'), smtp_port=2525)
BASE = site.base
event_id = '1'


def wait_mail(count):
    for _ in range(40):
        if len(inbox) >= count:
            return inbox[count - 1]
        time.sleep(0.25)
    raise AssertionError('no mail')


def link_in(body):
    return re.search(r'http://\S+/verify-email\?token=\S+', body).group(0)


def no_overflow(page, where):
    px = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    assert px <= 0, f'{where}: {px}px sideways scroll'


NOTICE = 'Email ünvanınızı təsdiqləyin'
try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel='chrome', headless=True)
        errors = []
        ctx = br.new_context(viewport={'width': 1280, 'height': 900})
        p = ctx.new_page()
        p.on('pageerror', lambda e: errors.append(str(e)))

        # sign up with a typo
        p.goto(f'{BASE}/register')
        boxes = p.locator('main form input')
        boxes.nth(0).fill('Test Person')
        boxes.nth(1).fill('tset@example.com')
        boxes.nth(3).fill('secret-pass1')
        boxes.nth(4).fill('secret-pass1')
        p.locator('main form button[type=submit]').click()
        p.wait_for_url('**/account')
        expect(p.get_by_text(NOTICE)).to_be_visible()
        to, subject, body = wait_mail(1)
        assert to == 'tset@example.com', to
        print('mail subject', subject)
        print('mail body:\n', body.split('token=')[0][-140:])
        p.wait_for_timeout(500)
        assert p.get_by_text('VIP üzv olun').count() == 0, 'VIP offered before confirming'

        # the resend wait is shown, not swallowed
        p.get_by_role('button', name='Linki yenidən göndər').click()
        expect(p.get_by_role('alert').filter(has_text='saniyə gözləyin')).to_be_visible()

        # fix the typo
        p.get_by_role('button', name='Email səhvdir').click()
        p.fill('#new-email', 'test@example.com')
        p.fill('#email-password', 'secret-pass1')
        p.get_by_role('button', name='Dəyiş və link göndər').click()
        expect(p.get_by_text('Email dəyişdirildi')).to_be_visible()
        to, _, body = wait_mail(2)
        assert to == 'test@example.com', to
        link = link_in(body)

        # event page: notice instead of the form
        p.goto(f'{BASE}/events/{event_id}')
        expect(p.get_by_text(NOTICE)).to_be_visible()
        assert p.get_by_text('Why join?').count() == 0, 'form shown before confirming'
        p.locator('#apply').scroll_into_view_if_needed()

        # open the link in another browser, signed out: goes through login and comes back
        other = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True).new_page()
        other.on('pageerror', lambda e: errors.append('phone: ' + str(e)))
        other.goto(link)
        other.wait_for_url('**/login')
        other.locator('main input[type=email]').fill('test@example.com')
        other.locator('main input[type=password]').fill('secret-pass1')
        other.locator('main form button[type=submit]').click()
        expect(other.get_by_role('heading', name='Email təsdiqləndi')).to_be_visible()
        no_overflow(other, 'phone confirmed page')
        print('confirmed via', other.url.split('?')[0])

        # first tab catches up on focus, with no reload
        p.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(p.get_by_label('Why join?')).to_be_visible()
        print('first tab caught up')

        # and can now apply
        p.get_by_label('Why join?').fill('To learn')
        p.locator('#apply button[type=submit]').click()
        expect(p.locator('#apply')).to_have_count(0, timeout=8000)
        print('applied')
        p.goto(f'{BASE}/account')
        expect(p.get_by_text('VIP üzv olun')).to_be_visible()
        assert p.get_by_text(NOTICE).count() == 0

        # broken link
        p.goto(f'{BASE}/verify-email?token=broken')
        expect(p.get_by_role('heading', name='Link işləmir')).to_be_visible()

        # phone: notice fits
        m = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True).new_page()
        m.goto(f'{BASE}/register')
        boxes = m.locator('main form input')
        boxes.nth(0).fill('Phone Person')
        boxes.nth(1).fill('a-very-long-address-for-a-small-screen-test@subdomain.example.com')
        boxes.nth(3).fill('secret-pass1')
        boxes.nth(4).fill('secret-pass1')
        m.locator('main form button[type=submit]').click()
        expect(m.get_by_text(NOTICE)).to_be_visible()
        m.get_by_role('button', name='Email səhvdir').tap()
        no_overflow(m, 'phone notice')
        m.wait_for_timeout(500)

        print('browser errors', errors)
        assert not errors
        print('ALL PASSED')
        br.close()
finally:
    site.stop()
    smtp.stop()
