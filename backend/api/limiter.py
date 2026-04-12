"""
Shared Flask-Limiter instance backed by Redis.

Initialized here so route blueprints can import it without circular imports.
The limiter is bound to the Flask app in main.py via limiter.init_app(app).
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from backend.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    strategy="fixed-window",
    storage_uri=settings.REDIS_URL,
)
