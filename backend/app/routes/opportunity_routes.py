from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event
from app.validators.validators import validate_opportunity

opportunity_bp = Blueprint('opportunities', __name__)
opp_repo = OpportunityRepository()
notif_repo = NotificationRepository()


@opportunity_bp.route('/opportunities', methods=['GET'])
@require_auth
def list_opportunities():
    """Lists approved jobs, internships, and referral opportunities."""
    opportunities = opp_repo.list_approved()
    return success_response(opportunities, message="Opportunities retrieved.")


@opportunity_bp.route('/opportunities/pending', methods=['GET'])
@require_auth
@require_role(['faculty', 'admin'])
def list_pending_opportunities():
    """Moderation queue for faculty and admin to review pending opportunity submissions."""
    pending = opp_repo.list_pending()
    return success_response(pending, message="Pending opportunities retrieved.")


@opportunity_bp.route('/opportunities', methods=['POST'])
@require_auth
@require_role(['alumni', 'faculty', 'admin'])
def post_opportunity():
    """Allows alumni, faculty, and admin to submit opportunities."""
    current = g.current_user
    data = request.get_json() or {}

    is_valid, err = validate_opportunity(data)
    if not is_valid:
        return error_response(err, "VALIDATION_ERROR", 400)

    # Faculty/admin posts are auto-approved; alumni submissions enter moderation
    is_privileged = current.get('role') in ('faculty', 'admin')
    initial_status = 'approved' if is_privileged else 'pending'

    opp_data = {
        "title": data['title'].strip(),
        "company": data['company'].strip(),
        "type": data['type'].lower(),
        "location": data.get('location', 'Remote').strip(),
        "isRemote": bool(data.get('isRemote', False)),
        "description": data['description'].strip(),
        "requirements": data.get('requirements', ''),
        "targetCourses": data.get('targetCourses', []),
        "targetYears": data.get('targetYears', []),
        "applicationUrl": data.get('applicationUrl', '').strip() or None,
        "attachmentUrl": data.get('attachmentUrl', '').strip() or None,
        "attachmentFilename": data.get('attachmentFilename', '').strip() or None,
        "contactEmail": data.get('contactEmail', '').strip(),
        "deadline": data.get('deadline'),
        "postedByUserId": current['uid'],
        "postedByName": current.get('displayName', 'User'),
        "postedByRole": current.get('role'),
        "status": initial_status,
        "reviewNotes": "",
        "reviewedBy": current.get('displayName') if is_privileged else None,
    }

    created = opp_repo.create(opp_data)

    log_audit_event(
        action="OPPORTUNITY_POSTED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="opportunity",
        target_id=created['id'],
        details={"title": data['title'], "status": initial_status}
    )

    msg = "Opportunity published directly." if is_privileged else "Opportunity submitted and pending moderation."
    return success_response(created, message=msg, status_code=201)


@opportunity_bp.route('/opportunities/<opp_id>/review', methods=['PUT'])
@require_auth
@require_role(['faculty', 'admin'])
def review_opportunity(opp_id: str):
    """Faculty or Admin approves or rejects a submitted opportunity."""
    current = g.current_user
    data = request.get_json() or {}
    new_status = data.get('status')
    review_notes = data.get('reviewNotes', '').strip()

    if new_status not in ('approved', 'rejected'):
        return error_response("Status must be 'approved' or 'rejected'.", "BAD_REQUEST", 400)

    opp = opp_repo.get_by_id(opp_id)
    if not opp:
        return error_response("Opportunity not found.", "NOT_FOUND", 404)

    updated = opp_repo.update(opp_id, {
        "status": new_status,
        "reviewNotes": review_notes,
        "reviewedBy": current.get('displayName'),
        "reviewedById": current['uid']
    })

    # Notify author
    author_id = opp.get('postedByUserId')
    if author_id and author_id != current['uid']:
        notif_repo.create_notification(
            recipient_id=author_id,
            notif_type="opportunity_review",
            title=f"Opportunity {new_status.title()}",
            message=f"Your posting '{opp.get('title')}' was {new_status}. {review_notes}",
            link="/#/opportunities"
        )

    log_audit_event(
        action=f"OPPORTUNITY_{new_status.upper()}",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="opportunity",
        target_id=opp_id,
        details={"status": new_status, "reviewNotes": review_notes}
    )

    return success_response(updated, message=f"Opportunity {new_status}.")


@opportunity_bp.route('/opportunities/<opp_id>/save', methods=['POST'])
@require_auth
def toggle_save(opp_id: str):
    """Toggles bookmarking an opportunity."""
    user_id = g.current_user['uid']
    is_saved = opp_repo.toggle_save_opportunity(user_id, opp_id)
    msg = "Opportunity saved to your bookmarks." if is_saved else "Opportunity removed from bookmarks."
    return success_response({"isSaved": is_saved}, message=msg)


@opportunity_bp.route('/opportunities/saved', methods=['GET'])
@require_auth
def list_saved():
    """Lists saved opportunities for the authenticated user."""
    user_id = g.current_user['uid']
    saved = opp_repo.list_saved_opportunities(user_id)
    return success_response(saved, message="Saved opportunities retrieved.")


@opportunity_bp.route('/opportunities/applications', methods=['GET'])
@require_auth
def list_applications():
    """Retrieves private application tracker items for the student."""
    user_id = g.current_user['uid']
    applications = opp_repo.get_user_applications(user_id)
    return success_response(applications, message="Application tracker records retrieved.")


@opportunity_bp.route('/opportunities/<opp_id>/apply', methods=['POST'])
@require_auth
def track_application(opp_id: str):
    """Updates or adds an opportunity to the user's private career application tracker."""
    user_id = g.current_user['uid']
    opp = opp_repo.get_by_id(opp_id)
    if not opp:
        return error_response("Opportunity not found.", "NOT_FOUND", 404)

    data = request.get_json() or {}
    status = data.get('status', 'applied').lower()
    notes = data.get('notes', '').strip()
    resume_url = data.get('resumeUrl', '').strip() or None
    resume_filename = data.get('resumeFilename', '').strip() or None

    valid_statuses = ('interested', 'applied', 'interviewing', 'offered', 'not_selected')
    if status not in valid_statuses:
        return error_response(f"Invalid status. Must be one of: {', '.join(valid_statuses)}", "BAD_REQUEST", 400)

    tracked = opp_repo.track_application(
        user_id=user_id,
        opportunity_id=opp_id,
        opp_title=opp.get('title', 'Opportunity'),
        company=opp.get('company', ''),
        status=status,
        notes=notes,
        resume_url=resume_url,
        resume_filename=resume_filename
    )

    return success_response(tracked, message="Application tracker updated.", status_code=200)

