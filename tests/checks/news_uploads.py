"""News covers and albums are uploaded as files in the admin panel, never given as links."""
import io, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap
tmp = tempfile.mkdtemp()
_bootstrap.copy_fresh_db(os.path.join(tmp, 't.db'))
os.environ['DATABASE_URL'] = _bootstrap.database_url(os.path.join(tmp, 't.db'))
os.environ.pop('ADMIN_PASSWORD', None)
sys.path.insert(0, _bootstrap.ROOT)
os.chdir(_bootstrap.ROOT)
from PIL import Image
import app as m
from werkzeug.security import generate_password_hash

app = m.app
app.config['WTF_CSRF_ENABLED'] = False
m.limiter.enabled = False
app.static_folder = os.path.join(tmp, 'static')
os.makedirs(app.static_folder)

passed = 0
def check(cond, label):
    global passed
    if not cond:
        print('FAIL:', label)
        raise SystemExit(1)
    passed += 1

def img(name, color=(20, 90, 160)):
    b = io.BytesIO(); Image.new('RGB', (1600, 900), color).save(b, 'JPEG'); b.seek(0)
    return (b, name)

def on_disk(path):
    return os.path.isfile(os.path.join(app.static_folder, path.split('/static/', 1)[1]))

with app.app_context():
    admin = m.User.query.filter_by(is_admin=True).first()
    admin.password = generate_password_hash('adminpw12345')
    m.db.session.commit()
    admin_name = admin.username

ad = app.test_client()
ad.post('/admin/login', data={'username': admin_name, 'password': 'adminpw12345'})

page = ad.get('/admin/news/add').get_data(as_text=True)
check('type="file"' in page and 'name="cover"' in page and 'name="photos"' in page, 'form asks for files')
check('type="url"' not in page and 'image_url' not in page, 'form no longer asks for a link')
check('multipart/form-data' in page, 'form can send files')

r = ad.post('/admin/news/add', data={'title': '', 'content': ''}, content_type='multipart/form-data')
check(r.status_code == 200 and b'required' in r.data, 'empty news refused')
with app.app_context():
    check(m.News.query.count() == 0, 'nothing saved when refused')

r = ad.post('/admin/news/add', data={
    'title': 'Fair day', 'content': 'We were there.', 'is_published': 'on',
    'cover': img('cover.jpg'), 'photos': [img('1.jpg'), img('2.png'), (io.BytesIO(b'nope'), 'x.jpg')],
}, content_type='multipart/form-data')
check(r.status_code == 302 and '/admin/news/edit/' in r.headers['Location'], 'a bad photo sends the admin back to the form')
with app.app_context():
    n = m.News.query.one()
    news_id, cover = n.id, n.image_url
    photo_ids = [p.id for p in n.photos]
    paths = [p.path for p in n.photos]
check(cover.startswith('/static/uploads/news/covers/') and cover.endswith('.webp') and on_disk(cover), 'cover saved as a file')
check(len(paths) == 2 and all(p.startswith('/static/uploads/news/photos/') and on_disk(p) for p in paths), 'good photos saved, bad one skipped')

data = app.test_client().get(f'/api/news/{news_id}').get_json()
check(data['cover_image'] == cover and data['album_images'] == paths, 'article shows the uploads')
listed = app.test_client().get('/api/news').get_json()['items'][0]
check(listed['cover_image'] == cover and listed['album_images'] == paths, 'news list shows the uploads')
check(app.test_client().get('/api/home').get_json()['news'][0]['cover_image'] == cover, 'home page shows the cover')

# reorder, remove a photo, replace the cover
r = ad.post(f'/admin/news/edit/{news_id}', data={
    'title': 'Fair day', 'content': 'We were there.', 'is_published': 'on',
    'photo_order': f'{photo_ids[1]},{photo_ids[0]}', 'remove_photos': str(photo_ids[0]),
    'cover': img('new.jpg', (200, 30, 30)),
}, content_type='multipart/form-data')
check(r.status_code == 302 and r.headers['Location'].endswith('/admin/news'), 'edit saved')
with app.app_context():
    n = m.db.session.get(m.News, news_id)
    check([p.path for p in n.photos] == [paths[1]], 'photo removed, the other kept')
    new_cover = n.image_url
check(new_cover != cover and on_disk(new_cover) and not on_disk(cover), 'old cover replaced and removed from disk')
check(not on_disk(paths[0]) and on_disk(paths[1]), 'removed photo deleted from disk')

# without a cover, the first album photo is the cover
ad.post(f'/admin/news/edit/{news_id}', data={'title': 'Fair day', 'content': 'We were there.', 'is_published': 'on', 'remove_cover': '1'},
        content_type='multipart/form-data')
check(not on_disk(new_cover), 'removed cover deleted from disk')
check(app.test_client().get(f'/api/news/{news_id}').get_json()['cover_image'] == paths[1], 'first photo stands in for the cover')

# a link typed into the old field is ignored
ad.post(f'/admin/news/edit/{news_id}', data={'title': 'Fair day', 'content': 'x', 'image_url': 'https://evil.example/a.jpg'},
        content_type='multipart/form-data')
with app.app_context():
    check(m.db.session.get(m.News, news_id).image_url is None, 'links are not accepted')

ad.post(f'/admin/news/delete/{news_id}')
with app.app_context():
    check(m.db.session.get(m.News, news_id) is None and m.NewsPhoto.query.count() == 0, 'news and its photos deleted')
check(not on_disk(paths[1]), 'album files deleted with the news')

print('ALL PASSED:', passed, 'checks')
