from sqlalchemy import text
from app.extensions import db


def test_health_endpoint_success(client):
    """Test /api/v1/health returns HTTP 200 and valid health payload."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["status"] == "healthy"
    assert json_data["data"]["service"] == "school-erp-backend"
    assert json_data["data"]["database"]["status"] == "connected"
    assert json_data["data"]["database"]["engine"] == "PostgreSQL"
    assert "PostgreSQL" in json_data["data"]["database"]["version_info"]


def test_postgresql_direct_query(app):
    """Verify direct SQLAlchemy query execution against PostgreSQL."""
    with app.app_context():
        result = db.session.execute(text("SELECT current_database();")).scalar()
        assert "school_erp" in result or "sms_erp" in result


def test_standardized_404_error_envelope(client):
    """Verify that undefined routes return standardized JSON error envelope."""
    response = client.get("/api/v1/non-existent-route")
    assert response.status_code == 404

    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error"]["code"] == "NOT_FOUND"
    assert "message" in json_data["error"]

