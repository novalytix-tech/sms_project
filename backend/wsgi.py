import os

from app import create_app

app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    # Local development only. Production runs: gunicorn wsgi:app
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")))
