import os
from flask import Flask
from app.config import config_by_name
from app.extensions import (
    db,
    migrate,
    jwt,
    cors,
    ma,
    limiter,
    socketio,
    cache,
)
from app.utils.errors import register_error_handlers
from app.api import register_api_blueprints
from app.api.v1.auth_callbacks import register_jwt_callbacks


def _validate_runtime_modes(flask_app, config_name):
    """Fail fast on unsafe or incomplete database/authentication configuration."""
    if flask_app.config.get("DATABASE_ENABLED"):
        if not flask_app.config.get("SQLALCHEMY_DATABASE_URI"):
            raise RuntimeError(
                "DATABASE_ENABLED=true but no database URL is configured "
                "(set DATABASE_URL, or TEST_DATABASE_URL for the testing config)."
            )
        if flask_app.config.get("DEV_AUTH_ENABLED"):
            flask_app.logger.warning(
                "DEV_AUTH_ENABLED is ignored because the database is enabled; "
                "database-backed authentication is in use."
            )

    if flask_app.config.get("DEV_AUTH_ENABLED") and config_name == "production":
        raise RuntimeError("DEV_AUTH_ENABLED must never be set in production.")


def create_app(config_name=None, config_overrides=None):
    """Application factory for the School ERP backend."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    flask_app = Flask(__name__)
    config_obj = config_by_name.get(config_name, config_by_name["development"])
    flask_app.config.from_object(config_obj)
    if config_overrides:
        flask_app.config.update(config_overrides)

    _validate_runtime_modes(flask_app, config_name)

    # Initialize extensions with app instance. SQLAlchemy and Alembic are only
    # bound when the database is enabled, so no engine or connection pool is
    # created while it is disconnected.
    if flask_app.config.get("DATABASE_ENABLED"):
        db.init_app(flask_app)
        migrate.init_app(flask_app, db)
    else:
        flask_app.logger.warning(
            "Database integration is disabled (DATABASE_ENABLED=false). "
            "Database-dependent endpoints will return 503 DATABASE_UNAVAILABLE."
        )
        # init_app normally registers this; keep scoped sessions from accumulating.
        flask_app.teardown_appcontext(lambda exc: db.session.remove())

    jwt.init_app(flask_app)
    register_jwt_callbacks(flask_app)
    cors.init_app(
        flask_app,
        origins=flask_app.config.get("CORS_ALLOWED_ORIGINS", "*"),
        supports_credentials=True,
    )
    ma.init_app(flask_app)
    limiter.init_app(flask_app)
    cache.init_app(flask_app)

    # Use Redis as the SocketIO message queue when configured, so realtime events
    # fan out across multiple workers/servers; falls back to single-process.
    redis_url = flask_app.config.get("REDIS_URL")
    if redis_url:
        socketio.init_app(flask_app, message_queue=redis_url)
        flask_app.logger.info("Redis connected: rate-limiting, caching, and SocketIO message queue are using Redis.")
    else:
        socketio.init_app(flask_app)

    # Register standardized error handlers
    register_error_handlers(flask_app)

    # Register API blueprints
    register_api_blueprints(flask_app)

    # Load all models so Alembic and SQLAlchemy discover entity metadata
    with flask_app.app_context():
        import app.models  # noqa: F401

    return flask_app
