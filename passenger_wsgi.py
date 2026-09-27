"""Entry point used by cPanel's "Setup Python App" (Phusion Passenger)."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import app as application  # noqa: E402
