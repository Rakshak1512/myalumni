from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.achievement_repository import AchievementRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event
from app.validators.validators import validate_achievement

achievement_bp = Blueprint('achievements', __name__)
achieve_repo = AchievementRepository()
notif_repo = NotificationRepository()


@achievement_bp.route('/achievements', methods=['GET'])
@require_auth
def list_achievements():
    """Lists approved alumni achievements for the community feed."""
    achievements = achieve_repo.list_approved()
    return success_response(achievements, message="Achievements retrieved.")


@achievement_bp.route('/achievements/pending', methods=['GET'])
@require_auth
@require_role(['faculty', 'admin'])
def list_pending_achievements():
    """Moderation queue for faculty and admin."""
    pending = achieve_repo.list_pending()
    return success_response(pending, message="Pending achievements retrieved.")


@achievement_bp.route('/achievements/my', methods=['GET'])
@require_auth
def list_my_achievements():
    """Retrieves user's own submissions."""
    user_id = g.current_user['uid']
    user_achieve = achieve_repo.list_by_user(user_id)
    return success_response(user_achieve, message="My achievements retrieved.")


@achievement_bp.route('/achievements', methods=['POST'])
@require_auth
@require_role(['alumni', 'student', 'faculty', 'admin'])
def submit_achievement():
    """Alumni and students submit achievements (promotions, placements, awards, certifications, etc.)."""
    current = g.current_user
    data = request.get_json() or {}

    is_valid, err = validate_achievement(data)
    if not is_valid:
        return error_response(err, "VALIDATION_ERROR", 400)

    user_role = current.get('role', 'alumni')
    cert_url = (data.get('supportingUrl') or data.get('proofUrl') or '').strip()
    cert_filename = (data.get('proofFilename') or data.get('filename') or '').strip()

    record = {
        "userId": current['uid'],
        "userName": current.get('displayName', 'User'),
        "userRole": user_role,
        "title": data['title'].strip(),
        "category": data['category'].lower(),
        "description": data['description'].strip(),
        "proofUrl": cert_url or None,
        "supportingUrl": cert_url or None,
        "proofFilename": cert_filename or None,
        "fileSize": data.get('fileSize', None),
        "status": "pending",
        "reviewNotes": "",
        "reviewedBy": None
    }

    created = achieve_repo.create(record)

    log_audit_event(
        action="ACHIEVEMENT_SUBMITTED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=user_role,
        target_type="achievement",
        target_id=created['id'],
        details={"title": data['title'], "category": data['category']}
    )

    return success_response(created, message="Achievement submitted for review.", status_code=201)


@achievement_bp.route('/achievements/<achievement_id>/review', methods=['PUT'])
@require_auth
@require_role(['faculty', 'admin'])
def review_achievement(achievement_id: str):
    """Faculty or Admin reviews and approves/rejects an achievement."""
    current = g.current_user
    data = request.get_json() or {}
    new_status = data.get('status')
    review_notes = data.get('reviewNotes', '').strip()

    if new_status not in ('approved', 'rejected'):
        return error_response("Status must be 'approved' or 'rejected'.", "BAD_REQUEST", 400)

    achieve = achieve_repo.get_by_id(achievement_id)
    if not achieve:
        return error_response("Achievement not found.", "NOT_FOUND", 404)

    updated = achieve_repo.review_achievement(
        achievement_id=achievement_id,
        status=new_status,
        notes=review_notes,
        reviewer_id=current.get('displayName')
    )

    # Notify alumnus
    author_id = achieve.get('userId')
    if author_id:
        notif_repo.create_notification(
            recipient_id=author_id,
            notif_type="achievement_reviewed",
            title=f"Achievement {new_status.title()}",
            message=f"Your achievement '{achieve.get('title')}' was {new_status}. {review_notes}",
            link="/#/achievements"
        )

    log_audit_event(
        action=f"ACHIEVEMENT_{new_status.upper()}",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="achievement",
        target_id=achievement_id,
        details={"status": new_status, "reviewNotes": review_notes}
    )

    return success_response(updated, message=f"Achievement {new_status}.")

