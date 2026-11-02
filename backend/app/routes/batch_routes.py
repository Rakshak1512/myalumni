import os
import uuid
import datetime
from pathlib import Path
from flask import current_app, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
from app.config import Config

from flask import Blueprint, request, g
from app.auth.decorators import require_auth, require_role
from app.repositories.community_repository import CommunityRepository
from app.repositories.notification_repository import NotificationRepository
from app.utils.responses import success_response, error_response

batch_bp = Blueprint('batches', __name__)
community_repo = CommunityRepository()
notification_repo = NotificationRepository()


# =============================================================================
# BATCHVERSE DASHBOARD & LISTING
# =============================================================================

@batch_bp.route('/batches', methods=['GET'])
@require_auth
def list_batches():
    """Lists all batch communities annotated with current user membership and eligibility."""
    current = g.current_user
    batches = community_repo.list_batches_for_user(current['uid'], current.get('role', 'student'))
    return success_response(batches, message="Batches retrieved successfully.")


@batch_bp.route('/batches/my', methods=['GET'])
@require_auth
def list_my_batches():
    """Lists batches the authenticated user is a verified member of."""
    user_id = g.current_user['uid']
    my_batches = community_repo.get_user_batches(user_id)
    return success_response(my_batches, message="User batches retrieved.")


@batch_bp.route('/batches/eligible', methods=['GET'])
@require_auth
def list_eligible_batches():
    """Lists batches the authenticated user is academically eligible to join."""
    current = g.current_user
    eligible = community_repo.get_eligible_batches(current['uid'], current.get('role', 'student'))
    return success_response(eligible, message="Eligible batches retrieved.")


@batch_bp.route('/batches/highlights', methods=['GET'])
@require_auth
def get_community_highlights():
    """Provides platform-wide community highlights for the BatchVerse dashboard."""
    current = g.current_user
    highlights = community_repo.get_community_highlights(current['uid'])
    return success_response(highlights, message="Highlights retrieved.")


@batch_bp.route('/batches/<batch_id>', methods=['GET'])
@require_auth
def get_batch(batch_id: str):
    """Retrieves metadata and membership status for a single batch."""
    current = g.current_user
    batch = community_repo.get_batch_by_id(batch_id, current['uid'], current.get('role', 'student'))
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)
    return success_response(batch, message="Batch community retrieved.")


# =============================================================================
# VERIFIED BATCH MEMBERSHIP
# =============================================================================

@batch_bp.route('/batches/<batch_id>/join', methods=['POST'])
@require_auth
def join_batch(batch_id: str):
    """Enrolls current user in a verified batch community based on institutional academic records."""
    current = g.current_user
    user_id = current['uid']
    user_role = current.get('role', 'student')
    user_name = current.get('displayName', 'User')

    try:
        res = community_repo.add_user_to_batch(
            batch_id=batch_id,
            user_id=user_id,
            user_name=user_name,
            role=user_role
        )
        return success_response(res, message="Joined verified batch community successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)
    except Exception as e:
        return error_response("An error occurred while enrolling in the batch.", "INTERNAL_ERROR", 500)


# =============================================================================
# MEMBERS DIRECTORY
# =============================================================================

@batch_bp.route('/batches/<batch_id>/members', methods=['GET'])
@require_auth
def list_batch_members(batch_id: str):
    """Member directory of verified classmates in this batch."""
    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    search = request.args.get('search', '').strip()
    role = request.args.get('role', '').strip()
    sort_by = request.args.get('sort', 'name').strip()

    members = community_repo.list_batch_members(
        batch_id=batch_id,
        search=search if search else None,
        role=role if role else None,
        sort_by=sort_by
    )
    return success_response(members, message="Batch members retrieved.")


# =============================================================================
# COMMUNITY DISCUSSIONS & POSTS
# =============================================================================

@batch_bp.route('/batches/<batch_id>/posts', methods=['GET'])
@require_auth
def list_batch_posts(batch_id: str):
    """Lists discussion posts in a batch community."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    # Privacy verification: admin or member can access
    if user_role != 'admin':
        is_member = community_repo.is_user_in_batch(user_id, batch_id)
        if not is_member:
            # Check if faculty from affiliated department
            is_eligible, _ = community_repo.check_user_eligibility(user_id, user_role, batch)
            if not is_eligible:
                return error_response(
                    "You must be a verified member of this batch to view its discussions.",
                    "FORBIDDEN", 403
                )

    posts = community_repo.list_batch_posts(batch_id, current_user_id=user_id)
    return success_response(posts, message="Batch posts retrieved.")


@batch_bp.route('/batches/<batch_id>/posts', methods=['POST'])
@require_auth
def create_batch_post(batch_id: str):
    """Publishes a new discussion post or memory to the batch."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    # Must be member or admin to post
    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response(
            "Only verified members of this batch can start discussions.",
            "FORBIDDEN", 403
        )

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    post_type = data.get('postType', 'general').strip().lower()
    image_url = data.get('imageUrl', '').strip()

    valid_types = {'general', 'memories', 'questions', 'career', 'activities'}
    if post_type not in valid_types:
        post_type = 'general'

    if not title or len(title) < 3:
        return error_response("Discussion title must be at least 3 characters.", "BAD_REQUEST", 400)
    if not content or len(content) < 5:
        return error_response("Discussion message content must be at least 5 characters.", "BAD_REQUEST", 400)

    post = community_repo.create_batch_post(
        batch_id=batch_id,
        author_id=user_id,
        author_name=current.get('displayName', 'User'),
        author_role=user_role,
        title=title,
        content=content,
        post_type=post_type,
        image_url=image_url if image_url else None
    )
    return success_response(post, message="Discussion published successfully.", status_code=201)


@batch_bp.route('/batches/posts/<post_id>', methods=['GET'])
@require_auth
def get_batch_post(post_id: str):
    current = g.current_user
    post = community_repo.get_post_by_id(post_id, current_user_id=current['uid'])
    if not post:
        return error_response("Discussion post not found.", "NOT_FOUND", 404)
    return success_response(post, message="Discussion retrieved.")


@batch_bp.route('/batches/posts/<post_id>', methods=['PUT'])
@require_auth
def update_batch_post(post_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    post_type = data.get('postType')
    image_url = data.get('imageUrl')

    if not title or len(title) < 3:
        return error_response("Discussion title must be at least 3 characters.", "BAD_REQUEST", 400)
    if not content or len(content) < 5:
        return error_response("Discussion content must be at least 5 characters.", "BAD_REQUEST", 400)

    try:
        updated = community_repo.update_batch_post(
            post_id=post_id,
            user_id=user_id,
            title=title,
            content=content,
            post_type=post_type,
            image_url=image_url,
            is_admin=(user_role == 'admin')
        )
        return success_response(updated, message="Discussion updated successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/posts/<post_id>', methods=['DELETE'])
@require_auth
def delete_batch_post(post_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_batch_post(
            post_id=post_id,
            user_id=user_id,
            is_admin=(user_role == 'admin')
        )
        if not deleted:
            return error_response("Discussion post not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Discussion deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


@batch_bp.route('/batches/posts/<post_id>/like', methods=['POST'])
@require_auth
def toggle_like_post(post_id: str):
    current = g.current_user
    user_id = current['uid']

    post = community_repo.get_post_by_id(post_id)
    if not post:
        return error_response("Discussion post not found.", "NOT_FOUND", 404)

    res = community_repo.toggle_like_post(post_id, user_id)
    return success_response(res, message="Post reaction updated.")


# =============================================================================
# COMMENTS & REPLIES
# =============================================================================

@batch_bp.route('/batches/posts/<post_id>/comments', methods=['GET'])
@require_auth
def list_post_comments(post_id: str):
    """Retrieves comments on a discussion post."""
    post = community_repo.get_post_by_id(post_id)
    if not post:
        return error_response("Discussion post not found.", "NOT_FOUND", 404)

    comments = community_repo.list_post_comments(post_id)
    return success_response(comments, message="Comments retrieved.")


@batch_bp.route('/batches/posts/<post_id>/comments', methods=['POST'])
@require_auth
def add_comment(post_id: str):
    """Adds a comment to a discussion thread and notifies the author."""
    current = g.current_user
    user_id = current['uid']
    user_name = current.get('displayName', 'User')
    user_role = current.get('role', 'student')

    post = community_repo.get_post_by_id(post_id)
    if not post:
        return error_response("Discussion post not found.", "NOT_FOUND", 404)

    # Check batch membership
    batch_id = post.get('batchId')
    if user_role.lower() != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response("You must be a member of this batch to join discussions.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    parent_id = data.get('parentCommentId')

    if not content:
        return error_response("Comment content cannot be empty.", "BAD_REQUEST", 400)
    if len(content) > 1000:
        return error_response("Comment content exceeds maximum limit of 1000 characters.", "BAD_REQUEST", 400)

    comment = community_repo.create_comment(
        post_id=post_id,
        author_id=user_id,
        author_name=user_name,
        author_role=user_role,
        content=content,
        parent_comment_id=parent_id
    )

    # Notify author if not commenting on own post
    post_author_id = post.get('authorId')
    if post_author_id and post_author_id != user_id:
        try:
            preview = (content[:50] + '...') if len(content) > 50 else content
            notification_repo.create_notification(
                recipient_id=post_author_id,
                notif_type="batch_comment",
                title="New Comment on Your Discussion",
                message=f"{user_name} commented: \"{preview}\"",
                link=f"#/batches?batchId={batch_id}&postId={post_id}&tab=discussions"
            )
        except Exception:
            pass

    return success_response(comment, message="Comment posted successfully.", status_code=201)


@batch_bp.route('/batches/comments/<comment_id>', methods=['PUT'])
@require_auth
def update_comment(comment_id: str):
    current = g.current_user
    user_id = current['uid']

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return error_response("Comment content cannot be empty.", "BAD_REQUEST", 400)

    try:
        updated = community_repo.update_comment(comment_id, user_id, content)
        return success_response(updated, message="Comment updated successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/comments/<comment_id>', methods=['DELETE'])
@require_auth
def delete_comment(comment_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_comment(
            comment_id=comment_id,
            user_id=user_id,
            is_admin=(user_role == 'admin')
        )
        if not deleted:
            return error_response("Comment not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Comment deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


# =============================================================================
# MODERATION & REPORTING
# =============================================================================

@batch_bp.route('/batches/posts/<post_id>/report', methods=['POST'])
@require_auth
def report_post(post_id: str):
    """Flags a discussion post for inappropriate content or community guidelines violations."""
    current = g.current_user
    user_id = current['uid']

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    details = data.get('details', '').strip()

    if not reason:
        return error_response("Please specify a reason for reporting.", "BAD_REQUEST", 400)

    try:
        res = community_repo.report_post(post_id, user_id, reason, details)
        return success_response(res, message="Report submitted to moderation team.")
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/reported-posts', methods=['GET'])
@require_auth
@require_role('admin')
def list_reported_posts():
    """Lists reported discussion posts for administrative review and moderation."""
    reports = community_repo.list_reported_posts()
    return success_response(reports, message="Reported posts retrieved.")


# =============================================================================
# PHASE 2: BATCH EVENTS & REUNIONS
# =============================================================================

@batch_bp.route('/batches/<batch_id>/events', methods=['GET'])
@require_auth
def list_batch_events(batch_id: str):
    """Lists events & reunions for a batch community."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin':
        is_member = community_repo.is_user_in_batch(user_id, batch_id)
        if not is_member:
            is_eligible, _ = community_repo.check_user_eligibility(user_id, user_role, batch)
            if not is_eligible:
                return error_response("You must be a verified member of this batch to view its events.", "FORBIDDEN", 403)

    status_filter = request.args.get('status')
    events = community_repo.list_batch_events(batch_id, status=status_filter, current_user_id=user_id)
    return success_response(events, message="Batch events retrieved.")


@batch_bp.route('/batches/<batch_id>/events', methods=['POST'])
@require_auth
def create_batch_event(batch_id: str):
    """Creates a new batch reunion or meetup event."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response("Only verified members of this batch can organize events.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    date = data.get('date', '').strip()
    start_time = data.get('startTime', '').strip()
    venue = data.get('venue', '').strip()
    event_type = data.get('eventType', 'reunion').strip().lower()
    cover_image = data.get('coverImage', '').strip()

    if not title or len(title) < 3:
        return error_response("Event title must be at least 3 characters.", "BAD_REQUEST", 400)
    if not description or len(description) < 5:
        return error_response("Event description must be at least 5 characters.", "BAD_REQUEST", 400)
    if not date:
        return error_response("Event date is required.", "BAD_REQUEST", 400)
    if not venue:
        return error_response("Event venue or meeting link is required.", "BAD_REQUEST", 400)

    event = community_repo.create_batch_event(
        batch_id=batch_id,
        creator_id=user_id,
        creator_name=current.get('displayName', 'User'),
        creator_role=user_role,
        title=title,
        description=description,
        date=date,
        start_time=start_time,
        venue=venue,
        event_type=event_type,
        cover_image=cover_image if cover_image else None
    )
    return success_response(event, message="Event created successfully.", status_code=201)


@batch_bp.route('/batches/events/<event_id>', methods=['GET'])
@require_auth
def get_batch_event(event_id: str):
    current = g.current_user
    event = community_repo.get_batch_event(event_id, current_user_id=current['uid'])
    if not event:
        return error_response("Event not found.", "NOT_FOUND", 404)
    return success_response(event, message="Event details retrieved.")


@batch_bp.route('/batches/events/<event_id>', methods=['PUT'])
@require_auth
def update_batch_event(event_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()
    data = request.get_json() or {}

    try:
        updated = community_repo.update_batch_event(event_id, user_id, is_admin=(user_role == 'admin'), data=data)
        return success_response(updated, message="Event updated successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/events/<event_id>/cancel', methods=['PUT'])
@require_auth
def cancel_batch_event(event_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        cancelled = community_repo.cancel_batch_event(event_id, user_id, is_admin=(user_role == 'admin'))
        return success_response(cancelled, message="Event cancelled successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/events/<event_id>', methods=['DELETE'])
@require_auth
def delete_batch_event(event_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_batch_event(event_id, user_id, is_admin=(user_role == 'admin'))
        if not deleted:
            return error_response("Event not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Event deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


@batch_bp.route('/batches/events/<event_id>/rsvp', methods=['POST'])
@require_auth
def rsvp_batch_event(event_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = current.get('role', 'student')

    event = community_repo.get_batch_event(event_id)
    if not event:
        return error_response("Event not found.", "NOT_FOUND", 404)

    # Check batch membership
    if user_role.lower() != 'admin' and not community_repo.is_user_in_batch(user_id, event['batchId']):
        return error_response("You must be a member of this batch to RSVP for events.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    status = data.get('status', '').strip().lower()
    if status not in ('going', 'interested', 'not_going'):
        return error_response("RSVP status must be 'going', 'interested', or 'not_going'.", "BAD_REQUEST", 400)

    try:
        res = community_repo.rsvp_batch_event(
            event_id=event_id,
            user_id=user_id,
            user_name=current.get('displayName', 'User'),
            user_role=user_role,
            user_avatar=current.get('avatarUrl', ''),
            status=status
        )
        return success_response(res, message="RSVP recorded successfully.")
    except ValueError as ve:
        return error_response(str(ve), "BAD_REQUEST", 400)


@batch_bp.route('/batches/events/<event_id>/attendees', methods=['GET'])
@require_auth
def list_event_attendees(event_id: str):
    event = community_repo.get_batch_event(event_id)
    if not event:
        return error_response("Event not found.", "NOT_FOUND", 404)

    status_filter = request.args.get('status')
    attendees = community_repo.list_event_attendees(event_id, rsvp_status=status_filter)
    return success_response(attendees, message="Event attendees retrieved.")


# =============================================================================
# PHASE 2: BATCH ANNOUNCEMENTS
# =============================================================================

@batch_bp.route('/batches/<batch_id>/announcements', methods=['GET'])
@require_auth
def list_batch_announcements(batch_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin':
        is_member = community_repo.is_user_in_batch(user_id, batch_id)
        if not is_member:
            is_eligible, _ = community_repo.check_user_eligibility(user_id, user_role, batch)
            if not is_eligible:
                return error_response("You must be a member of this batch to view announcements.", "FORBIDDEN", 403)

    announcements = community_repo.list_batch_announcements(batch_id)
    return success_response(announcements, message="Announcements retrieved.")


@batch_bp.route('/batches/<batch_id>/announcements', methods=['POST'])
@require_auth
def create_batch_announcement(batch_id: str):
    """Allows authorized administrators and permitted faculty to publish announcements."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    # Permission check: admin, faculty, or batch admin
    is_admin = (user_role == 'admin')
    is_faculty = (user_role == 'faculty')
    is_batch_admin = False
    if not is_admin and not is_faculty:
        membership = community_repo.db.get_one("SELECT role FROM batch_members WHERE batch_id = ? AND user_id = ?", [batch_id, user_id])
        if membership and membership.get('role') in ('admin', 'moderator'):
            is_batch_admin = True

    if not is_admin and not is_faculty and not is_batch_admin:
        return error_response("Only batch administrators and faculty can publish announcements.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    priority = data.get('priority', 'normal').strip().lower()
    is_pinned = bool(data.get('isPinned', False))

    if not title or len(title) < 3:
        return error_response("Announcement title must be at least 3 characters.", "BAD_REQUEST", 400)
    if not content or len(content) < 5:
        return error_response("Announcement content must be at least 5 characters.", "BAD_REQUEST", 400)

    ann = community_repo.create_batch_announcement(
        batch_id=batch_id,
        author_id=user_id,
        author_name=current.get('displayName', 'User'),
        author_role=user_role,
        title=title,
        content=content,
        priority=priority,
        is_pinned=is_pinned
    )

    # In-app notifications for batch members
    try:
        members = community_repo.list_batch_members(batch_id)
        for m in members:
            if m['userId'] != user_id:
                notification_repo.create_notification(
                    recipient_id=m['userId'],
                    notif_type="batch_announcement",
                    title=f"Announcement: {title[:40]}",
                    message=f"New announcement in {batch.get('name', 'Cohort')}: {content[:60]}...",
                    link=f"#/batches?batchId={batch_id}&tab=announcements"
                )
    except Exception:
        pass

    return success_response(ann, message="Announcement published successfully.", status_code=201)


@batch_bp.route('/batches/announcements/<announcement_id>', methods=['PUT'])
@require_auth
def update_batch_announcement(announcement_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    priority = data.get('priority')
    is_pinned = data.get('isPinned')

    if not title or len(title) < 3:
        return error_response("Announcement title must be at least 3 characters.", "BAD_REQUEST", 400)
    if not content or len(content) < 5:
        return error_response("Announcement content must be at least 5 characters.", "BAD_REQUEST", 400)

    try:
        updated = community_repo.update_batch_announcement(
            announcement_id=announcement_id,
            user_id=user_id,
            is_admin=(user_role == 'admin'),
            title=title,
            content=content,
            priority=priority,
            is_pinned=is_pinned
        )
        return success_response(updated, message="Announcement updated successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/announcements/<announcement_id>', methods=['DELETE'])
@require_auth
def delete_batch_announcement(announcement_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_batch_announcement(announcement_id, user_id, is_admin=(user_role == 'admin'))
        if not deleted:
            return error_response("Announcement not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Announcement deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


@batch_bp.route('/batches/announcements/<announcement_id>/pin', methods=['POST'])
@require_auth
def toggle_pin_announcement(announcement_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        res = community_repo.toggle_pin_announcement(announcement_id, user_id, is_admin=(user_role == 'admin'))
        return success_response(res, message="Announcement pin status updated.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


# =============================================================================
# PHASE 2: BATCH POLLS & VOTING
# =============================================================================

@batch_bp.route('/batches/<batch_id>/polls', methods=['GET'])
@require_auth
def list_batch_polls(batch_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin':
        is_member = community_repo.is_user_in_batch(user_id, batch_id)
        if not is_member:
            is_eligible, _ = community_repo.check_user_eligibility(user_id, user_role, batch)
            if not is_eligible:
                return error_response("You must be a member of this batch to view polls.", "FORBIDDEN", 403)

    polls = community_repo.list_batch_polls(batch_id, current_user_id=user_id)
    return success_response(polls, message="Batch polls retrieved.")


@batch_bp.route('/batches/<batch_id>/polls', methods=['POST'])
@require_auth
def create_batch_poll(batch_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response("You must be a member of this batch to create polls.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    question = data.get('question', '').strip()
    options = data.get('options', [])
    start_date = data.get('startDate')
    closing_date = data.get('closingDate')

    if not question or len(question) < 5:
        return error_response("Poll question must be at least 5 characters.", "BAD_REQUEST", 400)
    if not isinstance(options, list) or len(options) < 2:
        return error_response("A poll must contain at least 2 options.", "BAD_REQUEST", 400)

    try:
        poll = community_repo.create_batch_poll(
            batch_id=batch_id,
            creator_id=user_id,
            creator_name=current.get('displayName', 'User'),
            creator_role=user_role,
            question=question,
            options_list=options,
            start_date=start_date,
            closing_date=closing_date
        )
        return success_response(poll, message="Poll created successfully.", status_code=201)
    except ValueError as ve:
        return error_response(str(ve), "BAD_REQUEST", 400)


@batch_bp.route('/batches/polls/<poll_id>', methods=['GET'])
@require_auth
def get_batch_poll(poll_id: str):
    current = g.current_user
    poll = community_repo.get_batch_poll(poll_id, current_user_id=current['uid'])
    if not poll:
        return error_response("Poll not found.", "NOT_FOUND", 404)
    return success_response(poll, message="Poll details retrieved.")


@batch_bp.route('/batches/polls/<poll_id>/vote', methods=['POST'])
@require_auth
def vote_batch_poll(poll_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    poll = community_repo.get_batch_poll(poll_id)
    if not poll:
        return error_response("Poll not found.", "NOT_FOUND", 404)

    # Check batch membership
    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, poll['batchId']):
        return error_response("You must be a member of this batch to vote.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    option_id = data.get('optionId')
    if not option_id:
        return error_response("optionId is required to vote.", "BAD_REQUEST", 400)

    try:
        updated_poll = community_repo.vote_batch_poll(poll_id, option_id, user_id)
        return success_response(updated_poll, message="Vote recorded successfully.")
    except ValueError as ve:
        return error_response(str(ve), "BAD_REQUEST", 400)


@batch_bp.route('/batches/polls/<poll_id>/close', methods=['PUT'])
@require_auth
def close_batch_poll(poll_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        closed = community_repo.close_batch_poll(poll_id, user_id, is_admin=(user_role == 'admin'))
        return success_response(closed, message="Poll closed successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/polls/<poll_id>', methods=['DELETE'])
@require_auth
def delete_batch_poll(poll_id: str):
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_batch_poll(poll_id, user_id, is_admin=(user_role == 'admin'))
        if not deleted:
            return error_response("Poll not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Poll deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


# =============================================================================
# PHASE 3: BATCH MEMORIES GALLERY & COMMUNITY MEMORIES
# =============================================================================

ALLOWED_MEMORY_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_MEMORY_MIMES = {'image/jpeg', 'image/png', 'image/webp', 'image/pjpeg'}
MAX_MEMORY_BYTES = 10 * 1024 * 1024  # 10 MB limit


@batch_bp.route('/batches/<batch_id>/memories', methods=['GET'])
@require_auth
def list_batch_memories(batch_id: str):
    """Retrieves memories gallery for a verified batch community."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    # Batch access verification
    if user_role != 'admin':
        is_member = community_repo.is_user_in_batch(user_id, batch_id)
        if not is_member:
            is_eligible, _ = community_repo.check_user_eligibility(user_id, user_role, batch)
            if not is_eligible:
                return error_response("You must be a member of this batch to view its private memories gallery.", "FORBIDDEN", 403)

    academic_year = request.args.get('academicYear')
    graduation_year = request.args.get('graduationYear', type=int)
    event_id = request.args.get('eventId')
    uploader_id = request.args.get('uploaderId')
    search = request.args.get('search')
    limit = request.args.get('limit', default=100, type=int)
    offset = request.args.get('offset', default=0, type=int)

    memories = community_repo.list_batch_memories(
        batch_id=batch_id,
        academic_year=academic_year,
        graduation_year=graduation_year,
        event_id=event_id,
        uploader_id=uploader_id,
        search=search,
        current_user_id=user_id,
        limit=limit,
        offset=offset
    )
    return success_response(memories, message="Memories retrieved successfully.")


@batch_bp.route('/batches/<batch_id>/memories', methods=['POST'])
@require_auth
def create_batch_memory(batch_id: str):
    """Uploads and creates one or more memories for a verified cohort."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response("Only verified members of this batch can upload memories.", "FORBIDDEN", 403)

    # Check if multipart form upload or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        files = []
        for key in ['files[]', 'images', 'files', 'image', 'file', 'photo', 'photos']:
            if key in request.files:
                file_list = request.files.getlist(key)
                if file_list:
                    files.extend(file_list)
        if not files:
            for k in request.files:
                files.extend(request.files.getlist(k))

        if not files:
            return error_response("No image file provided. Attach file under 'files[]', 'image', or 'images'.", "BAD_REQUEST", 400)

        caption = request.form.get('caption', '').strip()
        description = request.form.get('description', '').strip()
        event_id = request.form.get('eventId')
        taken_at = request.form.get('takenAt')

        # Validate event association if provided
        if event_id:
            ev = community_repo.get_batch_event(event_id)
            if not ev or ev.get('batchId') != batch_id:
                return error_response("Selected event does not belong to this batch.", "BAD_REQUEST", 400)

        # Upload directories
        base_upload = Path(current_app.root_path).parent / 'static' / 'uploads' / 'memories'
        thumbs_upload = base_upload / 'thumbs'
        base_upload.mkdir(parents=True, exist_ok=True)
        thumbs_upload.mkdir(parents=True, exist_ok=True)

        created_memories = []

        for file in files:
            if not file or not file.filename:
                continue

            # Validate extension
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in ALLOWED_MEMORY_EXTENSIONS:
                return error_response(f"Invalid image extension '.{ext}'. Allowed: {', '.join(ALLOWED_MEMORY_EXTENSIONS)}.", "BAD_REQUEST", 400)

            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            if file_size > MAX_MEMORY_BYTES:
                return error_response(f"File '{file.filename}' exceeds 10MB limit.", "BAD_REQUEST", 400)

            # Security: Validate actual image content with Pillow
            try:
                img = Image.open(file)
                img.verify()
                file.seek(0)
                img = Image.open(file)
                width, height = img.size
            except Exception as e:
                return error_response(f"File '{file.filename}' is corrupted or not a valid image.", "BAD_REQUEST", 400)

            # Save safe unique files
            token_hex = uuid.uuid4().hex[:14]
            timestamp = int(datetime.datetime.now().timestamp())
            safe_filename = f"{batch_id}_{timestamp}_{token_hex}.{ext}"
            file_path = base_upload / safe_filename
            file.seek(0)
            file.save(str(file_path))

            # Generate thumbnail
            thumb_filename = f"thumb_{safe_filename}"
            thumb_path = thumbs_upload / thumb_filename
            try:
                thumb_img = img.copy()
                thumb_img.thumbnail((450, 450))
                if thumb_img.mode in ("RGBA", "P") and ext in ('jpg', 'jpeg'):
                    thumb_img = thumb_img.convert("RGB")
                thumb_img.save(str(thumb_path))
                thumb_url = f"{Config.BACKEND_URL}/api/v1/static/uploads/memories/thumbs/{thumb_filename}"
            except Exception:
                thumb_url = f"{Config.BACKEND_URL}/api/v1/static/uploads/memories/{safe_filename}"

            image_url = f"{Config.BACKEND_URL}/api/v1/static/uploads/memories/{safe_filename}"

            mem = community_repo.create_batch_memory(
                batch_id=batch_id,
                uploader_id=user_id,
                uploader_name=current.get('displayName', 'User'),
                uploader_role=user_role,
                uploader_avatar=current.get('avatarUrl', ''),
                image_url=image_url,
                thumbnail_url=thumb_url,
                caption=caption or file.filename.rsplit('.', 1)[0],
                description=description,
                event_id=event_id,
                academic_year=batch.get('academicYear') or '2025-2026',
                graduation_year=batch.get('graduationYear'),
                taken_at=taken_at,
                width=width,
                height=height,
                file_size=file_size
            )
            created_memories.append(mem)

        return success_response(created_memories, message=f"{len(created_memories)} memory photo(s) uploaded successfully.", status_code=201)

    # JSON Payload (e.g. programmatic or external link)
    data = request.get_json() or {}
    image_url = data.get('imageUrl', '').strip()
    caption = data.get('caption', '').strip()
    description = data.get('description', '').strip()
    event_id = data.get('eventId')
    taken_at = data.get('takenAt')
    thumbnail_url = data.get('thumbnailUrl')

    if not image_url:
        return error_response("imageUrl is required.", "BAD_REQUEST", 400)
    if not caption or len(caption) < 2:
        return error_response("Caption must be at least 2 characters.", "BAD_REQUEST", 400)

    if event_id:
        ev = community_repo.get_batch_event(event_id)
        if not ev or ev.get('batchId') != batch_id:
            return error_response("Selected event does not belong to this batch.", "BAD_REQUEST", 400)

    mem = community_repo.create_batch_memory(
        batch_id=batch_id,
        uploader_id=user_id,
        uploader_name=current.get('displayName', 'User'),
        uploader_role=user_role,
        uploader_avatar=current.get('avatarUrl', ''),
        image_url=image_url,
        thumbnail_url=thumbnail_url or image_url,
        caption=caption,
        description=description,
        event_id=event_id,
        academic_year=batch.get('academicYear') or '2025-2026',
        graduation_year=batch.get('graduationYear'),
        taken_at=taken_at
    )
    return success_response(mem, message="Memory created successfully.", status_code=201)


@batch_bp.route('/batches/memories/<memory_id>', methods=['GET'])
@require_auth
def get_batch_memory(memory_id: str):
    """Retrieves full details of a single memory."""
    current = g.current_user
    mem = community_repo.get_batch_memory(memory_id, current_user_id=current['uid'])
    if not mem:
        return error_response("Memory photo not found.", "NOT_FOUND", 404)
    return success_response(mem, message="Memory details retrieved.")


@batch_bp.route('/batches/memories/<memory_id>', methods=['PUT'])
@require_auth
def update_batch_memory(memory_id: str):
    """Updates caption and description of a memory photo."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()
    data = request.get_json() or {}

    caption = data.get('caption', '').strip()
    description = data.get('description', '').strip()
    event_id = data.get('eventId')

    if not caption or len(caption) < 2:
        return error_response("Caption must be at least 2 characters.", "BAD_REQUEST", 400)

    try:
        updated = community_repo.update_batch_memory_caption(
            memory_id=memory_id,
            user_id=user_id,
            is_admin=(user_role == 'admin'),
            caption=caption,
            description=description,
            event_id=event_id
        )
        return success_response(updated, message="Memory updated successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/memories/<memory_id>', methods=['DELETE'])
@require_auth
def delete_batch_memory(memory_id: str):
    """Deletes a memory photo by owner or administrator."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_batch_memory(memory_id, user_id, is_admin=(user_role == 'admin'))
        if not deleted:
            return error_response("Memory not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Memory photo deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


@batch_bp.route('/batches/memories/<memory_id>/like', methods=['POST'])
@require_auth
def toggle_like_memory(memory_id: str):
    """Likes or unlikes a memory photo and notifies the owner."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    mem = community_repo.get_batch_memory(memory_id)
    if not mem:
        return error_response("Memory photo not found.", "NOT_FOUND", 404)

    # Check batch membership
    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, mem['batchId']):
        return error_response("You must be a member of this batch to react to memories.", "FORBIDDEN", 403)

    try:
        res = community_repo.toggle_like_memory(memory_id, user_id)
        if res.get('liked') and res.get('uploaderId') and res['uploaderId'] != user_id:
            try:
                notification_repo.create_notification(
                    recipient_id=res['uploaderId'],
                    notif_type="memory_like",
                    title="Someone loved your batch photo",
                    message=f"{current.get('displayName', 'A classmate')} liked your photo '{res.get('caption', 'Memory')[:30]}'",
                    link=f"#/batches?batchId={mem['batchId']}&tab=memories"
                )
            except Exception:
                pass
        return success_response(res, message="Memory reaction updated.")
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/memories/<memory_id>/comments', methods=['GET'])
@require_auth
def list_memory_comments(memory_id: str):
    """Lists comments on a memory photo."""
    mem = community_repo.get_batch_memory(memory_id)
    if not mem:
        return error_response("Memory photo not found.", "NOT_FOUND", 404)

    comments = community_repo.list_memory_comments(memory_id)
    return success_response(comments, message="Memory comments retrieved.")


@batch_bp.route('/batches/memories/<memory_id>/comments', methods=['POST'])
@require_auth
def create_memory_comment(memory_id: str):
    """Adds a comment to a memory photo and notifies the owner."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    mem = community_repo.get_batch_memory(memory_id)
    if not mem:
        return error_response("Memory photo not found.", "NOT_FOUND", 404)

    # Check batch membership
    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, mem['batchId']):
        return error_response("You must be a member of this batch to comment on memories.", "FORBIDDEN", 403)

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return error_response("Comment content cannot be empty.", "BAD_REQUEST", 400)
    if len(content) > 1000:
        return error_response("Comment exceeds maximum length of 1000 characters.", "BAD_REQUEST", 400)

    try:
        comment = community_repo.create_memory_comment(
            memory_id=memory_id,
            user_id=user_id,
            user_name=current.get('displayName', 'User'),
            user_role=user_role,
            user_avatar=current.get('avatarUrl', ''),
            content=content
        )
        if mem.get('uploaderId') and mem['uploaderId'] != user_id:
            try:
                notification_repo.create_notification(
                    recipient_id=mem['uploaderId'],
                    notif_type="memory_comment",
                    title="New comment on your memory photo",
                    message=f"{current.get('displayName', 'A classmate')} commented: {content[:45]}...",
                    link=f"#/batches?batchId={mem['batchId']}&tab=memories"
                )
            except Exception:
                pass
        return success_response(comment, message="Comment posted successfully.", status_code=201)
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/memories/comments/<comment_id>', methods=['DELETE'])
@require_auth
def delete_memory_comment(comment_id: str):
    """Deletes a memory comment by comment author, memory owner, or admin."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    try:
        deleted = community_repo.delete_memory_comment(comment_id, user_id, is_admin=(user_role == 'admin'))
        if not deleted:
            return error_response("Comment not found.", "NOT_FOUND", 404)
        return success_response({"deleted": True}, message="Comment deleted successfully.")
    except PermissionError as pe:
        return error_response(str(pe), "FORBIDDEN", 403)


@batch_bp.route('/batches/memories/<memory_id>/report', methods=['POST'])
@require_auth
def report_batch_memory(memory_id: str):
    """Submits a confidential moderation report for a memory photo."""
    current = g.current_user
    user_id = current['uid']

    mem = community_repo.get_batch_memory(memory_id)
    if not mem:
        return error_response("Memory photo not found.", "NOT_FOUND", 404)

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    details = data.get('details', '').strip()

    if not reason:
        return error_response("Report reason is required.", "BAD_REQUEST", 400)

    report = community_repo.report_batch_memory(
        memory_id=memory_id,
        reporter_id=user_id,
        reporter_name=current.get('displayName', 'User'),
        reason=reason,
        details=details
    )
    return success_response(report, message="Report submitted for administrative review.", status_code=201)


@batch_bp.route('/batches/memories/reports', methods=['GET'])
@require_auth
@require_role('admin')
def list_memory_reports():
    """Lists memory moderation queue for administrators."""
    status_filter = request.args.get('status')
    reports = community_repo.list_memory_reports(status=status_filter)
    return success_response(reports, message="Moderation reports retrieved.")


@batch_bp.route('/batches/memories/reports/<report_id>/moderate', methods=['PUT'])
@require_auth
@require_role('admin')
def moderate_memory_report(report_id: str):
    """Admin moderation action on a reported memory photo."""
    current = g.current_user
    admin_id = current['uid']
    data = request.get_json() or {}

    action = data.get('action', '').strip().lower()
    note = data.get('note', '').strip()

    if action not in ('dismiss', 'remove'):
        return error_response("Action must be 'dismiss' or 'remove'.", "BAD_REQUEST", 400)

    try:
        updated = community_repo.moderate_memory_report(report_id, admin_id, action, note)
        return success_response(updated, message=f"Moderation action '{action}' executed successfully.")
    except ValueError as ve:
        return error_response(str(ve), "NOT_FOUND", 404)


@batch_bp.route('/batches/<batch_id>/albums', methods=['GET'])
@require_auth
def list_batch_event_albums(batch_id: str):
    """Lists event photo albums for the batch community."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response("You must be a member of this batch to view event albums.", "FORBIDDEN", 403)

    albums = community_repo.list_batch_event_albums(batch_id)
    return success_response(albums, message="Event albums retrieved.")


@batch_bp.route('/batches/<batch_id>/memories/timeline', methods=['GET'])
@require_auth
def get_memory_timeline(batch_id: str):
    """Retrieves chronological timeline clusters for batch memories."""
    current = g.current_user
    user_id = current['uid']
    user_role = (current.get('role') or '').lower()

    batch = community_repo.get_by_id(batch_id)
    if not batch:
        return error_response("Batch community not found.", "NOT_FOUND", 404)

    if user_role != 'admin' and not community_repo.is_user_in_batch(user_id, batch_id):
        return error_response("You must be a member of this batch to view memory timeline.", "FORBIDDEN", 403)

    timeline = community_repo.get_memory_timeline(batch_id)
    return success_response(timeline, message="Memory timeline retrieved.")


@batch_bp.route('/static/uploads/memories/<path:filename>', methods=['GET'])
def serve_memory_image(filename: str):
    """Serves locally stored batch memory photos and thumbnails."""
    upload_dir = Path(current_app.root_path).parent / 'static' / 'uploads' / 'memories'
    return send_from_directory(str(upload_dir), filename)
