import pytest
import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.config import config_by_name
from app.extensions import db
from seed import seed_database


@pytest.fixture(scope="session")
def app():
    """Create application configured for testing and initialize test seed data."""
    if not config_by_name["testing"].DATABASE_ENABLED:
        pytest.skip(
            "BLOCKED BY DATABASE DISCONNECTION: set DATABASE_ENABLED=true and "
            "TEST_DATABASE_URL to run database-backed tests."
        )
    _app = create_app("testing")

    with _app.app_context():
        # Seed test database once per session
        seed_database(_app)
        yield _app


@pytest.fixture(scope="function")
def client(app):
    """Test HTTP client."""
    return app.test_client()


@pytest.fixture(scope="function")
def session(app):
    """Transactional database session fixture with automatic rollback."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        
        yield db.session

        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def auth_headers(client):
    """Helper fixture to obtain JWT Authorization header for a given persona."""
    def _login(email: str, password: str = "SchoolERP@Demo2026!"):
        res = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": password
        })
        data = res.get_json()
        assert res.status_code == 200, f"Login failed for {email}: {data}"
        token = data["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return _login
