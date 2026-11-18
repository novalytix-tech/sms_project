from flask import jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException


class APIException(Exception):
    """Base custom application exception with structured error envelope."""
    def __init__(self, message, status_code=400, error_code="BAD_REQUEST", details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}

    def to_dict(self):
        payload = {
            "success": False,
            "error": {
                "code": self.error_code,
                "message": self.message,
            }
        }
        if self.details:
            payload["error"]["details"] = self.details
        return payload


class DatabaseUnavailableError(APIException):
    """Raised when an operation needs the database while DATABASE_ENABLED is false."""
    def __init__(self, message=None):
        super().__init__(
            message=message or (
                "Database functionality is temporarily unavailable. "
                "This operation requires the database, which is currently disconnected."
            ),
            status_code=503,
            error_code="DATABASE_UNAVAILABLE",
        )


def register_error_handlers(app):
    """Register application-wide error handlers returning standard JSON envelopes."""

    @app.errorhandler(APIException)
    def handle_api_exception(error):
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed.",
                "details": error.messages,
            }
        }), 422

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": str(error.description) if hasattr(error, "description") else "Bad request.",
            }
        }), 400

    @app.errorhandler(401)
    def handle_unauthorized(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Authentication required or invalid credentials.",
            }
        }), 401

    @app.errorhandler(403)
    def handle_forbidden(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "FORBIDDEN",
                "message": "You do not have permission to access this resource.",
            }
        }), 403

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested resource was not found.",
            }
        }), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "The HTTP method is not allowed for this endpoint.",
            }
        }), 405

    @app.errorhandler(429)
    def handle_too_many_requests(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please slow down and try again later.",
            }
        }), 429

    @app.errorhandler(500)
    def handle_internal_server_error(error):
        app.logger.exception("Internal server error: %s", error)
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please contact system administration.",
            }
        }), 500

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        if isinstance(error, HTTPException):
            return jsonify({
                "success": False,
                "error": {
                    "code": error.name.upper().replace(" ", "_"),
                    "message": error.description,
                }
            }), error.code

        app.logger.exception("Unhandled unhandled exception: %s", error)
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
            }
        }), 500

