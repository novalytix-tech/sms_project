from flask import current_app
from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.session import Session
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_marshmallow import Marshmallow
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO
from flask_caching import Cache
from app.utils.errors import DatabaseUnavailableError


class GuardedSession(Session):
    """Session whose commit fails while the database is disabled.

    An empty commit never resolves an engine, so without this a write endpoint
    that received no records could still report success.
    """

    def commit(self):
        if not current_app.config.get("DATABASE_ENABLED", False):
            raise DatabaseUnavailableError()
        return super().commit()


class GuardedSQLAlchemy(SQLAlchemy):
    """SQLAlchemy that refuses to resolve an engine while DATABASE_ENABLED is false.

    Every query, flush and commit resolves its bind through ``engines``, so this is
    the single point where a disconnected database surfaces as a 503 response
    instead of a connection attempt.
    """

    @property
    def engines(self):
        if not current_app.config.get("DATABASE_ENABLED", False):
            raise DatabaseUnavailableError()
        return super().engines


# Singleton extension instances
db = GuardedSQLAlchemy(session_options={"class_": GuardedSession})
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
ma = Marshmallow()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120 per minute"],
)
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")
cache = Cache()
