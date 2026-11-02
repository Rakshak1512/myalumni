from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.resource_repository import ResourceRepository
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event
from app.validators.validators import validate_resource

resource_bp = Blueprint('resources', __name__)
resource_repo = ResourceRepository()


@resource_bp.route('/resources', methods=['GET'])
@require_auth
def list_resources():
    """Lists academic resources, optionally filtered by course or category."""
    course_id = request.args.get('courseId')
    category = request.args.get('category')
    resources = resource_repo.list_resources(course_id=course_id, category=category)
    return success_response(resources, message="Resources retrieved.")


@resource_bp.route('/resources', methods=['POST'])
@require_auth
@require_role(['faculty', 'admin'])
def create_resource():
    """Faculty or Admin uploads a new academic study resource or external link."""
    current = g.current_user
    data = request.get_json() or {}

    is_valid, err = validate_resource(data)
    if not is_valid:
        return error_response(err, "VALIDATION_ERROR", 400)

    res_data = {
        "title": data['title'].strip(),
        "description": data['description'].strip(),
        "category": data['category'].lower(),
        "fileUrl": data.get('fileUrl', '').strip(),
        "externalUrl": data.get('externalUrl', '').strip(),
        "targetCourseId": data.get('targetCourseId', ''),
        "targetCourseName": data.get('targetCourseName', 'All Courses'),
        "targetYearId": data.get('targetYearId', ''),
        "uploadedByUserId": current['uid'],
        "uploadedByName": current.get('displayName', 'Faculty'),
        "uploadedByRole": current.get('role'),
        "fileSize": data.get('fileSize', '1.2 MB'),
        "mimeType": data.get('mimeType', 'application/pdf'),
        "originalFilename": data.get('originalFilename', '')
    }

    created = resource_repo.create(res_data)

    log_audit_event(
        action="RESOURCE_CREATED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="resource",
        target_id=created['id'],
        details={"title": data['title'], "category": data['category']}
    )

    return success_response(created, message="Resource published.", status_code=201)


@resource_bp.route('/resources/<resource_id>', methods=['DELETE'])
@require_auth
@require_role(['faculty', 'admin'])
def delete_resource(resource_id: str):
    """Faculty or Admin removes an academic resource."""
    deleted = resource_repo.delete(resource_id)
    if not deleted:
        return error_response("Resource not found.", "NOT_FOUND", 404)
    return success_response(None, message="Resource deleted.")


@resource_bp.route('/announcements', methods=['GET'])
@require_auth
def list_announcements():
    """Lists announcements targeted to current user's role and cohort."""
    role = g.current_user.get('role', 'student')
    announcements = resource_repo.list_announcements(user_role=role)
    return success_response(announcements, message="Announcements retrieved.")


@resource_bp.route('/announcements', methods=['POST'])
@require_auth
@require_role(['faculty', 'admin'])
def create_announcement():
    """Faculty or Admin broadcasts an announcement."""
    current = g.current_user
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()

    if not title or not content:
        return error_response("Title and content are required.", "BAD_REQUEST", 400)

    ann_data = {
        "title": title,
        "content": content,
        "category": data.get('category', 'general'),
        "targetRole": data.get('targetRole', 'all'),
        "priority": data.get('priority', 'normal'),
        "publishedByUserId": current['uid'],
        "publishedByName": current.get('displayName', 'Staff'),
        "status": "published"
    }

    created = resource_repo.create_announcement(ann_data)

    log_audit_event(
        action="ANNOUNCEMENT_PUBLISHED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="announcement",
        target_id=created['id'],
        details={"title": title}
    )

    return success_response(created, message="Announcement published.", status_code=201)

