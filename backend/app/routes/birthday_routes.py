import logging
from flask import Blueprint, request, g
from app.auth.decorators import require_auth
from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.email_service import EmailService
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event

logger = logging.getLogger('myalumni.birthdays')
birthday_bp = Blueprint('birthdays', __name__)
user_repo = UserRepository()
notif_repo = NotificationRepository()


@birthday_bp.route('/birthdays', methods=['GET'])
@require_auth
def get_birthdays():
    """Lists today's, upcoming, and community celebrations with strict privacy (no birth years)."""
    current_uid = g.current_user.get('uid')
    birthdays = user_repo.get_birthdays(current_user_id=current_uid)
    return success_response(birthdays, message="Birthdays retrieved.")


@birthday_bp.route('/birthdays/greet', methods=['POST'])
@require_auth
def send_greeting():
    """Sends a verified birthday greeting message to a student or alumnus celebrating their birthday."""
    current = g.current_user
    sender_id = current['uid']

    # Safeguard: suspended accounts cannot send greetings
    if current.get('accountStatus') == 'suspended':
        return error_response("Suspended accounts cannot send birthday greetings.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    recipient_id = (data.get('recipientId') or data.get('recipientUserId') or '').strip()
    greeting_text = (data.get('greetingText') or data.get('message') or data.get('text') or '').strip()

    if not recipient_id:
        return error_response("Field 'recipientId' is required.", "BAD_REQUEST", 400)

    if recipient_id == sender_id:
        return error_response("You cannot send a birthday greeting to yourself.", "BAD_REQUEST", 400)

    if not greeting_text:
        return error_response("Greeting message cannot be empty.", "BAD_REQUEST", 400)

    if len(greeting_text) > 300:
        return error_response("Greeting message must not exceed 300 characters.", "BAD_REQUEST", 400)

    recipient = user_repo.get_user_with_profile(recipient_id)
    if not recipient:
        return error_response("Recipient not found.", "NOT_FOUND", 404)

    if recipient.get('accountStatus') != 'active':
        return error_response("Cannot send greetings to an inactive or suspended user account.", "BAD_REQUEST", 400)

    # Respect recipient privacy settings: cannot send if recipient opted out of community celebrations
    prof = recipient.get('profile', {})
    vis = prof.get('birthdayVisibility') or prof.get('birthday_visibility') or 'visible'
    bday_dict = prof.get('birthday')
    if isinstance(bday_dict, dict) and not bday_dict.get('isPublic', True):
        vis = 'hidden'

    if str(vis).lower() == 'hidden':
        return error_response("This member has chosen to keep their birthday private.", "FORBIDDEN", 403)

    # Duplicate submission prevention: check if greeting already sent within 24 hours
    if notif_repo.has_sent_recent_greeting(sender_id, recipient_id):
        return error_response("You have already sent a birthday wish to this member today.", "DUPLICATE_RESOURCE", 409)

    greeting = notif_repo.send_birthday_greeting(
        sender_id=sender_id,
        sender_name=current.get('displayName', 'Peer'),
        recipient_id=recipient_id,
        recipient_name=recipient.get('displayName', 'Member'),
        text=greeting_text
    )

    # Optional asynchronous/safe SMTP delivery
    recipient_email = recipient.get('email')
    if recipient_email:
        try:
            EmailService.send_birthday_greeting_email(
                to_email=recipient_email,
                recipient_name=recipient.get('displayName', 'Member'),
                sender_name=current.get('displayName', 'Peer'),
                greeting_text=greeting_text
            )
        except Exception as mail_err:
            logger.warning(f"Optional birthday email delivery skipped: {mail_err}")

    log_audit_event(
        action="SEND_BIRTHDAY_GREETING",
        actor_id=sender_id,
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="user",
        target_id=recipient_id
    )

    return success_response(greeting, message="Birthday greeting sent successfully.", status_code=201)


@birthday_bp.route('/birthdays/my-greetings', methods=['GET'])
@require_auth
def list_my_greetings():
    """Lists birthday greetings received by the current user."""
    user_id = g.current_user['uid']
    greetings = notif_repo.list_received_greetings(user_id)
    return success_response(greetings, message="Received greetings retrieved.")


@birthday_bp.route('/birthdays/my-greetings/<greeting_id>/read', methods=['PUT'])
@require_auth
def mark_greeting_read(greeting_id: str):
    """Marks a received greeting as read by the recipient."""
    user_id = g.current_user['uid']
    updated = notif_repo.mark_greeting_as_read(greeting_id, user_id)
    if not updated:
        return error_response("Greeting not found or unauthorized.", "NOT_FOUND", 404)
    return success_response(updated, message="Greeting marked as read.")


@birthday_bp.route('/birthdays/my-dob', methods=['PUT'])
@require_auth
def update_my_dob():
    """Updates the authenticated user's private Date of Birth and community visibility preference."""
    current = g.current_user
    user_id = current['uid']
    data = request.get_json() or {}

    dob = (data.get('dateOfBirth') or data.get('dob') or data.get('date_of_birth') or '').strip()
    visibility = (data.get('birthdayVisibility') or data.get('birthday_visibility') or 'visible').strip().lower()

    if visibility not in ('visible', 'hidden'):
        visibility = 'visible'

    try:
        updated = user_repo.update_birthday_and_privacy(user_id, dob=dob, visibility=visibility)
        log_audit_event(
            action="UPDATE_BIRTHDAY_PRIVACY",
            actor_id=user_id,
            actor_email=current.get('email'),
            actor_role=current.get('role'),
            target_type="user",
            target_id=user_id,
            details={"visibility": visibility}
        )
        return success_response(updated, message="Date of birth and celebration preferences updated successfully.")
    except ValueError as ve:
        return error_response(str(ve), "BAD_REQUEST", 400)
    except Exception as e:
        logger.error(f"Error updating DOB for {user_id}: {e}")
        return error_response("Failed to update date of birth.", "INTERNAL_ERROR", 500)

