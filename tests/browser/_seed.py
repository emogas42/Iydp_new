"""Content for the browser checks. Runs inside the test server with `m` set to the app module."""
from datetime import timedelta

with m.app.app_context():
    now = m.az_now_naive()
    news = m.News(title='Seed news', content='<p onclick="window.__xss=1">Safe text</p><img src="x" alt="" onerror="window.__xss=1"><script>window.__xss=1</script><form><input></form>', is_published=True)
    project = m.Opportunity(title='Seed project', description='About the project', requirements='What you need', is_active=True, accepts_applications=True)
    event = m.Event(name='Seed event', description='About the event', location='Baku', starts_at=now + timedelta(days=9), is_active=True, is_public=True)
    story = m.Story(title='Seed story', slug='seed-story', content='A story', author_name='A Person', is_published=True)
    message = m.ContactMessage(name='Visitor', email='visitor@example.com', message='Hello')
    m.db.session.add_all([news, project, event, story, message])
    m.db.session.flush()
    m.db.session.add(m.EventQuestion(event_id=event.id, position=0, label='Why join?', kind='short', required=True))
    m.db.session.commit()
