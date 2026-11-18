"""Test fixtures.

Clerk is replaced by a locally generated RSA key pair: the app verifies tokens with
CLERK_JWT_KEY (networkless mode) and the tests mint tokens signed with the private key,
so the real verification code path runs without any network access.
Requires TEST_DATABASE_URL pointing at a disposable Postgres database.
"""
import os
import sys
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PUBLIC_PEM = _KEY.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()
AZP = "http://localhost:5173"

os.environ.setdefault("CLERK_SECRET_KEY", "test-clerk-secret-not-real")

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from seed import seed_database  # noqa: E402


def mint_token(sub: str, *, azp: str = AZP, exp_in: int = 60, key=_KEY, **extra) -> str:
    now = int(time.time())
    claims = {"sub": sub, "azp": azp, "iat": now, "nbf": now, "exp": now + exp_in, "sid": "sess_test", **extra}
    return jwt.encode(claims, key, algorithm="RS256")


@pytest.fixture(scope="session")
def app():
    if not os.getenv("TEST_DATABASE_URL"):
        pytest.skip("Set TEST_DATABASE_URL to a disposable Postgres database to run backend tests.")
    _app = create_app("testing", {
        "CLERK_JWT_KEY": PUBLIC_PEM,
        "CLERK_AUTHORIZED_PARTIES": [AZP],
    })
    with _app.app_context():
        db.drop_all()
        db.create_all()
        seed_database(_app)
        yield _app
        db.session.remove()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def login(app):
    """Return Authorization headers for the seeded user with this email (links a Clerk id)."""
    from app.models import User

    def _login(email: str) -> dict:
        user = User.query.filter_by(email=email).one()
        if not user.clerk_user_id:
            user.clerk_user_id = f"user_{uuid.uuid4().hex[:24]}"
            db.session.commit()
        return {"Authorization": f"Bearer {mint_token(user.clerk_user_id)}"}

    return _login


@pytest.fixture
def session(app):
    yield db.session
    db.session.rollback()


@pytest.fixture
def auth_headers(login):
    return login


ADMIN = "principal@stxaviers.edu.in"
TEACHER = "ananya.sharma@stxaviers.edu.in"
PARENT = "vikram.patel@gmail.com"
SUPER = "superadmin@sms.edu.in"
