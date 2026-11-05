"""The QR scanner with a camera: Chrome's fake camera shows a member's real QR code."""
import io
import os
import sys
import tempfile

import qrcode
from PIL import Image
from playwright.sync_api import expect, sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _site import Site, _bootstrap

SEED = r'''
with m.app.app_context():
    member = m.User(username="scan@example.com", email="scan@example.com", full_name="Scan Person", password="x", is_admin=False)
    m.db.session.add(member)
    m.db.session.flush()
    member.ensure_card()
    m.db.session.add(m.Event(name="Scan Event", is_active=True, is_public=True))
    m.db.session.commit()
    from services import checkin
    with open(os.environ["SCAN_VALUE_FILE"], "w") as f:
        f.write(checkin.encode_qr_value(member))
'''

folder = tempfile.mkdtemp()
seed_file = os.path.join(folder, 'seed.py')
value_file = os.path.join(folder, 'value.txt')
with open(seed_file, 'w', encoding='utf-8') as f:
    f.write('import os\n' + SEED)
os.environ['SCAN_VALUE_FILE'] = value_file

site = Site(seed_file)
try:
    with open(value_file) as f:
        value = f.read()
    # A short film of the code, in the format Chrome accepts as a camera.
    code = qrcode.make(value, box_size=6, border=2).convert('RGB').resize((460, 460), Image.NEAREST)
    picture = Image.new('RGB', (1280, 720), 'white')
    picture.paste(code, ((1280 - code.width) // 2, (720 - code.height) // 2))
    frame = io.BytesIO()
    picture.save(frame, 'JPEG', quality=95)
    film = os.path.join(folder, 'camera.mjpeg')
    with open(film, 'wb') as f:
        for _ in range(30):
            f.write(frame.getvalue())

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True, args=[
            '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={film}'])
        context = browser.new_context(viewport={'width': 1280, 'height': 900}, permissions=['camera'])
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Content Security' in m.text else None)
        page.goto(f'{site.base}/admin/login')
        page.fill('input[name=username]', 'admin')
        page.fill('input[name=password]', _bootstrap.ADMIN_PASSWORD)
        page.locator('form button[type=submit]').click()
        page.wait_for_url('**/admin**')
        page.goto(f'{site.base}/admin/scanner')
        page.select_option('#event-select', label='Scan Event') if page.locator('#event-select option', has_text='Scan Event').count() else None
        page.locator('#start-btn').click()
        expect(page.locator('#qr-reader video')).to_be_visible(timeout=15000)
        expect(page.locator('#result-title')).to_contain_text('Scan Person', timeout=20000)
        expect(page.locator('#recent-list')).to_contain_text('Checked in')
        assert not errors, errors
        browser.close()
    print('ALL PASSED')
finally:
    site.stop()
