import os
from app import create_app
from app.extensions import socketio

env = os.getenv("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = env == "development"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, allow_unsafe_werkzeug=True)

