import os
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import db, bcrypt
from .utils.helpers import ApiError


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    app.url_map.strict_slashes = False
    os.makedirs(os.path.join(Config.BASE_DIR, "instance"), exist_ok=True)

    db.init_app(app)
    bcrypt.init_app(app)
    CORS(
        app,
        supports_credentials=True,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
    )

    from .routes import auth, vehicles, services, appointments, admin, technicians, payments, reports, contact, records

    for module in (auth, vehicles, services, appointments, admin, technicians, payments, reports, contact, records):
        app.register_blueprint(module.bp)

    from . import models  # noqa: F401  (registers tables)

    with app.app_context():
        db.create_all()  # automatic database initialisation

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(ApiError)
    def handle_api_error(err):
        body = {"error": err.message}
        if err.errors:
            body["errors"] = err.errors
        return jsonify(body), err.status

    @app.errorhandler(HTTPException)
    def handle_http_error(err):
        return jsonify(error=err.description or err.name), err.code

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        db.session.rollback()
        app.logger.exception(err)
        return jsonify(error="Something went wrong on the server."), 500

    return app
