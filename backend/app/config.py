import os
from datetime import timedelta
from dotenv import load_dotenv

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Load environment variables from backend/.env file reliably regardless of CWD
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)
load_dotenv()  # also load CWD .env if present


def env_flag(name: str, default: bool = False) -> bool:
    """Parse a boolean environment variable ("true", "1", "yes", "on")."""
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


class BaseConfig:
    """Base configuration with shared defaults."""
    SECRET_KEY = os.getenv("SECRET_KEY", "sms-erp-default-secret-key-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sms-erp-default-jwt-secret-key")

    # Database integration switch. Disabled by default: the backend runs without
    # any database connection until DATABASE_ENABLED=true and DATABASE_URL are set
    # (e.g. Google Cloud SQL for PostgreSQL). There is no hardcoded fallback URL.
    DATABASE_ENABLED = env_flag("DATABASE_ENABLED", False)

    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") if DATABASE_ENABLED else None
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Connection pool. Opening a fresh TLS connection to a managed/remote Postgres
    # costs several seconds, so connections are kept warm for much longer and TCP
    # keepalives stop idle ones being dropped by the network in between.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,          # 30 min (was 5 min → reconnect storms)
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "connect_args": {
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            "connect_timeout": 15,
            "application_name": "school-erp",
        },
    }

    # Development/test authentication (database-free). Only honoured when
    # DATABASE_ENABLED is false and never in production.
    DEV_AUTH_ENABLED = env_flag("DEV_AUTH_ENABLED", False)
    DEV_AUTH_ACCOUNTS_FILE = os.getenv(
        "DEV_AUTH_ACCOUNTS_FILE",
        os.path.join(BACKEND_DIR, "dev_auth_accounts.json"),
    )

    # JWT Lifecycles (15 minutes access, 7 days refresh)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_REFRESH_COOKIE_PATH = "/api/v1/auth"
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_SAMESITE = "Lax"

    # Redis (optional). When REDIS_URL is unset, everything falls back to
    # in-process memory so the app runs unchanged without Redis.
    REDIS_URL = os.getenv("REDIS_URL", "").strip()

    # Rate Limiter — shared Redis store when REDIS_URL is set, else in-memory.
    RATELIMIT_DEFAULT = "120/minute"
    RATELIMIT_STORAGE_URI = REDIS_URL or "memory://"

    # Caching — Redis-backed when available, else a simple in-process cache.
    CACHE_TYPE = "RedisCache" if REDIS_URL else "SimpleCache"
    CACHE_REDIS_URL = REDIS_URL or None
    CACHE_DEFAULT_TIMEOUT = 300

    # CORS
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
        ).split(",")
    ]


class DevelopmentConfig(BaseConfig):
    """Configuration for local development."""
    DEBUG = True
    TESTING = False


class TestingConfig(BaseConfig):
    """Configuration for automated test execution."""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL") if BaseConfig.DATABASE_ENABLED else None
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    RATELIMIT_ENABLED = False


class ProductionConfig(BaseConfig):
    """Configuration for production deployment."""
    DEBUG = False
    TESTING = False
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_SAMESITE = "Strict"


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
