"""Starts the real site on a new database for a browser check. Mail goes to a file."""
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _bootstrap

SERVER = r'''
import os, sys
root, tests, port, mailfile, seed, smtp_port = sys.argv[1:7]
sys.path[:0] = [root, tests]
import _bootstrap
_bootstrap.use_fresh_db()
os.environ.update(MAIL_SERVER="smtp.invalid", MAIL_FROM="IYDP <noreply@iydp.org>", SITE_URL=f"http://127.0.0.1:{port}", SECRET_KEY="browser-test")
os.chdir(root)
import app as m
from services import mail
def capture(to, subject, body, reply_to=None):
    with open(mailfile, "a", encoding="utf-8") as f:
        f.write(body + "\n")
if smtp_port:
    os.environ.update(MAIL_SERVER="127.0.0.1", MAIL_PORT=smtp_port, MAIL_USE_TLS="0")
else:
    mail.deliver = capture
m.limiter.enabled = False
if seed:
    exec(open(seed, encoding="utf-8").read(), {"m": m})
print("ready", flush=True)
m.app.run(host="127.0.0.1", port=int(port), debug=False, use_reloader=False)
'''


class Site:
    def __init__(self, seed='', smtp_port=''):
        # A port nobody is using, so a server left over from a crash can never answer instead.
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            port = probe.getsockname()[1]
        self.base = f'http://127.0.0.1:{port}'
        folder = tempfile.mkdtemp()
        self.mailfile = os.path.join(folder, 'mail.txt')
        script = os.path.join(folder, 'server.py')
        with open(script, 'w', encoding='utf-8') as f:
            f.write(SERVER)
        tests = os.path.dirname(os.path.abspath(_bootstrap.__file__))
        self.process = subprocess.Popen([sys.executable, script, _bootstrap.ROOT, tests, str(port), self.mailfile, seed, str(smtp_port)],
                                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
        try:
            self._wait_until_ready()
        except Exception:
            self.stop()
            raise

    def _wait_until_ready(self):
        if 'ready' not in self.process.stdout.readline():
            raise RuntimeError('site did not start')
        for _ in range(60):
            try:
                urllib.request.urlopen(self.base + '/api/csrf-token')
                return
            except OSError:
                time.sleep(0.25)
        raise RuntimeError('site did not answer')

    def mail_text(self):
        if not os.path.exists(self.mailfile):
            return ''
        with open(self.mailfile, encoding='utf-8') as f:
            return f.read()

    def stop(self):
        self.process.terminate()
