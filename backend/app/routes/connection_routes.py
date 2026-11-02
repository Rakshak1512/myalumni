from flask import Blueprint, request, g
from app.auth.decorators import require_auth
from app.repositories.networking_repository import NetworkingRepository
from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response

connection_bp = Blueprint('connections', __name__)
networking_repo = NetworkingRepository()
user_repo = UserRepository()
notif_repo = NotificationRepository()


@connection_bp.route('/connections/request', methods=['POST'])
@require_auth
def send_connection_request():
    """Sends a professional networking connection request."""
    current = g.current_user
    sender_id = current['uid']
    data = request.get_json() or {}
    recipient_id = data.get('recipientId')
    message = data.get('message', '').strip()

    if not recipient_id:
        return error_response("Field 'recipientId' is required.", "BAD_REQUEST", 400)

    if recipient_id == sender_id:
        return error_response("You cannot send a connection request to yourself.", "BAD_REQUEST", 400)

    recipient = user_repo.get_by_id(recipient_id)
    if not recipient or recipient.get('accountStatus') != 'active':
        return error_response("Target user not found or is inactive.", "NOT_FOUND", 404)

    # Check for existing request
    existing = networking_repo.find_existing_connection(sender_id, recipient_id)
    if existing:
        return error_response(f"Connection request already exists with status: {existing.get('status')}.", "DUPLICATE_REQUEST", 409)

    req = networking_repo.send_connection_request(
        sender_id=sender_id,
        sender_name=current.get('displayName', 'User'),
        sender_role=current.get('role', 'student'),
        recipient_id=recipient_id,
        recipient_name=recipient.get('displayName', 'User'),
        recipient_role=recipient.get('role', 'alumni'),
        message=message
    )

    # Notify recipient
    notif_repo.create_notification(
        recipient_id=recipient_id,
        notif_type="connection_request",
        title="New Connection Request",
        message=f"{current.get('displayName')} sent you a connection request.",
        link="/#/network"
    )

    return success_response(req, message="Connection request sent successfully.", status_code=201)


@connection_bp.route('/connections', methods=['GET'])
@require_auth
def list_connections():
    """Lists all sent and received connection requests for the current user."""
    user_id = g.current_user['uid']
    connections = networking_repo.list_user_connections(user_id)
    return success_response(connections, message="Connections retrieved.")


@connection_bp.route('/connections/<request_id>/status', methods=['PUT'])
@require_auth
def update_connection_status(request_id: str):
    """Accepts or rejects an incoming connection request."""
    current_uid = g.current_user['uid']
    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ('accepted', 'rejected'):
        return error_response("Status must be either 'accepted' or 'rejected'.", "BAD_REQUEST", 400)

    req = networking_repo.conn_repo.get_by_id(request_id)
    if not req:
        return error_response("Connection request not found.", "NOT_FOUND", 404)

    if req.get('recipientId') != current_uid:
        return error_response("Only the recipient can respond to this request.", "FORBIDDEN", 403)

    updated = networking_repo.update_connection_status(request_id, new_status)

    # Notify sender
    if new_status == 'accepted':
        notif_repo.create_notification(
            recipient_id=req['senderId'],
            notif_type="connection_accepted",
            title="Connection Request Accepted",
            message=f"{g.current_user.get('displayName')} accepted your connection request.",
            link="/#/network"
        )

    return success_response(updated, message=f"Connection request {new_status}.")

