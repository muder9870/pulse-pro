"""
Shared Flask-Limiter instance.

Initialized here so route blueprints can import it without circular imports.
The limiter is bound to the Flask app in main.py via limiter.init_app(app).
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    strategy="fixed-window",
)
