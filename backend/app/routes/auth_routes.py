import uuid
import datetime
from flask import Blueprint, request, g
from werkzeug.security import generate_password_hash, check_password_hash

from app.auth.decorators import require_auth
from app.auth.jwt_utils import generate_auth_token
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService
from app.services.otp_service import OTPService
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event
from app.validators.validators import validate_user_provision, validate_email

auth_bp = Blueprint('auth', __name__)
user_repo = UserRepository()

DEMO_ROLE_MAP = {
    "admin.demo@myalumni.test": "admin",
    "faculty.demo@myalumni.test": "faculty",
    "student.demo@myalumni.test": "student",
    "alumni.demo@myalumni.test": "alumni",
    "admin@myalumni.edu": "admin",
    "faculty@myalumni.edu": "faculty",
    "student@myalumni.edu": "student",
    "alumni@myalumni.edu": "alumni",
    "admin": "admin",
    "faculty": "faculty",
    "student": "student",
    "alumni": "alumni"
}


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """
    Standard email and password login backed by SQLite.
    Returns JWT authentication token and full user profile.
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return error_response("Both email and password are required.", "INVALID_INPUT", 400)

    # Check if demo account shortcut
    if email in DEMO_ROLE_MAP or ('demo' in email and any(r in email for r in ('admin', 'faculty', 'student', 'alumni'))):
        return demo_login()

    user = user_repo.get_by_email(email)
    if not user:
        return error_response("Invalid email or password.", "INVALID_CREDENTIALS", 401)

    # Check password
    stored_hash = user.get('passwordHash')
    # Default password for seeded users is Password123!
    is_valid = False
    if stored_hash:
        is_valid = check_password_hash(stored_hash, password)
    elif password == 'Password123!' or password == 'Demo@MyAlumni2026!':
        is_valid = True

    if not is_valid:
        return error_response("Invalid email or password.", "INVALID_CREDENTIALS", 401)

    if user.get('accountStatus') == 'suspended':
        return error_response("Your account has been suspended by an administrator.", "ACCOUNT_SUSPENDED", 403)

    uid = user['id']
    role = user.get('role', 'student')
    token = generate_auth_token(uid, email, role)
    full_user = user_repo.get_user_with_profile(uid)

    log_audit_event(
        action="USER_LOGIN",
        actor_id=uid,
        actor_email=email,
        actor_role=role,
        target_type="session",
        target_id=uid
    )

    return success_response({
        "user": full_user,
        "token": token,
        "role": role
    }, message="Signed in successfully.")


@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """
    Step 1 of User Registration:
    Validates input and stages user payload in memory with a 6-digit OTP.
    CRITICAL: Does NOT insert into the database until OTP verification succeeds.
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    display_name = (data.get('displayName') or '').strip()
    requested_role = (data.get('role') or 'student').lower().strip()

    is_valid, err = validate_email(email)
    if not is_valid:
        return error_response(err, "INVALID_EMAIL", 400)

    if not password or len(password) < 8:
        return error_response("Password must be at least 8 characters long.", "WEAK_PASSWORD", 400)

    if not display_name:
        display_name = email.split('@')[0].capitalize()

    # Disallow direct registration as admin or faculty
    if requested_role in ('admin', 'faculty'):
        final_role = 'student'
    elif requested_role in ('student', 'alumni'):
        final_role = requested_role
    else:
        final_role = 'student'

    # Check if user already exists in database
    existing = user_repo.get_by_email(email)
    if existing:
        return error_response("An account with this email address already exists.", "EMAIL_ALREADY_EXISTS", 409)

    uid = str(uuid.uuid4()).replace('-', '')[:20]
    password_hash = generate_password_hash(password)

    user_payload = {
        "uid": uid,
        "email": email,
        "displayName": display_name,
        "role": final_role,
        "accountStatus": "active",
        "avatarUrl": data.get('avatarUrl', ''),
        "bio": data.get('bio', f"{final_role.title()} at MyAlumni."),
        "phone": data.get('phone', ''),
        "passwordHash": password_hash,
        "isProvisioned": True,
        "emailVerified": True,
        "profile": data.get('profile', {})
    }

    # Stage registration with 6-digit OTP (NO DATABASE WRITE YET)
    success, msg, email_sent = OTPService.stage_registration(user_payload)
    if not success:
        return error_response(msg, "OTP_DISPATCH_FAILED", 400)

    if not email_sent:
        return error_response(msg, "EMAIL_DISPATCH_FAILED", 502)

    return success_response({
        "requiresOtp": True,
        "email": email,
        "displayName": display_name,
        "role": final_role
    }, message=msg, status_code=200)


@auth_bp.route('/auth/verify-registration', methods=['POST'])
def verify_registration():
    """
    Step 2 of User Registration:
    Verifies the 6-digit OTP. On success, writes the user to the database and issues JWT.
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return error_response("Both email and 6-digit verification code are required.", "INVALID_INPUT", 400)

    is_valid, err, user_payload = OTPService.verify_registration_otp(email, otp)
    if not is_valid:
        return error_response(err or "Verification failed.", "INVALID_OTP", 400)

    # Double-check that user was not created in the interim
    existing = user_repo.get_by_email(email)
    if existing:
        return error_response("An account with this email already exists.", "EMAIL_ALREADY_EXISTS", 409)

    # COMMIT TO DATABASE ONLY NOW
    uid = user_payload['uid']
    role_profile = user_payload.pop('profile', {})
    final_role = user_payload['role']

    user = user_repo.create(user_payload, doc_id=uid)
    if role_profile:
        user_repo.update_role_profile(uid, final_role, role_profile)

    token = generate_auth_token(uid, email, final_role)
    full_user = user_repo.get_user_with_profile(uid)

    log_audit_event(
        action="USER_REGISTRATION_VERIFIED",
        actor_id=uid,
        actor_email=email,
        actor_role=final_role,
        target_type="user",
        target_id=uid,
        details={"role": final_role, "method": "email_otp"}
    )

    return success_response({
        "user": full_user,
        "token": token,
        "role": final_role
    }, message="Email verified and account activated successfully!", status_code=201)


@auth_bp.route('/auth/resend-registration-otp', methods=['POST'])
def resend_registration_otp():
    """Resends a fresh 6-digit OTP for pending registration."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return error_response("Email address is required.", "INVALID_INPUT", 400)

    success, msg, email_sent = OTPService.resend_registration_otp(email)
    if not success:
        return error_response(msg, "RESEND_COOLDOWN", 429)

    if not email_sent:
        return error_response(msg, "EMAIL_DISPATCH_FAILED", 502)

    return success_response({"email": email}, message=msg)


@auth_bp.route('/auth/test-user-otp-request', methods=['POST'])
def test_user_otp_request():
    """
    Sends a 6-digit OTP for authenticated login into verified test accounts.
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return error_response("Email address is required.", "INVALID_INPUT", 400)

    # Check if user exists and is a test user
    user = user_repo.get_by_email(email)
    if not user:
        return error_response("Account not found. Test user OTP is available for registered test accounts.", "NOT_FOUND", 404)

    # Verify if it's a test/demo account
    is_test_account = (
        email in DEMO_ROLE_MAP or
        'demo' in email or
        email.endswith('@myalumni.edu') or
        email.endswith('@myalumni.test')
    )
    if not is_test_account:
        return error_response("OTP login is reserved for test and demonstration accounts. Please use password login.", "FORBIDDEN", 403)

    success, msg, email_sent = OTPService.request_test_user_otp(email, user.get('displayName'))
    if not success:
        return error_response(msg, "OTP_COOLDOWN", 429)

    if not email_sent:
        return error_response(msg, "EMAIL_DISPATCH_FAILED", 502)

    return success_response({
        "email": email,
        "requiresOtp": True
    }, message=msg)


@auth_bp.route('/auth/test-user-otp-login', methods=['POST'])
def test_user_otp_login():
    """
    Verifies 6-digit OTP for test account login and returns authenticated session.
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return error_response("Both email and 6-digit OTP are required.", "INVALID_INPUT", 400)

    is_valid, err = OTPService.verify_test_user_otp(email, otp)
    if not is_valid:
        return error_response(err or "Invalid verification code.", "INVALID_OTP", 400)

    user = user_repo.get_by_email(email)
    if not user:
        return error_response("User account not found.", "NOT_FOUND", 404)

    uid = user['id']
    role = user.get('role', 'student')
    token = generate_auth_token(uid, email, role)
    full_user = user_repo.get_user_with_profile(uid)

    log_audit_event(
        action="TEST_USER_OTP_LOGIN",
        actor_id=uid,
        actor_email=email,
        actor_role=role,
        target_type="session",
        target_id=uid
    )

    return success_response({
        "user": full_user,
        "token": token,
        "role": role
    }, message=f"Signed in successfully as {role.title()} test user.")


@auth_bp.route('/auth/demo-login', methods=['POST'])
def demo_login():
    """
    Direct instant login for demo test roles without password requirement.
    Supports Admin, Faculty, Student, and Alumni demonstration personas.
    """
    data = request.get_json() or {}
    key = (data.get('role') or data.get('email') or '').lower().strip()
    role = DEMO_ROLE_MAP.get(key)

    if not role:
        for possible_role in ('admin', 'faculty', 'student', 'alumni'):
            if possible_role in key:
                role = possible_role
                break

    if not role:
        role = 'student'

    from app.auth.decorators import DEMO_ACCOUNTS
    demo_spec = DEMO_ACCOUNTS[role]
    uid = demo_spec['uid']

    user = user_repo.get_user_with_profile(uid)
    if not user:
        user_payload = {
            "uid": uid,
            "email": demo_spec['email'],
            "displayName": demo_spec['displayName'],
            "role": role,
            "accountStatus": "active",
            "bio": f"Verified {role.title()} demo account on MyAlumni 2.0.",
            "isProvisioned": True,
            "emailVerified": True
        }
        user = user_repo.create(user_payload, doc_id=uid)
        user['profile'] = {}

    token = f"demo-token-{role}"
    log_audit_event(
        action="DEMO_USER_LOGIN",
        actor_id=uid,
        actor_email=demo_spec['email'],
        actor_role=role,
        target_type="session",
        target_id=uid,
        details={"login_type": "no_auth_demo"}
    )

    return success_response({
        "user": user,
        "token": token,
        "role": role
    }, message=f"Signed in successfully as {role.title()} Demo.")


@auth_bp.route('/auth/sync-profile', methods=['POST'])
@require_auth
def sync_profile():
    """Syncs or creates user record and role profile in SQLite."""
    current = g.current_user
    uid = current['uid']
    email = current.get('email', '')

    data = request.get_json() or {}
    display_name = data.get('displayName', '').strip() or email.split('@')[0]
    requested_role = (data.get('role') or current.get('role') or 'student').lower()

    existing_user = user_repo.get_by_id(uid)
    if existing_user:
        final_role = existing_user.get('role', 'student')
        account_status = existing_user.get('accountStatus', 'active')
    else:
        if requested_role in ('admin', 'faculty'):
            final_role = 'student'
        else:
            final_role = requested_role
        account_status = 'active'

    user_payload = {
        "uid": uid,
        "email": email,
        "displayName": display_name,
        "role": final_role,
        "accountStatus": account_status,
        "avatarUrl": data.get('avatarUrl', ''),
        "bio": data.get('bio', ''),
        "phone": data.get('phone', ''),
    }

    user = user_repo.create(user_payload, doc_id=uid)

    role_profile = data.get('profile', {})
    if role_profile:
        user_repo.update_role_profile(uid, final_role, role_profile)

    full_user = user_repo.get_user_with_profile(uid)
    return success_response(full_user, message="Profile synced successfully.", status_code=200)


@auth_bp.route('/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Returns the authenticated user's record and role-specific profile."""
    uid = g.current_user['uid']
    user = user_repo.get_user_with_profile(uid)
    if not user:
        # Fallback to current_user info
        return success_response(g.current_user, message="Current user profile retrieved.")
    return success_response(user, message="Current user profile retrieved.")


@auth_bp.route('/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Logs the user logout action for security auditing."""
    uid = g.current_user.get('uid')
    log_audit_event(
        action="USER_LOGOUT",
        actor_id=uid,
        actor_email=g.current_user.get('email'),
        actor_role=g.current_user.get('role'),
        target_type="session",
        target_id=uid
    )
    return success_response(None, message="Logged out successfully.")


@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Requests a 6-digit OTP to reset an account password."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        is_valid, err = validate_email(email)
        if not is_valid:
            return error_response(err, "INVALID_EMAIL", 400)

        user = user_repo.get_by_email(email)
        if not user:
            # Generic safe response to prevent email probing, but don't error out
            return success_response({
                "email": email,
                "requiresOtp": True
            }, message="If an account exists with this email, a 6-digit verification code has been dispatched.")

        display_name = user.get('displayName') or user.get('display_name')
        success, msg, email_sent = OTPService.request_password_reset_otp(email, display_name)
        if not success:
            return error_response(msg, "OTP_COOLDOWN", 429)

        if not email_sent:
            logger.warning(f"Email dispatch notice for password reset {email}: {msg}")
            return error_response(msg or "Failed to dispatch verification email. Please check your credentials or try again later.", "EMAIL_DISPATCH_FAILED", 502)

        return success_response({
            "email": email,
            "requiresOtp": True
        }, message=msg)
    except Exception as e:
        logger.error(f"Error processing forgot_password: {str(e)}", exc_info=True)
        return error_response("An unexpected server error occurred while processing your password reset request. Please try again.", "INTERNAL_SERVER_ERROR", 500)


@auth_bp.route('/auth/verify-forgot-password-otp', methods=['POST'])
def verify_forgot_password_otp():
    """
    Verifies 6-digit OTP for password reset and returns a temporary one-time reset token.
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return error_response("Both email and 6-digit code are required.", "INVALID_INPUT", 400)

    is_valid, err, reset_token = OTPService.verify_password_reset_otp(email, otp)
    if not is_valid:
        return error_response(err or "Invalid verification code.", "INVALID_OTP", 400)

    return success_response({
        "email": email,
        "resetToken": reset_token
    }, message="Code verified successfully. You may now enter your new password.")


@auth_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """
    Consumes the reset token and updates the user's password securely with hashing.
    """
    data = request.get_json() or {}
    reset_token = (data.get('resetToken') or '').strip()
    new_password = data.get('newPassword', '')

    if not reset_token or not new_password:
        return error_response("Reset token and new password are required.", "INVALID_INPUT", 400)

    if len(new_password) < 8:
        return error_response("New password must be at least 8 characters long.", "WEAK_PASSWORD", 400)

    is_valid, err, email = OTPService.consume_reset_token(reset_token)
    if not is_valid:
        return error_response(err or "Invalid or expired reset session. Please request a new code.", "INVALID_TOKEN", 400)

    user = user_repo.get_by_email(email)
    if not user:
        return error_response("Account not found.", "NOT_FOUND", 404)

    uid = user['id']
    new_hash = generate_password_hash(new_password)
    user_repo.update(uid, {"passwordHash": new_hash})

    log_audit_event(
        action="PASSWORD_RESET_SUCCESS",
        actor_id=uid,
        actor_email=email,
        actor_role=user.get('role', 'student'),
        target_type="user",
        target_id=uid,
        details={"method": "email_otp"}
    )

    return success_response(None, message="Your password has been reset successfully! Please sign in with your new password.")


@auth_bp.route('/auth/check-email', methods=['POST'])
def check_email():
    """Validates email format before authentication requests."""
    data = request.get_json() or {}
    email = data.get('email', '')
    is_valid, err = validate_email(email)
    if not is_valid:
        return error_response(err, "INVALID_EMAIL", 400)
    return success_response({"email": email, "isValid": True}, message="Email format is valid.")
