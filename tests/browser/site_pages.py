"""Every page in a real browser: no blocked content, no WCAG A/AA failures, titles, forms."""
import json
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _site import Site, _bootstrap

AXE = os.path.join(_bootstrap.ROOT, 'node_modules', 'axe-core', 'axe.min.js')
site = Site(os.path.join(HERE, '_seed.py'))
BASE = site.base
problems = []

PUBLIC = ['/', '/projects', '/projects/finished', '/projects/1', '/events', '/events/1', '/news', '/news/1', '/stories', '/stories/seed-story',
          '/faq', '/contact', '/erasmus', '/login', '/register', '/forgot-password', '/reset-password', '/nothing-here']
MEMBER = ['/account', '/account/profile']
ADMIN = ['/admin', '/admin/members', '/admin/events', '/admin/settings', '/admin/news', '/admin/stories/add', '/admin/news/add', '/admin/scanner', '/admin/projects', '/admin/messages']


def watch(page, where, seen):
    def on_console(message):
        text = message.text
        # The attack in the seeded news: the policy blocks its handler while it is being
        # parsed and cleaned, and that is the policy working.
        if 'inline event handler' in text and '/assets/' in message.location.get('url', ''):
            return
        if message.type == 'error' and 'favicon' not in text and '404' not in text and '401' not in text:
            seen.append(f'{where}: {text[:200]}')
    page.on('console', on_console)
    page.on('pageerror', lambda e: seen.append(f'{where}: {str(e)[:200]}'))


def axe_violations(page, where):
    # Through the debugger: the site's own policy rightly refuses extra scripts.
    with open(AXE, encoding='utf-8') as f:
        page.evaluate(f.read())
    found = page.evaluate("""async () => {
      const r = await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa'], preload: false});
      return r.violations.map(v => [v.id, v.nodes.length, v.nodes.slice(0, 6).map(n => [n.target.join(' ').slice(0, 90), (n.any[0]?.data?.contrastRatio) || '', (n.any[0]?.data?.fgColor) || '', (n.any[0]?.data?.bgColor) || ''])])
    }""")
    if found:
        problems.append((where, found))


def visit(context, paths, label, audit=True):
    errors = []
    for path in paths:
        page = context.new_page()
        watch(page, f'{label} {path}', errors)
        page.goto(BASE + path, wait_until='load')
        page.wait_for_timeout(1600)
        overflow = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        if overflow > 0:
            problems.append((f'{label} {path}', f'{overflow}px sideways scroll'))
        if audit:
            axe_violations(page, f'{label} {path}')
        page.close()
    assert not errors, errors


def register(page, email):
    page.goto(f'{BASE}/register')
    boxes = page.locator('main form input')
    boxes.nth(0).fill('Test Person')
    boxes.nth(1).fill(email)
    boxes.nth(3).fill('secret-pass1')
    boxes.nth(4).fill('secret-pass1')
    page.locator('main form button[type=submit]').click()
    try:
        page.wait_for_url('**/account', timeout=15000)
    except Exception:
        print('REGISTER STUCK', page.url, page.locator('main').inner_text()[:400])
        raise


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        desktop = {'viewport': {'width': 1280, 'height': 900}}
        phone = {'viewport': {'width': 390, 'height': 844}, 'device_scale_factor': 2, 'has_touch': True, 'is_mobile': True}

        for label, options in (('desktop', desktop), ('phone', phone)):
            context = browser.new_context(**options)
            visit(context, PUBLIC, label)
            page = context.new_page()
            register(page, f'{label}@example.com')
            page.close()
            visit(context, MEMBER, label + ' member')
            context.close()
        print('public and member pages done')

        # sign-up really goes through the bot check, with no wait noticed by the person
        # (register() above already proved it). A hidden field filled in is refused.
        context = browser.new_context(**desktop)
        page = context.new_page()
        page.goto(f'{BASE}/register')
        boxes = page.locator('main form input')
        boxes.nth(0).fill('Bad Bot')
        boxes.nth(1).fill('bot@example.com')
        boxes.nth(3).fill('secret-pass1')
        boxes.nth(4).fill('secret-pass1')
        page.locator('input[name=homepage_url]').evaluate("e => { e.value = 'http://spam.example' }")
        page.locator('main form button[type=submit]').click()
        expect(page.get_by_text('Bir az gözləyib yenidən cəhd edin.')).to_be_visible(timeout=10000)
        page.close()
        print('hidden field stops a bot')

        # contact form says when it fails, and when it works
        page = context.new_page()
        page.goto(f'{BASE}/contact')
        page.locator('form input[type=text]:not([name=homepage_url])').first.fill('A Visitor')
        page.locator('form input[type=email]').fill('visitor@example.com')
        page.locator('form textarea').fill('Hello from the check')
        page.route('**/api/contact', lambda r: r.fulfill(status=500, body='boom'))
        page.locator('form button[type=submit]').click()
        expect(page.get_by_role('alert').filter(has_text='not sent')).to_be_visible(timeout=10000)
        page.unroute('**/api/contact')
        page.locator('form button[type=submit]').click()
        expect(page.get_by_text('Sent!')).to_be_visible(timeout=10000)
        page.close()
        print('contact form ok')

        # admin text cannot run code
        page = context.new_page()
        page.goto(f'{BASE}/news/1')
        expect(page.get_by_text('Safe text')).to_be_visible()
        page.wait_for_timeout(300)
        assert page.evaluate('window.__xss') is None, 'script in admin text ran'
        html_body = page.locator('main').inner_html()
        assert 'onerror' not in html_body and 'onclick' not in html_body and '<form' not in html_body.split('Safe text')[1][:200], html_body[:500]
        assert 'Seed news' in page.title(), page.title()
        page.close()
        print('admin text is cleaned')

        # titles change on the way through the site
        page = context.new_page()
        page.goto(f'{BASE}/')
        assert page.title() == 'IYDP | International Youth Dialogue Platform', page.title()
        page.goto(f'{BASE}/faq')
        assert page.title() == 'Frequently asked questions | IYDP', page.title()
        page.evaluate("history.pushState({}, '', '/contact'); dispatchEvent(new PopStateEvent('popstate'))")
        page.wait_for_function("document.title === 'Contact | IYDP'")
        page.goto(f'{BASE}/nothing-here')
        assert page.title() == 'Page not found | IYDP', page.title()
        page.close()
        print('titles ok')

        # a page file that no longer exists: one reload, then a message, never a blank page
        page = context.new_page()
        page.goto(f'{BASE}/')
        page.wait_for_timeout(500)
        page.route(re.compile(r'/assets/FAQ-'), lambda r: r.fulfill(status=404, body=''))
        reloads = []
        page.on('framenavigated', lambda f: reloads.append(f.url) if f == page.main_frame else None)
        page.get_by_role('link', name=re.compile('^FAQ', re.I)).first.click()
        expect(page.get_by_role('heading', name='Səhifə açılmadı')).to_be_visible(timeout=10000)
        expect(page.locator('footer')).to_be_visible()
        expect(page.get_by_role('banner').or_(page.locator('nav')).first).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        assert page.get_by_role('heading', name='Səhifə açılmadı').is_visible(), 'message should stay, no reload loop'
        page.close()
        print('page crash shows a message')
        context.close()

        # admin panel: styled by its own copy of tailwind, nothing blocked
        context = browser.new_context(**desktop)
        errors = []
        page = context.new_page()
        watch(page, 'admin', errors)
        page.goto(f'{BASE}/admin/login')
        page.fill('input[name=username]', 'admin')
        page.fill('input[name=password]', _bootstrap.ADMIN_PASSWORD)
        page.locator('form button[type=submit]').click()
        page.wait_for_url('**/admin**')
        for path in ADMIN:
            response = page.goto(BASE + path)
            page.wait_for_timeout(500)
            assert response.status == 200, (path, response.status)
            styled = page.evaluate("getComputedStyle(document.body).fontFamily + '|' + document.querySelectorAll('style').length")
            assert int(styled.split('|')[1]) > 0, f'{path}: tailwind did not run'
        page.goto(f'{BASE}/admin/scanner')
        page.wait_for_timeout(300)
        assert page.evaluate('typeof Html5Qrcode') == 'function', 'scanner library did not load'
        page.goto(f'{BASE}/admin/stories/add')
        page.wait_for_timeout(300)
        assert page.evaluate('typeof Sortable') == 'function', 'photo sorting library did not load'
        assert not errors, errors
        context.close()
        print('admin pages ok')
        browser.close()

    if not problems:
        print('ALL PASSED')
finally:
    site.stop()
    if problems:
        print(json.dumps(problems, ensure_ascii=False, indent=0))
        print('FAILED:', len(problems), 'pages with problems')

if problems:
    sys.exit(1)
