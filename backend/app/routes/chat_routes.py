from flask import Blueprint, request, g
from app.auth.decorators import require_auth
from app.repositories.chat_repository import ChatRepository
from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response

chat_bp = Blueprint('chat', __name__)
chat_repo = ChatRepository()
user_repo = UserRepository()
notif_repo = NotificationRepository()


@chat_bp.route('/chat/conversations', methods=['GET'])
@require_auth
def list_conversations():
    """Lists all active human-to-human conversations for the authenticated user."""
    user_id = g.current_user['uid']
    conversations = chat_repo.list_user_conversations(user_id)
    return success_response(conversations, message="Conversations retrieved.")


@chat_bp.route('/chat/conversations', methods=['POST'])
@require_auth
def get_or_create_conversation():
    """Finds or starts a 1-on-1 direct conversation with another verified user."""
    current = g.current_user
    user1_id = current['uid']
    data = request.get_json() or {}
    user2_id = data.get('recipientId')

    if not user2_id:
        return error_response("Field 'recipientId' is required.", "BAD_REQUEST", 400)

    if user2_id == user1_id:
        return error_response("You cannot initiate a conversation with yourself.", "BAD_REQUEST", 400)

    recipient = user_repo.get_by_id(user2_id)
    if not recipient or recipient.get('accountStatus') != 'active':
        return error_response("Target recipient not found or is inactive.", "NOT_FOUND", 404)

    conv = chat_repo.get_or_create_conversation(
        user1_id=user1_id,
        user1_name=current.get('displayName', 'User'),
        user1_role=current.get('role', 'student'),
        user2_id=user2_id,
        user2_name=recipient.get('displayName', 'User'),
        user2_role=recipient.get('role', 'alumni')
    )

    return success_response(conv, message="Conversation ready.")


@chat_bp.route('/chat/conversations/<conversation_id>/messages', methods=['GET'])
@require_auth
def get_messages(conversation_id: str):
    """Retrieves message history for an authorized conversation."""
    user_id = g.current_user['uid']
    conv = chat_repo.get_by_id(conversation_id)
    if not conv:
        return error_response("Conversation not found.", "NOT_FOUND", 404)

    if user_id not in conv.get('participants', []):
        return error_response("Unauthorized access to this conversation.", "FORBIDDEN", 403)

    messages = chat_repo.get_messages(conversation_id)
    return success_response(messages, message="Messages retrieved.")


@chat_bp.route('/chat/conversations/<conversation_id>/messages', methods=['POST'])
@require_auth
def send_message(conversation_id: str):
    """Sends a human-to-human direct message within an authorized conversation."""
    current = g.current_user
    sender_id = current['uid']
    sender_name = current.get('displayName', 'User')

    conv = chat_repo.get_by_id(conversation_id)
    if not conv:
        return error_response("Conversation not found.", "NOT_FOUND", 404)

    participants = conv.get('participants', [])
    if sender_id not in participants:
        return error_response("You are not a participant in this conversation.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    text = data.get('text', '').strip()
    if not text:
        return error_response("Message text cannot be empty.", "BAD_REQUEST", 400)

    # Persist message
    msg = chat_repo.add_message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_name=sender_name,
        text=text
    )

    # Determine recipient
    recipient_id = [p for p in participants if p != sender_id][0] if len(participants) > 1 else None
    if recipient_id:
        notif_repo.create_notification(
            recipient_id=recipient_id,
            notif_type="new_message",
            title=f"New Message from {sender_name}",
            message=text[:80] + ("..." if len(text) > 80 else ""),
            link=f"/#/messages?conv={conversation_id}"
        )

    return success_response(msg, message="Message sent.", status_code=201)

