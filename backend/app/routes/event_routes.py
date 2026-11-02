from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.event_repository import EventRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit_event
from app.validators.validators import validate_event

event_bp = Blueprint('events', __name__)
event_repo = EventRepository()
notif_repo = NotificationRepository()


@event_bp.route('/events', methods=['GET'])
@require_auth
def list_events():
    """Lists approved upcoming events and reunions."""
    events = event_repo.list_approved_events()
    return success_response(events, message="Events retrieved.")


@event_bp.route('/events/pending', methods=['GET'])
@require_auth
@require_role(['faculty', 'admin'])
def list_pending_events():
    """Moderation queue for submitted events."""
    pending = event_repo.list_pending_events()
    return success_response(pending, message="Pending events retrieved.")


@event_bp.route('/events', methods=['POST'])
@require_auth
def create_event():
    """Creates a new event or submits for approval."""
    current = g.current_user
    data = request.get_json() or {}

    is_valid, err = validate_event(data)
    if not is_valid:
        return error_response(err, "VALIDATION_ERROR", 400)

    is_privileged = current.get('role') in ('faculty', 'admin')
    initial_status = 'approved' if is_privileged else 'pending'

    event_data = {
        "title": data['title'].strip(),
        "description": data['description'].strip(),
        "eventType": data['eventType'].lower(),
        "startDate": data['startDate'],
        "endDate": data['endDate'],
        "locationType": data.get('locationType', 'in_person'),
        "venueOrUrl": data.get('venueOrUrl', '').strip(),
        "targetCourses": data.get('targetCourses', []),
        "targetBatches": data.get('targetBatches', []),
        "capacity": int(data['capacity']) if data.get('capacity') else None,
        "registrationDeadline": data.get('registrationDeadline'),
        "registeredCount": 0,
        "organizerId": current['uid'],
        "organizerName": current.get('displayName', 'User'),
        "organizerRole": current.get('role'),
        "status": initial_status,
        "bannerUrl": data.get('bannerUrl', '').strip(),
        "attachmentUrl": data.get('attachmentUrl', '').strip(),
    }

    created = event_repo.create(event_data)

    log_audit_event(
        action="EVENT_CREATED",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="event",
        target_id=created['id'],
        details={"title": data['title'], "status": initial_status}
    )

    msg = "Event created and published." if is_privileged else "Event submitted for administrative review."
    return success_response(created, message=msg, status_code=201)


@event_bp.route('/events/<event_id>/review', methods=['PUT'])
@require_auth
@require_role(['faculty', 'admin'])
def review_event(event_id: str):
    """Faculty or Admin approves, rejects, or cancels an event."""
    current = g.current_user
    data = request.get_json() or {}
    status = data.get('status')

    if status not in ('approved', 'rejected', 'cancelled'):
        return error_response("Status must be 'approved', 'rejected', or 'cancelled'.", "BAD_REQUEST", 400)

    event = event_repo.get_by_id(event_id)
    if not event:
        return error_response("Event not found.", "NOT_FOUND", 404)

    updated = event_repo.update(event_id, {"status": status})

    log_audit_event(
        action=f"EVENT_{status.upper()}",
        actor_id=current['uid'],
        actor_email=current.get('email'),
        actor_role=current.get('role'),
        target_type="event",
        target_id=event_id,
        details={"status": status}
    )

    return success_response(updated, message=f"Event status set to {status}.")


@event_bp.route('/events/<event_id>/register', methods=['POST'])
@require_auth
def register_for_event(event_id: str):
    """Registers the current user for an approved event."""
    current = g.current_user
    try:
        reg = event_repo.register_for_event(
            event_id=event_id,
            user_id=current['uid'],
            user_name=current.get('displayName', 'User'),
            user_email=current.get('email', ''),
            user_role=current.get('role', 'student')
        )
        return success_response(reg, message="Registered for event successfully.", status_code=201)
    except ValueError as e:
        return error_response(str(e), "REGISTRATION_FAILED", 400)


@event_bp.route('/events/<event_id>/register', methods=['DELETE'])
@require_auth
def cancel_registration(event_id: str):
    """Cancels registration for an event."""
    current_uid = g.current_user['uid']
    cancelled = event_repo.cancel_registration(event_id, current_uid)
    if not cancelled:
        return error_response("No active registration found for this event.", "NOT_FOUND", 404)
    return success_response(None, message="Event registration cancelled.")


@event_bp.route('/events/my-registrations', methods=['GET'])
@require_auth
def list_my_registrations():
    """Lists all events the authenticated user is registered for."""
    user_id = g.current_user['uid']
    regs = event_repo.list_user_registrations(user_id)
    return success_response(regs, message="Registrations retrieved.")


@event_bp.route('/events/<event_id>/attendees', methods=['GET'])
@require_auth
def list_attendees(event_id: str):
    """Lists attendees for an approved event, protecting private email for non-staff."""
    current = g.current_user
    event = event_repo.get_by_id(event_id)
    if not event:
        return error_response("Event not found.", "NOT_FOUND", 404)

    is_organizer = (event.get('organizerId') == current['uid'])
    is_staff = current.get('role') in ('faculty', 'admin')

    # All verified portal members can see attendee names and roles for networking
    raw_attendees = event_repo.list_attendees(event_id)
    sanitized = []
    for a in raw_attendees:
        item = {
            "id": a.get("id"),
            "eventId": a.get("eventId") or a.get("event_id"),
            "userId": a.get("userId") or a.get("user_id"),
            "userName": a.get("userName") or a.get("user_name") or "Attendee",
            "userRole": a.get("userRole") or a.get("user_role") or "student",
            "registeredAt": a.get("registeredAt") or a.get("registered_at"),
            "status": a.get("status", "confirmed")
        }
        # Reveal email only to organizers, staff, or self
        if is_organizer or is_staff or item["userId"] == current['uid']:
            item["userEmail"] = a.get("userEmail") or a.get("user_email") or ""
        else:
            item["userEmail"] = ""
        sanitized.append(item)

    return success_response(sanitized, message="Attendee list retrieved.")

