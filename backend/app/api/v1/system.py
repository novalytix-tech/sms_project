import time
from datetime import datetime, timezone
from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from app.extensions import db
from app.services.dev_auth_service import is_dev_auth_active

system_bp = Blueprint("system", __name__)
START_TIME = time.time()


@system_bp.route("/health", methods=["GET"])
def health_check():
    """System health check endpoint reporting API and database status."""
    database_enabled = current_app.config.get("DATABASE_ENABLED", False)
    db_status = "disabled"
    db_version = None
    is_healthy = True

    if database_enabled:
        db_status = "disconnected"
        db_version = "unknown"
        try:
            # Execute query to verify PostgreSQL connectivity
            result = db.session.execute(text("SELECT version();")).scalar()
            if result:
                db_status = "connected"
                db_version = result.split(",")[0]
        except Exception as e:
            is_healthy = False
            db_status = f"error: {str(e)}"

    uptime_seconds = int(time.time() - START_TIME)
    status_code = 200 if is_healthy else 503

    if not database_enabled:
        message = "API is operational. Database integration is disabled (DATABASE_ENABLED=false)."
    elif is_healthy:
        message = "System is operational."
    else:
        message = "System is degraded; database connection failed."

    return jsonify({
        "success": is_healthy,
        "data": {
            "status": "healthy" if is_healthy else "degraded",
            "service": "school-erp-backend",
            "version": "1.0.0",
            "uptime_seconds": uptime_seconds,
            "database": {
                "enabled": database_enabled,
                "status": db_status,
                "engine": "PostgreSQL",
                "version_info": db_version,
            },
            "auth_mode": "development" if is_dev_auth_active() else ("database" if database_enabled else "unavailable"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "message": message
    }), status_code
