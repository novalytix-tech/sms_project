import os
from dotenv import load_dotenv

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Real environment variables (Render dashboard) always win over the local .env file.
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=False)


def _csv(name: str, default: str = "") -> list:
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]


def _database_url(name: str = "DATABASE_URL") -> str:
    url = os.getenv(name, "").strip()
    # Supabase/Render hand out postgres:// or postgresql:// URLs; SQLAlchemy wants the driver.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


class BaseConfig:
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "5")),
        "pool_timeout": 30,
        "connect_args": {"connect_timeout": 15, "application_name": "sms-backend"},
    }

    # Clerk
    CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "").strip()
    # Optional PEM public key for networkless verification (Clerk dashboard > API keys).
    CLERK_JWT_KEY = os.getenv("CLERK_JWT_KEY", "").strip()
    # Origins allowed in the session token's azp claim, e.g. https://sms.vercel.app
    CLERK_AUTHORIZED_PARTIES = _csv("CLERK_AUTHORIZED_PARTIES")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    CORS_ALLOWED_ORIGINS = _csv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

    # Rate limiting: Redis when available (multiple workers), otherwise per-process memory.
    RATELIMIT_STORAGE_URI = os.getenv("REDIS_URL", "").strip() or "memory://"
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "300 per minute")
    RATELIMIT_HEADERS_ENABLED = True

    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB request bodies max
    JSON_SORT_KEYS = False


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = _database_url("TEST_DATABASE_URL") or BaseConfig.SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    RATELIMIT_ENABLED = False


class ProductionConfig(BaseConfig):
    DEBUG = False
    PREFERRED_URL_SCHEME = "https"


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
