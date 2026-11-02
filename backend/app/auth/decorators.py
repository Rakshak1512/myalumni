import functools
import logging
from flask import request, g
from typing import List, Union

from app.db import get_db
from app.auth.jwt_utils import verify_auth_token
from app.utils.responses import error_response

logger = logging.getLogger('myalumni.auth')


DEMO_ACCOUNTS = {
    "admin": {
        "uid": "demo_admin_uid",
        "email": "admin.demo@myalumni.test",
        "role": "admin",
        "displayName": "Dr. Sarah Admin"
    },
    "faculty": {
        "uid": "demo_faculty_uid",
        "email": "faculty.demo@myalumni.test",
        "role": "faculty",
        "displayName": "Prof. Marcus Vance"
    },
    "student": {
        "uid": "demo_student_uid",
        "email": "student.demo@myalumni.test",
        "role": "student",
        "displayName": "Alex Chen"
    },
    "alumni": {
        "uid": "demo_alumni_uid",
        "email": "alumni.demo@myalumni.test",
        "role": "alumni",
        "displayName": "Elena Rostova"
    }
}


# Token verification utility (native PyJWT)
def verify_auth_token(token: str):
    from app.auth.jwt_utils import verify_auth_token as _verify
    return _verify(token)

verify_firebase_id_token = verify_auth_token
get_firestore_client = get_db


def require_auth(f):
    """
    Decorator that extracts and validates the token from Authorization header.
    Supports JWT tokens and instant demo user tokens.
    Loads user record from SQLite 'users' collection and sets g.current_user.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return error_response("Missing or malformed Authorization header (expected 'Bearer <token>').", "UNAUTHORIZED", 401)

        token = auth_header.split('Bearer ', 1)[1].strip()
        if not token:
            return error_response("Token string is empty.", "UNAUTHORIZED", 401)

        # 1. Check for Demo Token
        if token.startswith('demo-token-') or token.startswith('demo_token_'):
            role_part = token.replace('demo-token-', '').replace('demo_token_', '').split('_')[0].lower()
            demo_spec = DEMO_ACCOUNTS.get(role_part)
            if demo_spec:
                uid = demo_spec['uid']
                try:
                    db = get_db()
                    user_doc = db.collection('users').document(uid).get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict() or {}
                        user_data['uid'] = uid
                        user_data['isProvisioned'] = True
                        user_data['emailVerified'] = True
                        if user_data.get('role') != demo_spec['role']:
                            user_data['role'] = demo_spec['role']
                            try:
                                db.collection('users').document(uid).update({'role': demo_spec['role']})
                            except Exception:
                                pass
                        g.current_user = user_data
                    else:
                        g.current_user = {
                            "uid": uid,
                            "email": demo_spec['email'],
                            "displayName": demo_spec['displayName'],
                            "role": demo_spec['role'],
                            "accountStatus": "active",
                            "isProvisioned": True,
                            "emailVerified": True
                        }
                    return f(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Error loading demo user {uid}: {str(e)}")
                    g.current_user = {
                        "uid": uid,
                        "email": demo_spec['email'],
                        "displayName": demo_spec['displayName'],
                        "role": demo_spec['role'],
                        "accountStatus": "active",
                        "isProvisioned": True,
                        "emailVerified": True
                    }
                    return f(*args, **kwargs)

        # 2. Regular Signed JWT Token
        try:
            decoded = verify_firebase_id_token(token)
            uid = decoded.get('uid')
            email = decoded.get('email')
        except Exception as e:
            logger.warning(f"Unauthorized request: Invalid token - {str(e)}")
            return error_response("Invalid or expired authentication token. Please sign in again.", "INVALID_TOKEN", 401)

        try:
            db = get_firestore_client()
            user_doc = db.collection('users').document(uid).get()

            if not user_doc.exists:
                g.current_user = {
                    "uid": uid,
                    "email": email,
                    "role": decoded.get('role', 'student'),
                    "accountStatus": "active",
                    "isProvisioned": False,
                    "emailVerified": True,
                }
            else:
                user_data = user_doc.to_dict() or {}
                user_data['uid'] = uid
                user_data['isProvisioned'] = True
                user_data['emailVerified'] = True

                # Check account status
                status = user_data.get('accountStatus', 'active')
                if status == 'suspended':
                    return error_response("Your account has been suspended by an administrator. Please contact support.", "ACCOUNT_SUSPENDED", 403)

                g.current_user = user_data

        except Exception as e:
            logger.error(f"Error fetching user profile for {uid}: {str(e)}", exc_info=True)
            return error_response("Failed to retrieve user profile.", "INTERNAL_ERROR", 500)

        return f(*args, **kwargs)

    return decorated_function


def require_role(roles: Union[str, List[str]]):
    """
    Decorator ensuring current user has one of the specified roles.
    Must be placed after @require_auth.
    """
    if isinstance(roles, str):
        allowed_roles = [roles.lower()]
    else:
        allowed_roles = [r.lower() for r in roles]

    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = getattr(g, 'current_user', None)
            if not current_user:
                return error_response("Authentication required.", "UNAUTHORIZED", 401)

            user_role = (current_user.get('role') or '').lower()
            if user_role not in allowed_roles:
                logger.warning(f"Forbidden access: User {current_user.get('uid')} with role '{user_role}' attempted to access route requiring {allowed_roles}")
                return error_response(f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {user_role}.", "FORBIDDEN", 403)

            return f(*args, **kwargs)

        return decorated_function

    return decorator
