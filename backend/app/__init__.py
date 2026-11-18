import logging
import os

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from app.api import register_api_blueprints
from app.config import config_by_name
from app.extensions import cors, db, limiter, migrate
from app.utils.errors import register_error_handlers


def _validate_config(app: Flask, config_name: str) -> None:
    """Fail fast instead of starting with an insecure or incomplete configuration."""
    missing = []
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        missing.append("DATABASE_URL")
    if not app.config.get("CLERK_SECRET_KEY") and not app.testing:
        missing.append("CLERK_SECRET_KEY")
    if config_name == "production":
        if not app.config.get("CLERK_AUTHORIZED_PARTIES"):
            missing.append("CLERK_AUTHORIZED_PARTIES")
        if any(o in ("*", "") for o in app.config.get("CORS_ALLOWED_ORIGINS", [])):
            raise RuntimeError("CORS_ALLOWED_ORIGINS must list explicit origins in production.")
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


def _security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cache-Control", "no-store")
    response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    return response


def create_app(config_name=None, config_overrides=None):
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_by_name.get(config_name, config_by_name["development"]))
    if config_overrides:
        app.config.update(config_overrides)

    _validate_config(app, config_name)

    if config_name == "production":
        # Render terminates TLS in front of the app; trust one proxy hop for client IP/scheme.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
        logging.basicConfig(level=logging.INFO)

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ALLOWED_ORIGINS"]}},
        allow_headers=["Authorization", "Content-Type"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        max_age=600,
    )
    limiter.init_app(app)
    register_error_handlers(app)
    register_api_blueprints(app)
    app.after_request(_security_headers)

    with app.app_context():
        from app import models  # noqa: F401  (register models for Alembic)

    return app
