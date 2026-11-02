from flask import Blueprint
from app.db import get_database_status
from app.utils.responses import success_response

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return success_response({
        "status": "healthy",
        "service": "MyAlumni 2.0 Backend API",
        "version": "2.0.0"
    }, message="API service is operating normally.")


@health_bp.route('/health/db', methods=['GET'])
def db_health_check():
    """Detailed Database health check."""
    status = get_database_status()
    is_ok = status.get('initialized', True)
    code = 200 if is_ok else 503
    msg = "Database operational." if is_ok else "Database error."
    return success_response(status, message=msg, status_code=code)
