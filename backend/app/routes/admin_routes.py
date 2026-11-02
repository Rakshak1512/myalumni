import logging
from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_repository import UserRepository
from app.repositories.academic_repository import AcademicRepository
from app.services.email_service import EmailService
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event
from app.validators.validators import validate_support_ticket

logger = logging.getLogger('myalumni.admin')

admin_bp = Blueprint('admin', __name__)
admin_repo = AdminRepository()
user_repo = UserRepository()
acad_repo = AcademicRepository()


@admin_bp.route('/admin/stats', methods=['GET'])
@require_auth
@require_role(['admin'])
def get_admin_stats():
    """System analytics and operational metrics for administrator dashboard."""
    stats = admin_repo.get_system_stats()
    return success_response(stats, message="System statistics retrieved.")


@admin_bp.route('/admin/users', methods=['GET'])
@require_auth
@require_role(['admin'])
def list_users():
    """Administrative user management: lists all user records."""
    users = user_repo.list_all(limit=200)
    return success_response(users, message="All users retrieved.")


@admin_bp.route('/admin/users/<user_id>/role', methods=['PUT'])
@require_auth
@require_role(['admin'])
def update_user_role(user_id: str):
    """Admin elevates or reassigns user roles (student, alumni, faculty, admin)."""
    current = g.current_user
    data = request.get_json() or {}
    new_role = (data.get('role') or '').lower()

    if new_role not in ('student', 'alumni', 'faculty', 'admin'):
        return error_response("Invalid role specified.", "BAD_REQUEST", 400)

    # Protect administrator from accidental self-demotion
    if user_id == current.get('uid') and new_role != 'admin':
        return error_response("Administrators cannot demote their own account away from admin.", "BAD_REQUEST", 400)

    # Protect designated primary admin account
    if user_id == 'demo_admin_uid' and new_role != 'admin':
        return error_response("The primary system administrator account cannot be demoted.", "BAD_REQUEST", 400)

    target_user = user_repo.get_by_id(user_id)
    if not target_user:
        return error_response("Target user not found.", "NOT_FOUND", 404)

    user_repo.update(user_id, {"role": new_role})

    log_audit_event(
        action="ADMIN_UPDATE_USER_ROLE",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="user",
        target_id=user_id,
        details={"oldRole": target_user.get('role'), "newRole": new_role}
    )

    return success_response({"userId": user_id, "role": new_role}, message=f"User role updated to {new_role}.")


@admin_bp.route('/admin/users/<user_id>/status', methods=['PUT'])
@require_auth
@require_role(['admin'])
def update_user_status(user_id: str):
    """Admin updates user account status (active, suspended)."""
    current = g.current_user
    data = request.get_json() or {}
    status = (data.get('status') or '').lower()

    if status not in ('active', 'suspended', 'pending_approval'):
        return error_response("Invalid status. Must be active, suspended, or pending_approval.", "BAD_REQUEST", 400)

    target_user = user_repo.get_by_id(user_id)
    if not target_user:
        return error_response("User not found.", "NOT_FOUND", 404)

    user_repo.update(user_id, {"accountStatus": status})

    log_audit_event(
        action="ADMIN_UPDATE_USER_STATUS",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="user",
        target_id=user_id,
        details={"oldStatus": target_user.get('accountStatus'), "newStatus": status}
    )

    return success_response({"userId": user_id, "status": status}, message=f"Account status set to {status}.")


# Courses & Academic Years
@admin_bp.route('/admin/courses', methods=['GET'])
@require_auth
def list_courses():
    courses = acad_repo.list_courses()
    return success_response(courses, message="Courses retrieved.")


@admin_bp.route('/admin/courses', methods=['POST'])
@require_auth
@require_role(['admin'])
def create_course():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    code = data.get('code', '').strip()
    if not name or not code:
        return error_response("Course name and code are required.", "BAD_REQUEST", 400)

    course = acad_repo.create_course(data)
    return success_response(course, message="Course created.", status_code=201)


@admin_bp.route('/admin/courses/<course_id>', methods=['DELETE'])
@require_auth
@require_role(['admin'])
def delete_course(course_id: str):
    deleted = acad_repo.delete_course(course_id)
    if not deleted:
        return error_response("Course not found.", "NOT_FOUND", 404)
    return success_response(None, message="Course deleted.")


@admin_bp.route('/admin/academic-years', methods=['GET'])
@require_auth
def list_academic_years():
    years = acad_repo.list_academic_years()
    return success_response(years, message="Academic years retrieved.")


@admin_bp.route('/admin/academic-years', methods=['POST'])
@require_auth
@require_role(['admin'])
def create_academic_year():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return error_response("Academic year name is required.", "BAD_REQUEST", 400)

    start_date = data.get('startDate') or data.get('start_date')
    end_date = data.get('endDate') or data.get('end_date')
    if start_date and end_date and start_date >= end_date:
        return error_response("End Date must be after Start Date.", "BAD_REQUEST", 400)

    # Check for duplicate name
    existing_years = acad_repo.list_academic_years()
    if any(y.get('name', '').strip().lower() == name.lower() for y in existing_years):
        return error_response(f"Academic year '{name}' already exists.", "DUPLICATE_RESOURCE", 409)

    is_current = bool(data.get('isCurrent') or data.get('is_current'))
    if is_current:
        for y in existing_years:
            if y.get('isCurrent') or y.get('is_current'):
                acad_repo.update_academic_year(y['id'], {'isCurrent': False, 'is_current': 0})

    year = acad_repo.create_academic_year({
        'name': name,
        'startDate': start_date,
        'endDate': end_date,
        'isCurrent': is_current
    })
    return success_response(year, message="Academic year created.", status_code=201)


@admin_bp.route('/admin/academic-years/<year_id>', methods=['PUT'])
@require_auth
@require_role(['admin'])
def update_academic_year(year_id: str):
    data = request.get_json() or {}
    year = acad_repo.years_repo.get_by_id(year_id)
    if not year:
        return error_response("Academic year not found.", "NOT_FOUND", 404)

    name = data.get('name', '').strip()
    if name and name.lower() != year.get('name', '').strip().lower():
        all_years = acad_repo.list_academic_years()
        if any(y['id'] != year_id and y.get('name', '').strip().lower() == name.lower() for y in all_years):
            return error_response(f"Academic year '{name}' already exists.", "DUPLICATE_RESOURCE", 409)

    start_date = data.get('startDate') or data.get('start_date') or year.get('startDate') or year.get('start_date')
    end_date = data.get('endDate') or data.get('end_date') or year.get('endDate') or year.get('end_date')
    if start_date and end_date and start_date >= end_date:
        return error_response("End Date must be after Start Date.", "BAD_REQUEST", 400)

    is_current = data.get('isCurrent') if 'isCurrent' in data else data.get('is_current')
    if is_current:
        all_years = acad_repo.list_academic_years()
        for y in all_years:
            if y['id'] != year_id and (y.get('isCurrent') or y.get('is_current')):
                acad_repo.update_academic_year(y['id'], {'isCurrent': False, 'is_current': 0})

    update_payload = {}
    if name:
        update_payload['name'] = name
    if start_date:
        update_payload['startDate'] = start_date
    if end_date:
        update_payload['endDate'] = end_date
    if is_current is not None:
        update_payload['isCurrent'] = bool(is_current)

    updated = acad_repo.update_academic_year(year_id, update_payload)
    return success_response(updated, message="Academic year updated.")


@admin_bp.route('/admin/academic-years/<year_id>', methods=['DELETE'])
@require_auth
@require_role(['admin'])
def delete_academic_year(year_id: str):
    deleted = acad_repo.delete_academic_year(year_id)
    if not deleted:
        return error_response("Academic year not found.", "NOT_FOUND", 404)
    return success_response(None, message="Academic year deleted.")


# Contact Admin / Support Tickets
@admin_bp.route('/admin/tickets', methods=['POST'])
@require_auth
def submit_ticket():
    """Allows any authenticated student, alumnus, or faculty member to submit a support ticket."""
    current = g.current_user
    data = request.get_json() or {}

    is_valid, err = validate_support_ticket(data)
    if not is_valid:
        return error_response(err, "VALIDATION_ERROR", 400)

    ticket = admin_repo.create_request(
        requester_id=current['uid'],
        requester_name=current.get('displayName', 'User'),
        requester_email=current.get('email', ''),
        requester_role=current.get('role', 'student'),
        category=data['category'],
        subject=data['subject'].strip(),
        description=data['description'].strip(),
        attachment_url=data.get('attachmentUrl', '').strip() or None,
        attachment_filename=data.get('attachmentFilename', '').strip() or None
    )

    log_audit_event(
        action="SUPPORT_TICKET_SUBMITTED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="adminRequest",
        target_id=ticket['id'],
        details={"category": data['category'], "subject": data['subject']}
    )

    return success_response(ticket, message="Support request submitted to administrators.", status_code=201)


@admin_bp.route('/admin/my-tickets', methods=['GET'])
@require_auth
def list_my_tickets():
    """Lists support tickets submitted by current user."""
    user_id = g.current_user['uid']
    tickets = admin_repo.list_user_requests(user_id)
    return success_response(tickets, message="My support tickets retrieved.")


@admin_bp.route('/admin/tickets', methods=['GET'])
@require_auth
@require_role(['admin'])
def list_all_tickets():
    """Admin queue for all incoming support requests."""
    status = request.args.get('status')
    if status and status.lower() in ('undefined', 'null', '', 'all', 'none'):
        status = None
    tickets = admin_repo.list_all_requests(status=status)
    return success_response(tickets, message="All support tickets retrieved.")


@admin_bp.route('/admin/tickets/<ticket_id>/respond', methods=['PUT'])
@require_auth
@require_role(['admin'])
def respond_ticket(ticket_id: str):
    """Admin responds to support ticket and dispatches email update via SMTP."""
    current = g.current_user
    data = request.get_json() or {}
    response_text = (data.get('response') or data.get('adminResponse') or '').strip()
    status = data.get('status', 'resolved')

    if not response_text:
        return error_response("Response message is required.", "BAD_REQUEST", 400)

    ticket = admin_repo.get_by_id(ticket_id)
    if not ticket:
        return error_response("Ticket not found.", "NOT_FOUND", 404)

    updated = admin_repo.respond_to_request(
        request_id=ticket_id,
        admin_id=current['uid'],
        admin_name=current.get('displayName', 'Administrator'),
        response_text=response_text,
        new_status=status
    )

    # Dispatch SMTP notification to requester (asynchronous/safe, separated from DB persistence)
    requester_email = ticket.get('requesterEmail')
    if requester_email:
        try:
            EmailService.send_contact_admin_response(
                to_email=requester_email,
                ticket_subject=ticket.get('subject', 'Support Request'),
                admin_reply=response_text
            )
        except Exception as mail_err:
            logger.warning(f"SMTP notification could not be dispatched: {mail_err}")

    log_audit_event(
        action="SUPPORT_TICKET_RESPONDED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role='admin',
        target_type="adminRequest",
        target_id=ticket_id,
        details={"status": status}
    )

    return success_response(updated, message="Response saved and dispatched to user.")


# Audit Logs
@admin_bp.route('/admin/audit-logs', methods=['GET'])
@require_auth
@require_role(['admin'])
def list_audit_logs():
    """Administrative access to immutable system audit logs."""
    limit = int(request.args.get('limit', 100))
    logs = admin_repo.list_audit_logs(limit=limit)
    return success_response(logs, message="Audit logs retrieved.")


# Reports
@admin_bp.route('/admin/reports', methods=['POST'])
@require_auth
def create_report():
    """Users can report inappropriate behavior or content."""
    current = g.current_user
    data = request.get_json() or {}
    reported_uid = data.get('reportedUserId', '')
    target_type = data.get('targetType', 'user')
    target_id = data.get('targetId', reported_uid)
    reason = data.get('reason', '').strip()
    details = data.get('details', '').strip()

    if not reason:
        return error_response("Report reason is required.", "BAD_REQUEST", 400)

    rep = admin_repo.create_report(
        reporter_id=current['uid'],
        reported_user_id=reported_uid,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        details=details
    )
    return success_response(rep, message="Report submitted for moderation.", status_code=201)


@admin_bp.route('/admin/reports', methods=['GET'])
@require_auth
@require_role(['admin'])
def list_reports():
    """Admin reviews reports."""
    reports = admin_repo.list_reports()
    return success_response(reports, message="Reports retrieved.")

