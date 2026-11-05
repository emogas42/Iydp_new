"""Forgot password in a real browser, with a local fake mail server capturing the mail."""
import os, re, sys, time
from playwright.sync_api import sync_playwright, expect

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _site import Site, _bootstrap

site = Site()
BASE = site.base


used = set()


def last_link():
    for _ in range(40):
        found = re.findall(r'http\S+/reset-password\?token=\S+', site.mail_text())
        if found and found[-1] not in used:
            used.add(found[-1])
            return found[-1]
        time.sleep(0.1)
    raise AssertionError('no mail')


def overflow(page, where):
    px = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    assert px <= 0, f'{where}: {px}px sideways scroll'


try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel='chrome', headless=True)
        errors = []
        ctx = br.new_context(viewport={'width': 1280, 'height': 900})
        p = ctx.new_page()
        p.on('pageerror', lambda e: errors.append(str(e)))

        p.goto(f'{BASE}/register')
        boxes = p.locator('main form input')
        boxes.nth(0).fill('Browser Reset'); boxes.nth(1).fill('br@example.com')
        boxes.nth(3).fill('old-password1'); boxes.nth(4).fill('old-password1')
        p.locator('main form button[type=submit]').click()
        p.wait_for_url('**/account')
        p.get_by_role('button', name=re.compile('Çıxış')).first.click()
        p.wait_for_timeout(500)

        p.goto(f'{BASE}/login')
        p.get_by_role('link', name='Şifrəni unutmusunuz?').click()
        p.wait_for_url('**/forgot-password')
        p.get_by_label('Email').fill('br@example.com')
        p.get_by_role('button', name='Link göndər').click()
        expect(p.get_by_role('heading', name='Email ünvanınızı yoxlayın')).to_be_visible()
        link = last_link()
        print('forgot ok')

        p.goto(link)
        expect(p.get_by_role('heading', name='Yeni şifrə')).to_be_visible()
        p.get_by_label('Yeni şifrə', exact=True).fill('new-password1')
        p.get_by_label('Yeni şifrə (təkrar)').fill('not-the-same1')
        p.get_by_role('button', name='Şifrəni saxla').click()
        expect(p.get_by_role('alert').filter(has_text='uyğun gəlmir')).to_be_visible()
        p.get_by_label('Yeni şifrə (təkrar)').fill('new-password1')
        p.get_by_role('button', name='Şifrəni saxla').click()
        expect(p.get_by_role('heading', name='Şifrəniz dəyişdirildi')).to_be_visible()
        p.get_by_role('link', name='Daxil ol').last.click()
        p.wait_for_url('**/login')
        p.locator('main input[type=email]').fill('br@example.com')
        p.locator('main input[type=password]').fill('old-password1')
        p.locator('main form button[type=submit]').click()
        expect(p.get_by_text('Email və ya şifrə yanlışdır')).to_be_visible()
        p.locator('main input[type=password]').fill('new-password1')
        p.locator('main form button[type=submit]').click()
        p.wait_for_url('**/account')
        print('reset and sign in ok')

        q = br.new_context(viewport={'width': 1280, 'height': 900}).new_page()
        q.on('pageerror', lambda e: errors.append('used: ' + str(e)))
        q.goto(link)
        q.get_by_label('Yeni şifrə', exact=True).fill('another-pass1')
        q.get_by_label('Yeni şifrə (təkrar)').fill('another-pass1')
        q.get_by_role('button', name='Şifrəni saxla').click()
        expect(q.get_by_role('heading', name='Link işləmir')).to_be_visible()
        q.get_by_role('link', name='Yeni link istə').click()
        q.wait_for_url('**/forgot-password')
        q.goto(f'{BASE}/reset-password')
        expect(q.get_by_role('heading', name='Link işləmir')).to_be_visible()
        print('dead links ok')

        m = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True).new_page()
        m.on('pageerror', lambda e: errors.append('phone: ' + str(e)))
        m.goto(f'{BASE}/login')
        overflow(m, 'phone login')
        m.goto(f'{BASE}/forgot-password')
        overflow(m, 'phone forgot')
        m.get_by_label('Email').fill('br@example.com')
        m.get_by_role('button', name='Link göndər').tap()
        expect(m.get_by_role('heading', name='Email ünvanınızı yoxlayın')).to_be_visible()
        overflow(m, 'phone sent')
        m.goto(last_link())
        expect(m.get_by_role('heading', name='Yeni şifrə')).to_be_visible()
        overflow(m, 'phone reset')
        print('phone ok')

        print('browser errors', errors)
        assert not errors
        print('ALL PASSED')
        br.close()
finally:
    site.stop()
