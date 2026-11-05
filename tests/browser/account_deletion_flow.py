"""Deleting an account in a real browser: as the member, on desktop and phone, and as admin."""
import os, sys
from playwright.sync_api import sync_playwright, expect

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _site import Site, _bootstrap

site = Site()
BASE = site.base
admin_name = 'admin'


def register(page, name, email):
    page.goto(f'{BASE}/register')
    boxes = page.locator('main form input')
    boxes.nth(0).fill(name)
    boxes.nth(1).fill(email)
    boxes.nth(3).fill('secret-pass1')
    boxes.nth(4).fill('secret-pass1')
    page.locator('main form button[type=submit]').click()
    page.wait_for_url('**/account')


def no_overflow(page, where):
    px = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    assert px <= 0, f'{where}: {px}px sideways scroll'


try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel='chrome', headless=True)
        errors = []
        ctx = br.new_context(viewport={'width': 1280, 'height': 900})
        p = ctx.new_page()
        p.on('pageerror', lambda e: errors.append(str(e)))

        register(p, 'Self Delete', 'self@example.com')
        p.get_by_role('button', name='Hesabı sil').click()
        expect(p.get_by_role('heading', name='Hesabı silmək istəyirsiniz?')).to_be_visible()
        p.get_by_role('button', name='İmtina').click()
        expect(p.get_by_role('heading', name='Hesabı silmək istəyirsiniz?')).to_have_count(0)
        p.get_by_role('button', name='Hesabı sil').click()
        p.get_by_label('Təsdiq üçün şifrəniz').fill('wrong-password')
        p.get_by_role('button', name='Hesabımı birdəfəlik sil').click()
        expect(p.get_by_role('alert').filter(has_text='Şifrə yanlışdır')).to_be_visible()
        p.get_by_label('Təsdiq üçün şifrəniz').fill('secret-pass1')
        p.get_by_role('button', name='Hesabımı birdəfəlik sil').click()
        expect(p.get_by_role('heading', name='Hesabınız silindi')).to_be_visible()
        p.get_by_role('link', name='Ana səhifə').click()
        p.wait_for_url(BASE + '/')
        p.goto(f'{BASE}/account')
        p.wait_for_url('**/login')
        p.locator('main input[type=email]').fill('self@example.com')
        p.locator('main input[type=password]').fill('secret-pass1')
        p.locator('main form button[type=submit]').click()
        expect(p.get_by_text('Email və ya şifrə yanlışdır')).to_be_visible()
        print('member delete ok')

        # phone
        m = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True).new_page()
        m.on('pageerror', lambda e: errors.append('phone: ' + str(e)))
        register(m, 'Phone Delete', 'phone@example.com')
        m.get_by_role('button', name='Hesabı sil').tap()
        no_overflow(m, 'phone delete form')
        m.locator('#delete-password').scroll_into_view_if_needed()
        print('phone ok')

        # admin deletes the phone member
        a = br.new_context(viewport={'width': 1280, 'height': 1000}).new_page()
        a.on('pageerror', lambda e: errors.append('admin: ' + str(e)))
        dialogs = []
        a.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))
        a.goto(f'{BASE}/admin/login')
        a.fill('input[name=username]', admin_name)
        a.fill('input[name=password]', _bootstrap.ADMIN_PASSWORD)
        a.locator('form button[type=submit]').click()
        a.goto(f'{BASE}/admin/members?search=phone@example.com')
        a.get_by_role('link', name='Phone Delete').click()
        box = a.locator('#delete-confirm')
        box.scroll_into_view_if_needed()
        box.fill('nope')
        assert a.evaluate("document.getElementById('delete-confirm').checkValidity()") is False
        box.fill('DELETE')
        a.get_by_role('button', name='Delete account').click()
        expect(a.get_by_text('Phone Delete: account deleted.')).to_be_visible()
        assert a.get_by_role('link', name='Phone Delete').count() == 0
        assert dialogs == ['Permanently delete this account?'], dialogs
        print('admin delete ok')

        # the member's open tab stops working
        m.reload()
        m.wait_for_url('**/login')
        print('member signed out')

        print('browser errors', errors)
        assert not errors
        print('ALL PASSED')
        br.close()
finally:
    site.stop()
