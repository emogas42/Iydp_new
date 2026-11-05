"""Admin-built forms for events and projects: questions, answers, decisions and notices."""
import re
from datetime import datetime

from models import db, EventRegistration, Notification, QUESTION_KINDS, CHOICE_KINDS, utcnow
from services import mail

MAX_QUESTIONS = 50
MAX_OPTIONS = 30
ANSWER_LIMITS = {'short': 500, 'long': 5000, 'number': 30}
NUMBER_RE = re.compile(r'^-?\d+([.,]\d+)?$')
DECISIONS = ('approved', 'rejected')


class EventFull(Exception):
    pass


def clean_questions(raw):
    """Validates the builder's JSON. Returns (rows, errors)."""
    if not isinstance(raw, list):
        return [], ['The form could not be read. Please try again.']
    if len(raw) > MAX_QUESTIONS:
        return [], [f'A form can have at most {MAX_QUESTIONS} questions.']

    rows, errors = [], []
    for number, item in enumerate(raw, start=1):
        item = item if isinstance(item, dict) else {}
        label = str(item.get('label') or '').strip()
        kind = item.get('kind')
        if not label:
            errors.append(f'Question {number}: please write the question.')
        elif len(label) > 300:
            errors.append(f'Question {number}: the question is too long (300 characters at most).')
        if kind not in QUESTION_KINDS:
            errors.append(f'Question {number}: please choose an answer type.')

        options = []
        if kind in CHOICE_KINDS:
            raw_options = item.get('options')
            for option in raw_options if isinstance(raw_options, list) else []:
                option = str(option or '').strip()[:200]
                if option and option not in options:
                    options.append(option)
            if len(options) > MAX_OPTIONS:
                errors.append(f'Question {number}: {MAX_OPTIONS} options at most.')
            minimum = 1 if kind == 'multiple' else 2
            if len(options) < minimum:
                errors.append(f'Question {number}: add at least {minimum} different options.')

        rows.append({
            'id': item.get('id') if isinstance(item.get('id'), int) else None,
            'label': label,
            'help_text': str(item.get('help_text') or '').strip()[:500] or None,
            'kind': kind,
            'required': item.get('required') is True,
            'options': options or None,
        })
    return rows, errors


def apply_questions(owner, question_class, rows):
    """Answers already received are snapshots, so editing the form never changes them."""
    existing = {q.id: q for q in owner.questions}
    kept = []
    for position, row in enumerate(rows):
        # An id from another event or project is treated as a new question.
        question = existing.get(row['id']) or question_class()
        question.position = position
        question.label = row['label']
        question.help_text = row['help_text']
        question.kind = row['kind']
        question.required = row['required']
        question.options = row['options']
        kept.append(question)
    owner.questions = kept


def clean_answers(owner, raw):
    """Checks answers against the owner's questions. Returns (snapshot, {question id: error})."""
    raw = raw if isinstance(raw, dict) else {}
    snapshot, errors = [], {}
    for q in owner.questions:
        given = raw.get(str(q.id))
        options = q.options or []
        if q.kind == 'multiple':
            value = [o for o in options if isinstance(given, list) and o in given]
            if isinstance(given, list) and len(value) != len({str(g) for g in given}):
                errors[q.id] = 'Please choose from the options shown.'
        else:
            value = '' if isinstance(given, (list, dict)) or given is None else str(given).strip()
            if value:
                if q.kind in ANSWER_LIMITS and len(value) > ANSWER_LIMITS[q.kind]:
                    errors[q.id] = f'This answer is too long ({ANSWER_LIMITS[q.kind]} characters at most).'
                elif q.kind in CHOICE_KINDS and value not in options:
                    errors[q.id] = 'Please choose from the options shown.'
                elif q.kind == 'number' and not NUMBER_RE.match(value):
                    errors[q.id] = 'Please enter a number.'
                elif q.kind == 'date' and not _is_date(value):
                    errors[q.id] = 'Please enter a valid date.'
        if q.required and not value:
            errors[q.id] = 'This question is required.'
        snapshot.append({'question_id': q.id, 'label': q.label, 'kind': q.kind, 'value': value})
    return snapshot, errors


def _is_date(value):
    try:
        datetime.strptime(value, '%Y-%m-%d')
    except ValueError:
        return False
    return True


def decide(registration, decision, note, admin, site_url):
    """Records the decision and tells the member. Returns False if nothing changed.

    Raises EventFull when approving would pass the seat limit.
    """
    if decision == registration.status:
        return False

    event = registration.event
    registration.status = decision
    registration.decision_note = note or None
    registration.decided_at = utcnow()
    registration.decided_by_id = admin.id
    db.session.flush()
    # Counted after the write, so two admins approving at once cannot both take the last seat.
    if decision == 'approved' and event.capacity is not None:
        approved = EventRegistration.query.filter_by(event_id=event.id, status='approved').count()
        if approved > event.capacity:
            db.session.rollback()
            raise EventFull()

    approved = decision == 'approved'
    title, body = _notice(
        event.name, approved, note, 'təsdiqləndi',
        'İştirakınız təsdiqləndi. Girişdə üzvlük kartınızdakı QR kodu göstərin.',
    )
    db.session.add(Notification(
        user_id=registration.user_id, event_id=event.id, title=title, body=body, link=f'/events/{event.id}',
    ))
    db.session.commit()

    # After the commit: a mail server problem must never undo the decision.
    english = (f'Your application for {event.name} has been approved. '
               'Please show the QR code on your membership card at the entrance.'
               if approved else _english_rejection(event.name))
    details = []
    if approved:
        details = [event.starts_at.strftime('%d.%m.%Y, %H:%M') if event.starts_at else None, event.location]
    registration.email_status = _email(
        registration.user, title, body, english, note, [d for d in details if d], f'/events/{event.id}', site_url,
    )
    db.session.commit()
    return True


def notify_project_decision(application, site_url):
    """Tells the applicant about an accepted or rejected project application."""
    project = application.opportunity
    approved = application.status == 'accepted'
    note = application.decision_note
    next_step = 'Növbəti addımlar barədə sizinlə əlaqə saxlayacağıq.'
    title, body = _notice(project.title, approved, note, 'qəbul olundu', f'Müraciətiniz qəbul olundu. {next_step}')
    db.session.add(Notification(
        user_id=application.user_id, opportunity_id=project.id, title=title, body=body, link=f'/projects/{project.id}',
    ))
    db.session.commit()

    english = (f'Your application for {project.title} has been accepted. We will contact you about the next steps.'
               if approved else _english_rejection(project.title))
    application.email_status = _email(
        application.user, title, body, english, note, [], f'/projects/{project.id}', site_url,
    )
    db.session.commit()


def _english_rejection(name):
    return f'Unfortunately we could not accept your application for {name} this time. Thank you for your interest.'


def _notice(name, approved, note, approved_word, approved_body):
    if approved:
        title = f'Müraciətiniz {approved_word}: {name}'
        body = approved_body
    else:
        title = f'Müraciətiniz qəbul olunmadı: {name}'
        body = 'Təəssüf ki, bu dəfə müraciətinizi qəbul edə bilmədik. Marağınız üçün təşəkkür edirik.'
    if note:
        body = f'{body}\n\n{note}'
    return title, body


def _email(user, title, body, english, note, details, path, site_url):
    if not mail.is_configured():
        return 'off'
    if not user.email:
        return 'none'
    if note:
        english = f'{english}\n\n{note}'
    parts = [f'Salam, {user.display_name}!', body]
    if details:
        parts.append('\n'.join(details))
    parts += [english, f'{site_url.rstrip("/")}{path}']
    return 'sent' if mail.send(user.email, title, '\n\n'.join(parts)) else 'failed'
