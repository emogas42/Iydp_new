"""Page titles and link previews, written into the HTML the server sends.

The site is a React app, so without this every address sends the same page. Google,
Facebook and WhatsApp read the title, description and image from this HTML.
"""
import html
import re
from urllib.parse import urljoin

from markupsafe import escape

DEFAULT_TITLE = 'IYDP | International Youth Dialogue Platform'
DEFAULT_DESCRIPTION = (
    'IYDP empowers young people through international projects, Erasmus+, European Solidarity Corps, '
    'study abroad and cross-cultural collaboration opportunities.'
)
DEFAULT_IMAGE = '/images/iydp-members.jpeg'

# path: (title, description). Keep in step with the routes in src/App.jsx.
PUBLIC_PAGES = {
    '/': (DEFAULT_TITLE, DEFAULT_DESCRIPTION),
    '/projects': ('Projects', 'International projects for young people run by IYDP.'),
    '/projects/finished': ('Finished projects', 'Projects IYDP has completed with young people.'),
    '/events': ('Events', 'Upcoming and past IYDP events.'),
    '/news': ('News', 'News from the International Youth Dialogue Platform.'),
    '/stories': ('Stories', 'Participants share their Erasmus+ and European Solidarity Corps experiences.'),
    '/faq': ('Frequently asked questions', 'Answers about IYDP, Erasmus+ and taking part in our projects.'),
    '/contact': ('Contact', 'Get in touch with the International Youth Dialogue Platform.'),
    '/erasmus': ('Erasmus+ & European Solidarity Corps', 'How young people can take part in Erasmus+ and the European Solidarity Corps.'),
    '/login': ('Daxil ol', 'IYDP hesabınıza daxil olun.'),
    '/register': ('Qeydiyyat', 'IYDP-də pulsuz hesab yaradın.'),
}

# Pages for one person: fine to open, pointless or harmful in search results.
PRIVATE_PAGES = {
    '/forgot-password': 'Şifrəni unutmusunuz?',
    '/reset-password': 'Yeni şifrə',
    '/verify-email': 'Email təsdiqi',
    '/account': 'Hesabım',
    '/account/profile': 'Profil',
}

NOT_FOUND_TITLE = 'Page not found'


def full_title(title):
    return title if title == DEFAULT_TITLE else f'{title} | IYDP'


def description_from(text, limit=160):
    """Plain text for a preview, from admin text that may hold HTML."""
    plain = html.unescape(re.sub(r'<[^>]+>', ' ', text or ''))
    plain = ' '.join(plain.split())
    if len(plain) <= limit:
        return plain or DEFAULT_DESCRIPTION
    return plain[:limit].rsplit(' ', 1)[0] + '...'


def absolute_url(site_url, path):
    return urljoin(site_url.rstrip('/') + '/', path or '')


def _set_meta(page, attribute, name, value):
    tag = f'<meta {attribute}="{name}" content="{escape(value)}" />'
    pattern = rf'<meta\s+{attribute}="{re.escape(name)}"\s+content="[^"]*"\s*/?>'
    page, found = re.subn(pattern, lambda _: tag, page, count=1)
    return page if found else page.replace('</head>', f'{tag}\n</head>', 1)


def render(page, site_url, path, title, description, image=None, noindex=False):
    """Returns the built index.html with this page's details in its head."""
    title = full_title(title)
    url = absolute_url(site_url, path.lstrip('/'))
    image_url = absolute_url(site_url, (image or DEFAULT_IMAGE).lstrip('/') if not (image or '').startswith('http') else image)

    page = re.sub(r'<title>.*?</title>', lambda _: f'<title>{escape(title)}</title>', page, count=1, flags=re.S)
    page = _set_meta(page, 'name', 'description', description)
    page = _set_meta(page, 'property', 'og:title', title)
    page = _set_meta(page, 'property', 'og:description', description)
    page = _set_meta(page, 'property', 'og:image', image_url)
    page = _set_meta(page, 'property', 'og:url', url)
    page = _set_meta(page, 'property', 'og:site_name', 'IYDP')
    page = _set_meta(page, 'name', 'twitter:card', 'summary_large_image')
    if noindex:
        page = _set_meta(page, 'name', 'robots', 'noindex')
    else:
        page = page.replace('</head>', f'<link rel="canonical" href="{escape(url)}" />\n</head>', 1)
    return page


def sitemap(urls):
    """urls: (absolute address, date or None)."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, changed in urls:
        when = f'<lastmod>{changed.date().isoformat()}</lastmod>' if changed else ''
        lines.append(f'<url><loc>{escape(url)}</loc>{when}</url>')
    lines.append('</urlset>')
    return '\n'.join(lines)
