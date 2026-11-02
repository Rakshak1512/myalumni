import logging
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.db import get_db, get_database_status
from app.utils.responses import error_response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('myalumni')


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": config_class.ALLOWED_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Initialize SQLite Database and auto-seed test users if empty
    db = get_db()
    status = get_database_status()
    if status.get("total_documents", 0) == 0:
        logger.info("New database detected. Auto-seeding test users and initial records...")
        from app.seed import seed_sqlite_database
        seed_sqlite_database(db)
    logger.info(f"Connected to SQLite Database: {db.db_path}")

    # Register Blueprints
    from app.routes.health_routes import health_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.users_routes import users_bp
    from app.routes.connection_routes import connection_bp
    from app.routes.mentorship_routes import mentorship_bp
    from app.routes.chat_routes import chat_bp
    from app.routes.opportunity_routes import opportunity_bp
    from app.routes.event_routes import event_bp
    from app.routes.achievement_routes import achievement_bp
    from app.routes.birthday_routes import birthday_bp
    from app.routes.batch_routes import batch_bp
    from app.routes.resource_routes import resource_bp
    from app.routes.career_routes import career_bp
    from app.routes.notification_routes import notification_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.upload_routes import upload_bp

    api_prefix = '/api/v1'
    app.register_blueprint(health_bp, url_prefix=api_prefix)
    app.register_blueprint(auth_bp, url_prefix=api_prefix)
    app.register_blueprint(users_bp, url_prefix=api_prefix)
    app.register_blueprint(connection_bp, url_prefix=api_prefix)
    app.register_blueprint(mentorship_bp, url_prefix=api_prefix)
    app.register_blueprint(chat_bp, url_prefix=api_prefix)
    app.register_blueprint(opportunity_bp, url_prefix=api_prefix)
    app.register_blueprint(event_bp, url_prefix=api_prefix)
    app.register_blueprint(achievement_bp, url_prefix=api_prefix)
    app.register_blueprint(birthday_bp, url_prefix=api_prefix)
    app.register_blueprint(batch_bp, url_prefix=api_prefix)
    app.register_blueprint(resource_bp, url_prefix=api_prefix)
    app.register_blueprint(career_bp, url_prefix=api_prefix)
    app.register_blueprint(notification_bp, url_prefix=api_prefix)
    app.register_blueprint(admin_bp, url_prefix=api_prefix)
    app.register_blueprint(upload_bp, url_prefix=api_prefix)

    # Global Error Handlers

    @app.errorhandler(400)
    def handle_bad_request(e):
        return error_response("Bad request syntax or parameter error.", "BAD_REQUEST", 400)

    @app.errorhandler(404)
    def handle_not_found(e):
        return error_response("The requested API resource was not found.", "NOT_FOUND", 404)

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return error_response("HTTP method not allowed for this endpoint.", "METHOD_NOT_ALLOWED", 405)

    @app.errorhandler(500)
    def handle_server_error(e):
        logger.error(f"Internal server error: {str(e)}", exc_info=True)
        return error_response("An unexpected internal server error occurred.", "INTERNAL_SERVER_ERROR", 500)

    return app

