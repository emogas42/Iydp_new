"""Runs every check, each in its own process with its own new database.

    pip install -r requirements-dev.txt
    npm run build                     # the checks use the built site
    pytest tests -m "not browser"     # about a minute
    pytest tests                      # also real browser runs: needs Google Chrome

They never touch instance/iydp.db, static/uploads or real mail.
"""
import glob
import os
import subprocess
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def scripts(folder):
    # Files starting with _ are helpers.
    return sorted(glob.glob(os.path.join(HERE, folder, '[!_]*.py')))


def run(path):
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    result = subprocess.run([sys.executable, path], cwd=ROOT, env=env, capture_output=True, text=True,
                            encoding='utf-8', errors='replace', timeout=600)
    assert result.returncode == 0, (result.stdout + result.stderr)[-3000:]
    assert 'PASSED' in result.stdout, result.stdout[-1000:]


@pytest.mark.parametrize('path', scripts('checks'), ids=os.path.basename)
def test_check(path):
    run(path)


@pytest.mark.browser
@pytest.mark.parametrize('path', scripts('browser'), ids=os.path.basename)
def test_in_browser(path):
    run(path)
