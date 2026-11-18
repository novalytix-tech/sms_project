from app.api.v1 import api_v1_bp

def register_api_blueprints(app):
    """Register all API version blueprints on the Flask app."""
    app.register_blueprint(api_v1_bp)

