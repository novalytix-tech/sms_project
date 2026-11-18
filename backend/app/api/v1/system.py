from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from app.auth import public
from app.extensions import db

system_bp = Blueprint("system", __name__)


@system_bp.route("/health", methods=["GET"])
@public
def health_check():
    """Liveness/readiness probe for Render. Reveals no versions or error details."""
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"success": True, "data": {"status": "healthy", "database": "connected"}}), 200
    except Exception:
        current_app.logger.exception("Health check: database unreachable")
        db.session.rollback()
        return jsonify({"success": False, "data": {"status": "degraded", "database": "unreachable"}}), 503
