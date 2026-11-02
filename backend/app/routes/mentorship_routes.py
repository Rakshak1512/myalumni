from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.networking_repository import NetworkingRepository
from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response

mentorship_bp = Blueprint('mentorship', __name__)
networking_repo = NetworkingRepository()
user_repo = UserRepository()
notif_repo = NotificationRepository()


@mentorship_bp.route('/mentorship/request', methods=['POST'])
@require_auth
@require_role(['student'])
def request_mentorship():
    """Allows a student to request mentorship from an available alumnus."""
    student = g.current_user
    student_id = student['uid']
    data = request.get_json() or {}
    mentor_id = data.get('mentorId')
    goals = data.get('goals', '').strip()
    message = data.get('message', '').strip()

    if not mentor_id:
        return error_response("Field 'mentorId' is required.", "BAD_REQUEST", 400)

    if mentor_id == student_id:
        return error_response("You cannot request mentorship from yourself.", "BAD_REQUEST", 400)

    mentor_user = user_repo.get_user_with_profile(mentor_id)
    if not mentor_user or mentor_user.get('role') != 'alumni':
        return error_response("Selected mentor must be an active alumni member.", "BAD_REQUEST", 400)

    alumni_prof = mentor_user.get('profile', {})
    if not alumni_prof.get('isMentoringAvailable', False):
        return error_response("This alumnus is not currently accepting mentorship requests.", "BAD_REQUEST", 400)

    # Check mentee capacity
    max_m = alumni_prof.get('maxMentees', 3)
    curr_m = alumni_prof.get('currentMenteesCount', 0)
    if curr_m >= max_m:
        return error_response("This mentor has reached their maximum mentee capacity.", "BAD_REQUEST", 400)

    # Check for existing pending/accepted mentorship
    existing = networking_repo.find_existing_mentorship(student_id, mentor_id)
    if existing:
        return error_response(f"You already have an active or pending mentorship request with this mentor (status: {existing.get('status')}).", "DUPLICATE_REQUEST", 409)

    req = networking_repo.send_mentorship_request(
        student_id=student_id,
        student_name=student.get('displayName', 'Student'),
        mentor_id=mentor_id,
        mentor_name=mentor_user.get('displayName', 'Alumnus'),
        goals=goals,
        message=message
    )

    notif_repo.create_notification(
        recipient_id=mentor_id,
        notif_type="mentorship_request",
        title="New Mentorship Request",
        message=f"{student.get('displayName')} requested you as a career mentor.",
        link="/#/mentorship"
    )

    return success_response(req, message="Mentorship request submitted successfully.", status_code=201)


@mentorship_bp.route('/mentorship', methods=['GET'])
@require_auth
def list_mentorships():
    """Lists all mentorship connections for the current user."""
    user_id = g.current_user['uid']
    mentorships = networking_repo.list_user_mentorships(user_id)
    return success_response(mentorships, message="Mentorships retrieved.")


@mentorship_bp.route('/mentorship/<request_id>/status', methods=['PUT'])
@require_auth
def update_mentorship_status(request_id: str):
    """Accepts, rejects, or ends a mentorship relationship."""
    current_uid = g.current_user['uid']
    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ('accepted', 'rejected', 'completed'):
        return error_response("Status must be 'accepted', 'rejected', or 'completed'.", "BAD_REQUEST", 400)

    req = networking_repo.mentor_repo.get_by_id(request_id)
    if not req:
        return error_response("Mentorship request not found.", "NOT_FOUND", 404)

    is_mentor = (req.get('mentorId') == current_uid)
    is_student = (req.get('studentId') == current_uid)

    if new_status in ('accepted', 'rejected') and not is_mentor:
        return error_response("Only the mentor can accept or reject requests.", "FORBIDDEN", 403)
    if new_status == 'completed' and not (is_mentor or is_student):
        return error_response("Only participating members can complete a mentorship.", "FORBIDDEN", 403)

    updated = networking_repo.update_mentorship_status(request_id, new_status)

    # Adjust mentee counts
    mentor_id = req.get('mentorId')
    mentor_user = user_repo.get_user_with_profile(mentor_id)
    if mentor_user and 'profile' in mentor_user:
        current_count = mentor_user['profile'].get('currentMenteesCount', 0)
        if new_status == 'accepted':
            user_repo.update_role_profile(mentor_id, 'alumni', {'currentMenteesCount': current_count + 1})
            notif_repo.create_notification(
                recipient_id=req['studentId'],
                notif_type="mentorship_accepted",
                title="Mentorship Request Accepted!",
                message=f"{mentor_user.get('displayName')} has accepted your mentorship request.",
                link="/#/mentorship"
            )
        elif new_status == 'completed' and req.get('status') == 'accepted':
            user_repo.update_role_profile(mentor_id, 'alumni', {'currentMenteesCount': max(0, current_count - 1)})

    return success_response(updated, message=f"Mentorship status updated to {new_status}.")


@mentorship_bp.route('/mentorship/preferences', methods=['PUT'])
@require_auth
@require_role(['alumni'])
def update_mentorship_preferences():
    """Allows alumni to toggle availability and set max mentee capacity."""
    alumni_id = g.current_user['uid']
    data = request.get_json() or {}

    updates = {}
    if 'isMentoringAvailable' in data:
        updates['isMentoringAvailable'] = bool(data['isMentoringAvailable'])
    if 'maxMentees' in data:
        updates['maxMentees'] = max(1, min(10, int(data['maxMentees'])))

    updated_profile = user_repo.update_role_profile(alumni_id, 'alumni', updates)
    return success_response(updated_profile, message="Mentorship preferences updated.")

