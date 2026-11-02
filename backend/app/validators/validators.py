import re
from typing import Tuple, Optional, Dict, Any, List


EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    if not email or not isinstance(email, str):
        return False, "Email address is required."
    if not EMAIL_REGEX.match(email.strip()):
        return False, "Invalid email address format."
    return True, None


def validate_user_provision(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    required = ['displayName', 'role']
    for req in required:
        if not data.get(req):
            return False, f"Field '{req}' is required."

    role = str(data.get('role', '')).lower()
    if role not in ('student', 'alumni', 'faculty', 'admin'):
        return False, "Invalid role. Must be 'student', 'alumni', 'faculty', or 'admin'."

    return True, None


def validate_opportunity(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    required = ['title', 'company', 'type', 'description']
    for req in required:
        if not data.get(req) or not str(data.get(req)).strip():
            return False, f"Field '{req}' is required."

    opp_type = str(data.get('type', '')).lower()
    if opp_type not in ('job', 'internship', 'referral', 'graduate_trainee'):
        return False, "Type must be 'job', 'internship', 'referral', or 'graduate_trainee'."

    app_url = data.get('applicationUrl')
    if app_url and not (app_url.startswith('http://') or app_url.startswith('https://') or app_url.startswith('mailto:')):
        return False, "Application URL must start with http://, https://, or mailto:"

    return True, None


def validate_event(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    required = ['title', 'description', 'eventType', 'startDate', 'endDate']
    for req in required:
        if not data.get(req):
            return False, f"Field '{req}' is required."

    evt_type = str(data.get('eventType', '')).lower()
    if evt_type not in ('reunion', 'career_talk', 'webinar', 'workshop', 'mentorship_session', 'batch_event'):
        return False, "Invalid eventType."

    return True, None


def validate_achievement(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    required = ['title', 'category', 'description']
    for req in required:
        if not data.get(req) or not str(data.get(req)).strip():
            return False, f"Field '{req}' is required."

    cat = str(data.get('category', '')).lower()
    valid_cats = ('job_placement', 'promotion', 'certification', 'award', 'higher_education', 'competition', 'business_milestone', 'success_story')
    if cat not in valid_cats:
        return False, f"Invalid category. Must be one of {', '.join(valid_cats)}."

    return True, None


def validate_resource(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    required = ['title', 'description', 'category']
    for req in required:
        if not data.get(req) or not str(data.get(req)).strip():
            return False, f"Field '{req}' is required."

    cat = str(data.get('category', '')).lower()
    valid_cats = ('pdf_notes', 'study_materials', 'previous_question_papers', 'lab_resources', 'external_link', 'career_prep')
    if cat not in valid_cats:
        return False, f"Invalid category. Must be one of {', '.join(valid_cats)}."

    return True, None


def validate_support_ticket(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    required = ['category', 'subject', 'description']
    for req in required:
        if not data.get(req) or not str(data.get(req)).strip():
            return False, f"Field '{req}' is required."

    return True, None

