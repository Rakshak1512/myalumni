import secrets
import string
import hashlib
import time
import datetime
import logging
from typing import Optional, Tuple, Dict, Any
from threading import Lock

from app.config import Config
from app.services.email_service import EmailService

logger = logging.getLogger('myalumni.otp')

# In-memory thread-safe registries for OTP operations
_REGISTRATION_STORE: Dict[str, Dict[str, Any]] = {}
_PASSWORD_RESET_STORE: Dict[str, Dict[str, Any]] = {}
_TEST_USER_OTP_STORE: Dict[str, Dict[str, Any]] = {}
_RESET_TOKENS: Dict[str, Dict[str, Any]] = {}

_lock = Lock()


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _hash_otp(email: str, otp: str) -> str:
    salt = Config.SECRET_KEY or "myalumni_otp_salt"
    payload = f"{salt}:{email.lower()}:{otp}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def _db_save_otp(email: str, purpose: str, otp_hash: str, expires_at: datetime.datetime, attempts: int = 0, payload: Optional[Dict[str, Any]] = None):
    try:
        from app.db import get_db
        db = get_db()
        doc_id = f"{purpose}_{email}"
        data = {
            "id": doc_id,
            "email": email,
            "purpose": purpose,
            "otp_hash": otp_hash,
            "attempts": attempts,
            "expires_at": expires_at.isoformat() if hasattr(expires_at, 'isoformat') else str(expires_at),
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        if payload is not None:
            data["payload"] = payload
        db.collection("otp_verifications").document(doc_id).set(data)
    except Exception as e:
        logger.debug(f"DB save OTP note: {e}")


def _db_get_otp(email: str, purpose: str) -> Optional[Dict[str, Any]]:
    try:
        from app.db import get_db
        db = get_db()
        doc_id = f"{purpose}_{email}"
        snap = db.collection("otp_verifications").document(doc_id).get()
        if snap.exists:
            d = snap.to_dict()
            exp_at = d.get('expires_at')
            if isinstance(exp_at, str):
                try:
                    exp_at = datetime.datetime.fromisoformat(exp_at)
                except Exception:
                    pass
            if isinstance(exp_at, datetime.datetime) and exp_at.tzinfo is None:
                exp_at = exp_at.replace(tzinfo=datetime.timezone.utc)

            raw_payload = d.get('payload')
            parsed_payload = None
            if isinstance(raw_payload, dict):
                parsed_payload = raw_payload
            elif isinstance(raw_payload, str) and raw_payload:
                try:
                    parsed_payload = json.loads(raw_payload)
                except Exception:
                    parsed_payload = None

            return {
                "otp_hash": d.get('otp_hash'),
                "attempts": int(d.get('attempts', 0)),
                "expires_at": exp_at,
                "created_at": d.get('created_at'),
                "payload": parsed_payload
            }
    except Exception as e:
        logger.debug(f"DB get OTP note: {e}")
    return None


def _db_delete_otp(email: str, purpose: str):
    try:
        from app.db import get_db
        db = get_db()
        doc_id = f"{purpose}_{email}"
        db.collection("otp_verifications").document(doc_id).delete()
    except Exception as e:
        logger.debug(f"DB delete OTP note: {e}")


def _db_save_reset_token(token: str, email: str, expires_at: datetime.datetime):
    try:
        from app.db import get_db
        db = get_db()
        db.collection("password_reset_tokens").document(token).set({
            "id": token,
            "token": token,
            "email": email,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
    except Exception as e:
        logger.debug(f"DB save reset token note: {e}")


def _db_get_reset_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        from app.db import get_db
        db = get_db()
        snap = db.collection("password_reset_tokens").document(token).get()
        if snap.exists:
            d = snap.to_dict()
            exp_at = d.get('expires_at')
            if isinstance(exp_at, str):
                try:
                    exp_at = datetime.datetime.fromisoformat(exp_at)
                except Exception:
                    pass
            return {
                "email": d.get('email'),
                "expires_at": exp_at
            }
    except Exception as e:
        logger.debug(f"DB get reset token note: {e}")
    return None


def _db_delete_reset_token(token: str):
    try:
        from app.db import get_db
        db = get_db()
        db.collection("password_reset_tokens").document(token).delete()
    except Exception as e:
        logger.debug(f"DB delete reset token note: {e}")


class OTPService:
    @staticmethod
    def generate_otp() -> str:
        """Generates a cryptographically secure 6-digit numerical OTP."""
        digits = string.digits
        return "".join(secrets.choice(digits) for _ in range(Config.OTP_LENGTH))

    @staticmethod
    def _is_expired(record: Dict[str, Any]) -> bool:
        if not record or not record.get('expires_at'):
            return True
        now = datetime.datetime.now(datetime.timezone.utc)
        exp = record['expires_at']
        if isinstance(exp, str):
            try:
                exp = datetime.datetime.fromisoformat(exp)
            except Exception:
                return True
        if isinstance(exp, datetime.datetime) and exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.timezone.utc)
        try:
            return now > exp
        except Exception:
            return True

    @staticmethod
    def can_resend(record: Optional[Dict[str, Any]], cooldown_seconds: int = 60) -> Tuple[bool, int]:
        """Enforces resend cooldown. Returns (can_resend, seconds_remaining)."""
        if not record:
            return True, 0
        now = datetime.datetime.now(datetime.timezone.utc)
        last_sent = record.get('last_sent_at') or record.get('created_at')
        if not last_sent:
            return True, 0
        if isinstance(last_sent, str):
            try:
                last_sent = datetime.datetime.fromisoformat(last_sent)
            except Exception:
                return True, 0
        if isinstance(last_sent, datetime.datetime) and last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=datetime.timezone.utc)
        try:
            elapsed = (now - last_sent).total_seconds()
            if elapsed < cooldown_seconds:
                return False, int(cooldown_seconds - elapsed)
        except Exception:
            return True, 0
        return True, 0

    # -------------------------------------------------------------
    # 1. REGISTRATION OTP STAGING (PERSISTENT & ZERO DB INSERTION BEFORE OTP)
    # -------------------------------------------------------------
    @classmethod
    def stage_registration(cls, user_payload: Dict[str, Any]) -> Tuple[bool, str, bool]:
        """
        Stages user registration in database and memory without adding to 'users' table.
        Generates and dispatches a 6-digit OTP via email only.
        Returns (success, message, email_sent).
        """
        email = _normalize_email(user_payload.get('email', ''))
        if not email:
            return False, "A valid email address is required.", False

        with _lock:
            existing = _REGISTRATION_STORE.get(email) or _db_get_otp(email, "registration")
            can_send, remaining = cls.can_resend(existing)
            if not can_send:
                return False, f"Please wait {remaining} seconds before requesting another verification code.", False

            otp = cls.generate_otp()
            otp_hash = _hash_otp(email, otp)
            now = datetime.datetime.now(datetime.timezone.utc)
            expires_at = now + datetime.timedelta(minutes=Config.OTP_EXPIRY_MINUTES)

            _REGISTRATION_STORE[email] = {
                "payload": user_payload,
                "otp_hash": otp_hash,
                "created_at": now,
                "last_sent_at": now,
                "expires_at": expires_at,
                "attempts": 0
            }
            _db_save_otp(email, "registration", otp_hash, expires_at, attempts=0, payload=user_payload)

        # Send OTP strictly to user's real email
        name = user_payload.get('displayName') or user_payload.get('display_name')
        email_sent, err = EmailService.send_otp_email(email, otp, purpose="registration", user_name=name)

        if email_sent:
            msg = "Verification code sent to your email address."
        else:
            msg = f"Failed to deliver email: {err}"

        return True, msg, email_sent

    @classmethod
    def resend_registration_otp(cls, email: str) -> Tuple[bool, str, bool]:
        email = _normalize_email(email)
        with _lock:
            record = _REGISTRATION_STORE.get(email) or _db_get_otp(email, "registration")
            if not record:
                return False, "No pending registration found for this email. Please register again.", False
            can_send, remaining = cls.can_resend(record)
            if not can_send:
                return False, f"Please wait {remaining} seconds before requesting a new code.", False

            otp = cls.generate_otp()
            now = datetime.datetime.now(datetime.timezone.utc)
            new_exp = now + datetime.timedelta(minutes=Config.OTP_EXPIRY_MINUTES)
            otp_hash = _hash_otp(email, otp)
            record["otp_hash"] = otp_hash
            record["last_sent_at"] = now
            record["expires_at"] = new_exp
            record["attempts"] = 0
            _REGISTRATION_STORE[email] = record
            _db_save_otp(email, "registration", otp_hash, new_exp, attempts=0, payload=record.get("payload"))

            payload = record.get("payload") or {}
            name = payload.get("displayName") or payload.get("display_name")

        email_sent, err = EmailService.send_otp_email(email, otp, purpose="registration", user_name=name)

        if email_sent:
            msg = "A fresh verification code has been dispatched to your email."
        else:
            msg = f"Failed to deliver email: {err}"

        return True, msg, email_sent

    @classmethod
    def verify_registration_otp(cls, email: str, entered_otp: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Verifies the 6-digit OTP for pending registration.
        If successful, returns the verified user payload and deletes staging record.
        """
        email = _normalize_email(email)
        clean_otp = (entered_otp or "").strip()

        with _lock:
            record = _REGISTRATION_STORE.get(email) or _db_get_otp(email, "registration")
            if not record:
                return False, "No pending registration found. The session may have expired. Please register again.", None

            if cls._is_expired(record):
                _REGISTRATION_STORE.pop(email, None)
                _db_delete_otp(email, "registration")
                return False, "Verification code has expired. Please register again.", None

            if record.get("attempts", 0) >= Config.OTP_MAX_ATTEMPTS:
                _REGISTRATION_STORE.pop(email, None)
                _db_delete_otp(email, "registration")
                return False, "Maximum verification attempts exceeded for security. Please register again.", None

            # Verify hash
            hashed_input = _hash_otp(email, clean_otp)
            if hashed_input != record["otp_hash"]:
                record["attempts"] = record.get("attempts", 0) + 1
                rem = Config.OTP_MAX_ATTEMPTS - record["attempts"]
                _REGISTRATION_STORE[email] = record
                _db_save_otp(email, "registration", record["otp_hash"], record["expires_at"], attempts=record["attempts"], payload=record.get("payload"))
                if rem <= 0:
                    _REGISTRATION_STORE.pop(email, None)
                    _db_delete_otp(email, "registration")
                    return False, "Maximum attempts exceeded. Staged registration cancelled.", None
                return False, f"Invalid verification code. {rem} attempt{'s' if rem != 1 else ''} remaining.", None

            # Success! Pop payload and invalidate staging from RAM and DB
            user_payload = record.get("payload")
            _REGISTRATION_STORE.pop(email, None)
            _db_delete_otp(email, "registration")
            return True, None, user_payload

    # -------------------------------------------------------------
    # 2. FORGOT PASSWORD OTP & SECURE RESET
    # -------------------------------------------------------------
    @classmethod
    def request_password_reset_otp(cls, email: str, user_name: Optional[str] = None) -> Tuple[bool, str, bool]:
        email = _normalize_email(email)
        with _lock:
            existing = _PASSWORD_RESET_STORE.get(email) or _db_get_otp(email, "forgot_password")
            can_send, remaining = cls.can_resend(existing)
            if not can_send:
                return False, f"Please wait {remaining} seconds before requesting another code.", False

            otp = cls.generate_otp()
            now = datetime.datetime.now(datetime.timezone.utc)
            exp_at = now + datetime.timedelta(minutes=Config.OTP_EXPIRY_MINUTES)
            otp_hash = _hash_otp(email, otp)
            _PASSWORD_RESET_STORE[email] = {
                "otp_hash": otp_hash,
                "created_at": now,
                "last_sent_at": now,
                "expires_at": exp_at,
                "attempts": 0
            }
            _db_save_otp(email, "forgot_password", otp_hash, exp_at, attempts=0)

        email_sent, err = EmailService.send_otp_email(email, otp, purpose="forgot_password", user_name=user_name)

        if email_sent:
            msg = "A 6-digit password reset code has been sent to your email."
        else:
            msg = f"Failed to deliver reset code: {err}"

        return True, msg, email_sent

    @classmethod
    def verify_password_reset_otp(cls, email: str, entered_otp: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Verifies the reset OTP. If valid, generates a short-lived reset token (15 min TTL).
        Returns (success, error_message, reset_token).
        """
        email = _normalize_email(email)
        clean_otp = (entered_otp or "").strip()

        with _lock:
            record = _PASSWORD_RESET_STORE.get(email) or _db_get_otp(email, "forgot_password")
            if not record:
                return False, "No active password reset request found for this email.", None

            if cls._is_expired(record):
                del _PASSWORD_RESET_STORE[email]
                _db_delete_otp(email, "forgot_password")
                return False, "Password reset code has expired. Please request a new one.", None

            if record["attempts"] >= Config.OTP_MAX_ATTEMPTS:
                del _PASSWORD_RESET_STORE[email]
                _db_delete_otp(email, "forgot_password")
                return False, "Maximum attempts exceeded. Please request a new code.", None

            if _hash_otp(email, clean_otp) != record["otp_hash"]:
                record["attempts"] += 1
                _db_save_otp(email, "forgot_password", record["otp_hash"], record["expires_at"], attempts=record["attempts"])
                rem = Config.OTP_MAX_ATTEMPTS - record["attempts"]
                if rem <= 0:
                    del _PASSWORD_RESET_STORE[email]
                    _db_delete_otp(email, "forgot_password")
                    return False, "Maximum attempts exceeded. Please restart the reset process.", None
                return False, f"Invalid code. {rem} attempt{'s' if rem != 1 else ''} remaining.", None

            # Invalidate OTP immediately to prevent replay
            _PASSWORD_RESET_STORE.pop(email, None)
            _db_delete_otp(email, "forgot_password")

            # Generate temporary reset token valid for 15 minutes
            reset_token = secrets.token_urlsafe(32)
            now = datetime.datetime.now(datetime.timezone.utc)
            token_exp = now + datetime.timedelta(minutes=15)
            _RESET_TOKENS[reset_token] = {
                "email": email,
                "expires_at": token_exp
            }
            _db_save_reset_token(reset_token, email, token_exp)
            return True, None, reset_token

    @classmethod
    def consume_reset_token(cls, reset_token: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Validates and invalidates a password reset token."""
        with _lock:
            record = _RESET_TOKENS.get(reset_token) or _db_get_reset_token(reset_token)
            if not record:
                return False, "Invalid or expired reset session. Please request a new code.", None

            now = datetime.datetime.now(datetime.timezone.utc)
            if now > record["expires_at"]:
                _RESET_TOKENS.pop(reset_token, None)
                _db_delete_reset_token(reset_token)
                return False, "Password reset session has timed out. Please request a new code.", None

            email = record["email"]
            _RESET_TOKENS.pop(reset_token, None)
            _db_delete_reset_token(reset_token)
            return True, None, email

    # -------------------------------------------------------------
    # 3. TEST USER OTP AUTHENTICATION
    # -------------------------------------------------------------
    @classmethod
    def request_test_user_otp(cls, email: str, display_name: Optional[str] = None) -> Tuple[bool, str, bool]:
        """Generates and dispatches a 6-digit OTP for verified test accounts."""
        email = _normalize_email(email)
        with _lock:
            existing = _TEST_USER_OTP_STORE.get(email) or _db_get_otp(email, "test_user_login")
            can_send, remaining = cls.can_resend(existing)
            if not can_send:
                return False, f"Please wait {remaining} seconds before requesting another code.", False

            otp = cls.generate_otp()
            now = datetime.datetime.now(datetime.timezone.utc)
            exp_at = now + datetime.timedelta(minutes=Config.OTP_EXPIRY_MINUTES)
            otp_hash = _hash_otp(email, otp)
            _TEST_USER_OTP_STORE[email] = {
                "otp_hash": otp_hash,
                "created_at": now,
                "last_sent_at": now,
                "expires_at": exp_at,
                "attempts": 0
            }
            _db_save_otp(email, "test_user_login", otp_hash, exp_at, attempts=0)

        email_sent, err = EmailService.send_otp_email(email, otp, purpose="test_user_login", user_name=display_name)

        if email_sent:
            msg = "Test login verification code dispatched to your email."
        else:
            msg = f"Failed to deliver login code: {err}"

        return True, msg, email_sent

    @classmethod
    def verify_test_user_otp(cls, email: str, entered_otp: str) -> Tuple[bool, Optional[str]]:
        """Verifies the test user 6-digit OTP."""
        email = _normalize_email(email)
        clean_otp = (entered_otp or "").strip()

        with _lock:
            record = _TEST_USER_OTP_STORE.get(email) or _db_get_otp(email, "test_user_login")
            if not record:
                return False, "No active test login request found. Please request a code first."

            if cls._is_expired(record):
                _TEST_USER_OTP_STORE.pop(email, None)
                _db_delete_otp(email, "test_user_login")
                return False, "Login code has expired. Please request a new code."

            if record.get("attempts", 0) >= Config.OTP_MAX_ATTEMPTS:
                _TEST_USER_OTP_STORE.pop(email, None)
                _db_delete_otp(email, "test_user_login")
                return False, "Maximum verification attempts exceeded."

            if _hash_otp(email, clean_otp) != record["otp_hash"]:
                record["attempts"] = record.get("attempts", 0) + 1
                rem = Config.OTP_MAX_ATTEMPTS - record["attempts"]
                _TEST_USER_OTP_STORE[email] = record
                _db_save_otp(email, "test_user_login", record["otp_hash"], record["expires_at"], attempts=record["attempts"])
                if rem <= 0:
                    _TEST_USER_OTP_STORE.pop(email, None)
                    _db_delete_otp(email, "test_user_login")
                    return False, "Maximum attempts exceeded."
                return False, f"Invalid code. {rem} attempt{'s' if rem != 1 else ''} remaining."

            # Consumed successfully
            _TEST_USER_OTP_STORE.pop(email, None)
            _db_delete_otp(email, "test_user_login")
            return True, None

