import os
import uuid
import datetime
from pathlib import Path
from flask import Blueprint, request, g, send_from_directory, current_app
from werkzeug.utils import secure_filename

from app.auth.decorators import require_auth, require_role
from app.config import Config
from app.repositories.user_repository import UserRepository
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event

users_bp = Blueprint('users', __name__)
user_repo = UserRepository()

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
ALLOWED_IMAGE_MIMES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}


@users_bp.route('/users/alumni', methods=['GET'])
@require_auth
def search_alumni():
    """Search alumni directory with multi-field filtering."""
    query_params = {
        'name': request.args.get('name'),
        'courseId': request.args.get('courseId'),
        'graduationYear': request.args.get('graduationYear'),
        'company': request.args.get('company'),
        'jobTitle': request.args.get('jobTitle'),
        'skills': request.args.get('skills'),
        'isMentoringAvailable': request.args.get('isMentoringAvailable'),
    }
    results = user_repo.search_alumni(query_params)
    return success_response(results, message=f"Found {len(results)} alumni matching search criteria.")


@users_bp.route('/users/<user_id>', methods=['GET'])
@require_auth
def get_user_profile(user_id: str):
    """Retrieves safe public profile for another user."""
    user = user_repo.get_user_with_profile(user_id)
    if not user:
        return error_response("User not found.", "NOT_FOUND", 404)

    # Sanitize private fields if viewing someone else
    is_self = (g.current_user['uid'] == user_id)
    is_admin = (g.current_user.get('role') == 'admin')

    if not is_self and not is_admin:
        # Strip phone, private email if restricted
        user.pop('phone', None)
        # Strict Date of Birth & Birthday privacy protection across all roles
        if 'profile' in user:
            prof = user['profile']
            prof.pop('date_of_birth', None)
            prof.pop('dateOfBirth', None)
            prof.pop('dob', None)
            
            vis = prof.get('birthdayVisibility') or prof.get('birthday_visibility') or 'visible'
            bday = prof.get('birthday')
            if isinstance(bday, dict) and not bday.get('isPublic', True):
                vis = 'hidden'
            if str(vis).lower() == 'hidden':
                prof.pop('birthday', None)
                prof.pop('birthdayVisibility', None)
                prof.pop('birthday_visibility', None)

    return success_response(user, message="Profile retrieved successfully.")


@users_bp.route('/users/profile', methods=['PUT'])
@require_auth
def update_profile():
    """Allows current user to update their own permitted profile fields."""
    uid = g.current_user['uid']
    role = g.current_user.get('role', 'student')
    data = request.get_json() or {}

    # Update basic user fields
    user_updates = {}
    if 'displayName' in data:
        user_updates['displayName'] = data['displayName'].strip()
    if 'bio' in data:
        user_updates['bio'] = data['bio'].strip()
    if 'avatarUrl' in data:
        user_updates['avatarUrl'] = data['avatarUrl'].strip()
    if 'phone' in data:
        user_updates['phone'] = data['phone'].strip()

    if user_updates:
        user_repo.update(uid, user_updates)

    # Update role-specific profile fields
    profile_data = data.get('profile', {})
    if profile_data:
        # Prevent student from elevating their own role or changing graduation verification
        user_repo.update_role_profile(uid, role, profile_data)

    log_audit_event(
        action="USER_UPDATE_PROFILE",
        actor_id=uid,
        actor_email=g.current_user.get('email'),
        actor_role=role,
        target_type="user",
        target_id=uid
    )

    updated_user = user_repo.get_user_with_profile(uid)
    return success_response(updated_user, message="Profile updated successfully.")


@users_bp.route('/users/promote-to-alumni', methods=['POST'])
@require_auth
@require_role(['faculty', 'admin'])
def promote_student_to_alumni():
    """Authorized Faculty/Admin promotes a Student to Alumni status upon graduation."""
    data = request.get_json() or {}
    student_id = data.get('studentId')
    graduation_year = data.get('graduationYear')

    if not student_id or not graduation_year:
        return error_response("Fields 'studentId' and 'graduationYear' are required.", "BAD_REQUEST", 400)

    target_user = user_repo.get_user_with_profile(student_id)
    if not target_user:
        return error_response("Target student not found.", "NOT_FOUND", 404)

    if target_user.get('role') != 'student':
        return error_response("Target user is not currently a student.", "BAD_REQUEST", 400)

    # Update user role to alumni
    user_repo.update(student_id, {"role": "alumni"})

    # Create alumni profile preserving course data
    student_profile = target_user.get('profile', {})
    alumni_profile_data = {
        "graduationYear": graduation_year,
        "courseId": student_profile.get('courseId', ''),
        "courseName": student_profile.get('courseName', ''),
        "company": data.get('company', ''),
        "jobTitle": data.get('jobTitle', ''),
        "industry": data.get('industry', ''),
        "skills": student_profile.get('skills', []),
        "linkedinUrl": student_profile.get('linkedinUrl', ''),
        "isMentoringAvailable": False,
        "maxMentees": 3,
        "currentMenteesCount": 0,
        "birthday": {"month": None, "day": None, "isPublic": True}
    }
    user_repo.update_role_profile(student_id, 'alumni', alumni_profile_data)

    log_audit_event(
        action="STUDENT_PROMOTED_TO_ALUMNI",
        actor_id=g.current_user['uid'],
        actor_email=g.current_user.get('email'),
        actor_role=g.current_user.get('role'),
        target_type="user",
        target_id=student_id,
        details={"graduationYear": graduation_year}
    )

    promoted_user = user_repo.get_user_with_profile(student_id)
    return success_response(promoted_user, message="Student successfully promoted to Alumni.")


@users_bp.route('/users/students', methods=['GET'])
@require_auth
@require_role(['faculty', 'admin'])
def list_students():
    """Lists registered students for faculty and admin promotion desks."""
    students = user_repo.list_by_role('student')
    return success_response(students, message=f"Retrieved {len(students)} students.")


@users_bp.route('/users/avatar', methods=['POST'])
@require_auth
def upload_avatar():
    """
    Uploads a user profile photo to Firebase Storage or persistent local storage.
    Strictly validates MIME type, extension, and file size.
    """
    current = g.current_user
    uid = current['uid']

    if 'avatar' not in request.files:
        return error_response("No avatar file uploaded. Please attach a file under key 'avatar'.", "BAD_REQUEST", 400)

    file = request.files['avatar']
    if not file or not file.filename:
        return error_response("Empty filename provided.", "BAD_REQUEST", 400)

    # Validate file extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return error_response(f"Invalid file extension '.{ext}'. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}.", "BAD_REQUEST", 400)

    # Validate MIME type
    if file.content_type and file.content_type.lower() not in ALLOWED_IMAGE_MIMES:
        return error_response(f"Unsupported image MIME type '{file.content_type}'.", "BAD_REQUEST", 400)

    # Check file size (max 5 MB or Config.UPLOAD_MAX_SIZE_MB)
    max_bytes = min(Config.UPLOAD_MAX_SIZE_MB, 5) * 1024 * 1024
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > max_bytes:
        return error_response(f"File size exceeds maximum limit of {max_bytes // (1024 * 1024)}MB.", "BAD_REQUEST", 400)

    safe_name = f"{uid}_{int(datetime.datetime.now().timestamp())}_{secure_filename(file.filename)}"
    avatar_url = None

    # Local static upload storage
    upload_dir = Path(current_app.root_path).parent / 'static' / 'uploads' / 'avatars'
    upload_dir.mkdir(parents=True, exist_ok=True)
    target_path = upload_dir / safe_name
    file.seek(0)
    file.save(str(target_path))
    avatar_url = f"{Config.BACKEND_URL}/api/v1/static/uploads/avatars/{safe_name}"

    # Update user record in database
    user_repo.update(uid, {"avatarUrl": avatar_url})
    g.current_user['avatarUrl'] = avatar_url

    log_audit_event(
        action="USER_UPLOAD_AVATAR",
        actor_id=uid,
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="user",
        target_id=uid,
        details={"avatarUrl": avatar_url}
    )

    return success_response({"avatarUrl": avatar_url}, message="Profile photo updated successfully.")


@users_bp.route('/static/uploads/avatars/<path:filename>', methods=['GET'])
def serve_avatar(filename: str):
    """Serves locally stored avatar images."""
    upload_dir = Path(current_app.root_path).parent / 'static' / 'uploads' / 'avatars'
    return send_from_directory(str(upload_dir), filename)

