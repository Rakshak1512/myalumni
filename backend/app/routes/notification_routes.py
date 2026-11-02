from flask import Blueprint, request, g
from app.auth.decorators import require_auth
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response

notification_bp = Blueprint('notifications', __name__)
notif_repo = NotificationRepository()


@notification_bp.route('/notifications', methods=['GET'])
@require_auth
def list_notifications():
    """Retrieves notifications for the current user."""
    user_id = g.current_user['uid']
    limit = int(request.args.get('limit', 30))
    notifications = notif_repo.list_user_notifications(user_id, limit=limit)
    return success_response(notifications, message="Notifications retrieved.")


@notification_bp.route('/notifications/unread-count', methods=['GET'])
@require_auth
def get_unread_count():
    """Gets total unread notification count for notification badge."""
    user_id = g.current_user['uid']
    count = notif_repo.get_unread_count(user_id)
    return success_response({"unreadCount": count}, message="Unread count retrieved.")


@notification_bp.route('/notifications/<notification_id>/read', methods=['PUT'])
@require_auth
def mark_as_read(notification_id: str):
    """Marks a single notification as read."""
    user_id = g.current_user['uid']
    updated = notif_repo.mark_as_read(notification_id, user_id)
    if not updated:
        return error_response("Notification not found or access denied.", "NOT_FOUND", 404)
    return success_response(updated, message="Notification marked as read.")


@notification_bp.route('/notifications/read-all', methods=['POST'])
@require_auth
def mark_all_as_read():
    """Marks all unread notifications as read for current user."""
    user_id = g.current_user['uid']
    count = notif_repo.mark_all_as_read(user_id)
    return success_response({"markedCount": count}, message=f"Marked {count} notifications as read.")

