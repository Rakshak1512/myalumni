import datetime
import jwt
import logging
from typing import Dict, Any, Optional

from app.config import Config

logger = logging.getLogger('myalumni.auth.jwt')


def generate_auth_token(uid: str, email: str, role: str, expires_in_days: int = 7) -> str:
    """Generates a signed JWT authentication token for a user."""
    payload = {
        "uid": uid,
        "email": email,
        "role": role,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=expires_in_days)
    }
    secret = Config.SECRET_KEY or 'myalumni_default_secret_key'
    token = jwt.encode(payload, secret, algorithm='HS256')
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def verify_auth_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a signed JWT token."""
    secret = Config.SECRET_KEY or 'myalumni_default_secret_key'
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Authentication token has expired. Please log in again.")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid authentication token: {str(e)}")

