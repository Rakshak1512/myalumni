import datetime
import re
import uuid
from typing import Dict, Any, List, Optional, Tuple
from app.db import get_db, Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class CommunityRepository(BaseRepository):
    def __init__(self):
        super().__init__('batches')
        self.members_repo = BaseRepository('batchMembers')
        self.posts_repo = BaseRepository('communityPosts')
        self.comments_repo = BaseRepository('communityComments')
        self.likes_repo = BaseRepository('batchPostLikes')
        self.events_repo = BaseRepository('batchEvents')
        self.rsvps_repo = BaseRepository('batchEventRsvps')
        self.announcements_repo = BaseRepository('batchAnnouncements')
        self.polls_repo = BaseRepository('batchPolls')
        self.poll_options_repo = BaseRepository('batchPollOptions')
        self.poll_votes_repo = BaseRepository('batchPollVotes')

    # =========================================================================
    # ACADEMIC VERIFICATION & ELIGIBILITY
    # =========================================================================

    def _extract_year(self, year_val: Any) -> Optional[int]:
        if not year_val:
            return None
        if isinstance(year_val, int):
            return year_val
        matches = re.findall(r'\b(20\d\d)\b', str(year_val))
        if matches:
            return int(matches[-1])
        return None

    def _format_dict(self, d: Any) -> Any:
        if isinstance(d, dict):
            res = {}
            for k, v in d.items():
                parts = k.split('_')
                camel_k = parts[0] + ''.join(p.capitalize() for p in parts[1:])
                res[camel_k] = self._format_dict(v)
            return res
        elif isinstance(d, list):
            return [self._format_dict(x) for x in d]
        return d

    def get_user_academic_info(self, user_id: str, role: str) -> Dict[str, Any]:
        """Retrieves verified institutional academic records for a user."""
        role_lower = (role or '').lower()
        db = self.db

        if role_lower == 'admin':
            return {"role": "admin", "is_admin": True}

        if role_lower == 'faculty':
            row = db.get_one("SELECT user_id, department FROM faculty_profiles WHERE user_id = ?", [user_id])
            if row:
                return {
                    "role": "faculty",
                    "department": row.get('department') or ''
                }
            return {"role": "faculty", "department": ""}

        if role_lower == 'alumni':
            row = db.get_one("""
                SELECT ap.user_id, ap.graduation_year, ap.course_id, ap.course_name, ap.batch_id, c.department
                FROM alumni_profiles ap
                LEFT JOIN courses c ON ap.course_id = c.id
                WHERE ap.user_id = ?
            """, [user_id])
            if row:
                return {
                    "role": "alumni",
                    "course_id": row.get('course_id'),
                    "course_name": row.get('course_name'),
                    "graduation_year": self._extract_year(row.get('graduation_year')),
                    "batch_id": row.get('batch_id'),
                    "department": row.get('department')
                }
            return {"role": "alumni"}

        # Default student
        row = db.get_one("""
            SELECT sp.user_id, sp.course_id, sp.course_name, sp.academic_year_name, sp.batch_id, c.department
            FROM student_profiles sp
            LEFT JOIN courses c ON sp.course_id = c.id
            WHERE sp.user_id = ?
        """, [user_id])
        if row:
            grad_year = self._extract_year(row.get('academic_year_name'))
            return {
                "role": "student",
                "course_id": row.get('course_id'),
                "course_name": row.get('course_name'),
                "graduation_year": grad_year,
                "batch_id": row.get('batch_id'),
                "department": row.get('department')
            }
        return {"role": "student"}

    def check_user_eligibility(self, user_id: str, role: str, batch: Dict[str, Any]) -> Tuple[bool, str]:
        """Validates if user is academically eligible to join the specific batch community."""
        role_lower = (role or '').lower()
        if role_lower == 'admin':
            return True, "Administrator global oversight"

        acad = self.get_user_academic_info(user_id, role_lower)

        if role_lower == 'faculty':
            fac_dept = (acad.get('department') or '').lower().strip()
            batch_dept = (batch.get('department') or '').lower().strip()
            if fac_dept and batch_dept and (fac_dept in batch_dept or batch_dept in fac_dept):
                return True, "Affiliated faculty department"
            return False, "Batch does not belong to your academic faculty department."

        if role_lower == 'alumni':
            user_course = acad.get('course_id')
            user_year = acad.get('graduation_year')
            user_batch = acad.get('batch_id')

            if user_batch and user_batch == batch.get('id'):
                return True, "Verified alumni cohort match"

            if user_course and user_year and batch.get('course_id') == user_course and batch.get('graduation_year') == user_year:
                return True, "Verified alumni cohort match"

            return False, f"Alumni records do not match this batch's course or graduation year ({batch.get('graduation_year')})."

        # Student check
        user_course = acad.get('course_id')
        user_year = acad.get('graduation_year')
        user_batch = acad.get('batch_id')

        if user_batch and user_batch == batch.get('id'):
            return True, "Verified student cohort match"

        if user_course and user_year and batch.get('course_id') == user_course and batch.get('graduation_year') == user_year:
            return True, "Verified student cohort match"

        return False, f"Student academic enrollment does not match this batch's course or graduation year ({batch.get('graduation_year')})."

    # =========================================================================
    # BATCH COMMUNITIES & DASHBOARD
    # =========================================================================

    def list_batches_for_user(self, user_id: str, role: str) -> List[Dict[str, Any]]:
        """Lists all batch communities annotated with current user membership and eligibility."""
        batches = self.list_all()
        user_batch_ids = {m['batch_id']: m for m in self.get_user_memberships(user_id)}

        enriched = []
        for b in batches:
            b_id = b['id']
            is_member = b_id in user_batch_ids
            membership_role = user_batch_ids[b_id].get('role', 'member') if is_member else None
            is_eligible, reason = self.check_user_eligibility(user_id, role, b)

            # Sync actual member count
            actual_count = self.get_member_count(b_id)
            display_count = max(actual_count, b.get('members_count') or 0)

            enriched.append({
                **b,
                "isMember": is_member,
                "membershipRole": membership_role,
                "isEligible": is_eligible,
                "eligibilityReason": reason,
                "verifiedMembersCount": display_count
            })
        return enriched

    def get_user_memberships(self, user_id: str) -> List[Dict[str, Any]]:
        rows = self.db.query("SELECT * FROM batch_members WHERE user_id = ?", [user_id])
        return rows

    def get_user_batches(self, user_id: str) -> List[Dict[str, Any]]:
        """Batches that user has officially joined."""
        rows = self.db.query("""
            SELECT b.*, bm.role as membership_role, bm.created_at as joined_at
            FROM batch_members bm
            JOIN batches b ON bm.batch_id = b.id
            WHERE bm.user_id = ?
            ORDER BY b.graduation_year DESC
        """, [user_id])

        for r in rows:
            r['isMember'] = True
            r['membershipRole'] = r.get('membership_role', 'member')
            r['verifiedMembersCount'] = max(self.get_member_count(r['id']), r.get('members_count') or 0)
        return rows

    def get_eligible_batches(self, user_id: str, role: str) -> List[Dict[str, Any]]:
        """Batches the user is eligible for but hasn't joined yet."""
        all_batches = self.list_batches_for_user(user_id, role)
        return [b for b in all_batches if not b.get('isMember') and b.get('isEligible')]

    def get_batch_by_id(self, batch_id: str, user_id: Optional[str] = None, role: Optional[str] = None) -> Optional[Dict[str, Any]]:
        batch = self.get_by_id(batch_id)
        if not batch:
            return None

        actual_count = self.get_member_count(batch_id)
        batch['verifiedMembersCount'] = max(actual_count, batch.get('members_count') or 0)

        if user_id:
            membership = self.db.get_one("SELECT * FROM batch_members WHERE batch_id = ? AND user_id = ?", [batch_id, user_id])
            batch['isMember'] = bool(membership)
            batch['membershipRole'] = membership.get('role', 'member') if membership else None
            is_eligible, reason = self.check_user_eligibility(user_id, role or '', batch)
            batch['isEligible'] = is_eligible
            batch['eligibilityReason'] = reason

        return batch

    def get_member_count(self, batch_id: str) -> int:
        row = self.db.get_one("SELECT COUNT(*) as cnt FROM batch_members WHERE batch_id = ?", [batch_id])
        return row.get('cnt', 0) if row else 0

    def is_user_in_batch(self, user_id: str, batch_id: str) -> bool:
        row = self.db.get_one("SELECT 1 FROM batch_members WHERE batch_id = ? AND user_id = ?", [batch_id, user_id])
        return bool(row)

    def add_user_to_batch(self, batch_id: str, user_id: str, user_name: str, role: str = 'member') -> Dict[str, Any]:
        batch = self.get_by_id(batch_id)
        if not batch:
            raise ValueError("Batch community not found.")

        # Check eligibility
        is_eligible, reason = self.check_user_eligibility(user_id, role, batch)
        if not is_eligible:
            raise PermissionError(f"Eligibility verification failed: {reason}")

        if self.is_user_in_batch(user_id, batch_id):
            return {"message": "You are already a verified member of this batch.", "alreadyMember": True}

        bm_id = f"bm_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            INSERT INTO batch_members (id, batch_id, user_id, user_name, role, joined_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, [bm_id, batch_id, user_id, user_name, role, now, now, now])

        # Increment stored members_count
        self.db.execute("""
            UPDATE batches
            SET members_count = (SELECT COUNT(*) FROM batch_members WHERE batch_id = ?),
                updated_at = ?
            WHERE id = ?
        """, [batch_id, now, batch_id])

        return {
            "id": bm_id,
            "batchId": batch_id,
            "userId": user_id,
            "userName": user_name,
            "role": role,
            "joinedAt": now
        }

    # =========================================================================
    # MEMBERS DIRECTORY
    # =========================================================================

    def list_batch_members(self, batch_id: str, search: Optional[str] = None, role: Optional[str] = None, sort_by: str = "name") -> List[Dict[str, Any]]:
        """Returns verified members of a batch community with privacy sanitization."""
        query = """
            SELECT bm.id as membership_id, bm.batch_id, bm.user_id, bm.role as membership_role, bm.created_at as joined_at,
                   u.display_name, u.role as user_role, u.avatar_url,
                   ap.company, ap.job_title, ap.location, ap.graduation_year as alumni_grad_year,
                   sp.skills as student_skills, sp.course_name as student_course
            FROM batch_members bm
            JOIN users u ON bm.user_id = u.id
            LEFT JOIN alumni_profiles ap ON bm.user_id = ap.user_id
            LEFT JOIN student_profiles sp ON bm.user_id = sp.user_id
            WHERE bm.batch_id = ? AND u.account_status != 'suspended'
        """
        params = [batch_id]

        if role and role.strip() and role.lower() != 'all':
            query += " AND LOWER(u.role) = ?"
            params.append(role.lower().strip())

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query += " AND (LOWER(u.display_name) LIKE ? OR LOWER(COALESCE(ap.company, '')) LIKE ? OR LOWER(COALESCE(ap.job_title, '')) LIKE ?)"
            params.extend([term, term, term])

        if sort_by == 'recent':
            query += " ORDER BY bm.created_at DESC"
        else:
            query += " ORDER BY u.display_name ASC"

        rows = self.db.query(query, params)
        members = []
        for r in rows:
            # Privacy safe representation
            members.append({
                "id": r.get('membership_id'),
                "userId": r.get('user_id'),
                "batchId": r.get('batch_id'),
                "displayName": r.get('display_name') or 'Peer',
                "role": r.get('user_role') or 'member',
                "membershipRole": r.get('membership_role') or 'member',
                "avatarUrl": r.get('avatar_url') or '',
                "company": r.get('company') or '',
                "jobTitle": r.get('job_title') or '',
                "location": r.get('location') or '',
                "joinedAt": r.get('joined_at')
            })
        return members

    # =========================================================================
    # COMMUNITY DISCUSSIONS & POSTS
    # =========================================================================

    def list_batch_posts(self, batch_id: str, current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns posts in a batch with author avatar and current user like status."""
        query = """
            SELECT cp.*, u.avatar_url as author_avatar
            FROM community_posts cp
            JOIN users u ON cp.author_id = u.id
            WHERE cp.batch_id = ?
            ORDER BY cp.created_at DESC
        """
        rows = self.db.query(query, [batch_id])

        # Get likes by current user
        liked_post_ids = set()
        if current_user_id:
            liked_rows = self.db.query(
                "SELECT post_id FROM batch_post_likes WHERE user_id = ?",
                [current_user_id]
            )
            liked_post_ids = {lr['post_id'] for lr in liked_rows}

        posts = []
        for r in rows:
            p_id = r['id']
            # Compute actual comments count if missing
            comments_cnt = r.get('comments_count')
            if comments_cnt is None:
                c_row = self.db.get_one("SELECT COUNT(*) as cnt FROM community_comments WHERE post_id = ?", [p_id])
                comments_cnt = c_row.get('cnt', 0) if c_row else 0

            posts.append({
                "id": p_id,
                "batchId": r.get('batch_id'),
                "authorId": r.get('author_id'),
                "authorName": r.get('author_name') or 'Author',
                "authorRole": r.get('author_role') or 'member',
                "authorAvatar": r.get('author_avatar') or '',
                "title": r.get('title') or '',
                "content": r.get('content') or '',
                "postType": r.get('post_type') or 'general',
                "imageUrl": r.get('image_url') or '',
                "likesCount": r.get('likes_count') or 0,
                "commentsCount": comments_cnt,
                "hasLiked": p_id in liked_post_ids,
                "createdAt": r.get('created_at'),
                "updatedAt": r.get('updated_at')
            })
        return posts

    def get_post_by_id(self, post_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        row = self.db.get_one("""
            SELECT cp.*, u.avatar_url as author_avatar
            FROM community_posts cp
            JOIN users u ON cp.author_id = u.id
            WHERE cp.id = ?
        """, [post_id])
        if not row:
            return None

        has_liked = False
        if current_user_id:
            lk = self.db.get_one("SELECT 1 FROM batch_post_likes WHERE post_id = ? AND user_id = ?", [post_id, current_user_id])
            has_liked = bool(lk)

        return {
            "id": row['id'],
            "batchId": row.get('batch_id'),
            "authorId": row.get('author_id'),
            "authorName": row.get('author_name'),
            "authorRole": row.get('author_role'),
            "authorAvatar": row.get('author_avatar') or '',
            "title": row.get('title'),
            "content": row.get('content'),
            "postType": row.get('post_type') or 'general',
            "imageUrl": row.get('image_url') or '',
            "likesCount": row.get('likes_count') or 0,
            "commentsCount": row.get('comments_count') or 0,
            "hasLiked": has_liked,
            "createdAt": row.get('created_at'),
            "updatedAt": row.get('updated_at')
        }

    def create_batch_post(self, batch_id: str, author_id: str, author_name: str, author_role: str,
                          title: str, content: str, post_type: str = 'general', image_url: Optional[str] = None) -> Dict[str, Any]:
        post_id = f"post_{uuid.uuid4().hex[:14]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        self.db.execute("""
            INSERT INTO community_posts (id, batch_id, author_id, author_name, author_role, title, content, post_type, image_url, likes_count, comments_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        """, [post_id, batch_id, author_id, author_name, author_role, title, content, post_type, image_url or '', now, now])

        return self.get_post_by_id(post_id, author_id)

    def update_batch_post(self, post_id: str, user_id: str, title: str, content: str,
                          post_type: Optional[str] = None, image_url: Optional[str] = None, is_admin: bool = False) -> Dict[str, Any]:
        post = self.get_post_by_id(post_id)
        if not post:
            raise ValueError("Post not found.")

        if post['authorId'] != user_id and not is_admin:
            raise PermissionError("You can only edit your own posts.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        p_type = post_type or post.get('postType') or 'general'
        img = image_url if image_url is not None else post.get('imageUrl')

        self.db.execute("""
            UPDATE community_posts
            SET title = ?, content = ?, post_type = ?, image_url = ?, updated_at = ?
            WHERE id = ?
        """, [title, content, p_type, img, now, post_id])

        return self.get_post_by_id(post_id, user_id)

    def delete_batch_post(self, post_id: str, user_id: str, is_admin: bool = False) -> bool:
        post = self.get_post_by_id(post_id)
        if not post:
            return False

        if post['authorId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to delete this post.")

        self.db.execute("DELETE FROM community_comments WHERE post_id = ?", [post_id])
        self.db.execute("DELETE FROM batch_post_likes WHERE post_id = ?", [post_id])
        self.db.execute("DELETE FROM reports WHERE target_type = 'community_post' AND target_id = ?", [post_id])
        self.db.execute("DELETE FROM community_posts WHERE id = ?", [post_id])
        return True

    def toggle_like_post(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Toggles post like state with duplicate prevention."""
        existing = self.db.get_one("SELECT id FROM batch_post_likes WHERE post_id = ? AND user_id = ?", [post_id, user_id])
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if existing:
            self.db.execute("DELETE FROM batch_post_likes WHERE id = ?", [existing['id']])
            self.db.execute("""
                UPDATE community_posts
                SET likes_count = MAX(0, likes_count - 1), updated_at = ?
                WHERE id = ?
            """, [now, post_id])
            liked = False
        else:
            lk_id = f"like_{uuid.uuid4().hex[:12]}"
            self.db.execute("""
                INSERT INTO batch_post_likes (id, post_id, user_id, created_at)
                VALUES (?, ?, ?, ?)
            """, [lk_id, post_id, user_id, now])
            self.db.execute("""
                UPDATE community_posts
                SET likes_count = likes_count + 1, updated_at = ?
                WHERE id = ?
            """, [now, post_id])
            liked = True

        updated_post = self.get_post_by_id(post_id, user_id)
        return {
            "liked": liked,
            "likesCount": updated_post.get('likesCount', 0) if updated_post else 0
        }

    # =========================================================================
    # COMMENTS & REPLIES
    # =========================================================================

    def list_post_comments(self, post_id: str) -> List[Dict[str, Any]]:
        """Retrieves comments for a discussion post with author avatars."""
        rows = self.db.query("""
            SELECT cc.*, u.avatar_url as author_avatar, u.role as user_role
            FROM community_comments cc
            JOIN users u ON cc.author_id = u.id
            WHERE cc.post_id = ?
            ORDER BY cc.created_at ASC
        """, [post_id])

        comments = []
        for r in rows:
            comments.append({
                "id": r['id'],
                "postId": r.get('post_id'),
                "authorId": r.get('author_id'),
                "authorName": r.get('author_name') or 'Peer',
                "authorRole": r.get('author_role') or r.get('user_role') or 'member',
                "authorAvatar": r.get('author_avatar') or '',
                "content": r.get('content') or '',
                "parentCommentId": r.get('parent_comment_id'),
                "createdAt": r.get('created_at'),
                "updatedAt": r.get('updated_at')
            })
        return comments

    def get_comment_by_id(self, comment_id: str) -> Optional[Dict[str, Any]]:
        row = self.db.get_one("""
            SELECT cc.*, u.avatar_url as author_avatar, u.role as user_role
            FROM community_comments cc
            JOIN users u ON cc.author_id = u.id
            WHERE cc.id = ?
        """, [comment_id])
        if not row:
            return None
        return {
            "id": row['id'],
            "postId": row.get('post_id'),
            "authorId": row.get('author_id'),
            "authorName": row.get('author_name'),
            "authorRole": row.get('author_role') or row.get('user_role'),
            "authorAvatar": row.get('author_avatar') or '',
            "content": row.get('content'),
            "parentCommentId": row.get('parent_comment_id'),
            "createdAt": row.get('created_at'),
            "updatedAt": row.get('updated_at')
        }

    def create_comment(self, post_id: str, author_id: str, author_name: str, author_role: str,
                       content: str, parent_comment_id: Optional[str] = None) -> Dict[str, Any]:
        comment_id = f"comm_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        self.db.execute("""
            INSERT INTO community_comments (id, post_id, author_id, author_name, author_role, content, parent_comment_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [comment_id, post_id, author_id, author_name, author_role, content, parent_comment_id, now, now])

        # Increment comments_count on post
        self.db.execute("""
            UPDATE community_posts
            SET comments_count = (SELECT COUNT(*) FROM community_comments WHERE post_id = ?),
                updated_at = ?
            WHERE id = ?
        """, [post_id, now, post_id])

        return self.get_comment_by_id(comment_id)

    def update_comment(self, comment_id: str, user_id: str, content: str) -> Dict[str, Any]:
        comm = self.get_comment_by_id(comment_id)
        if not comm:
            raise ValueError("Comment not found.")
        if comm['authorId'] != user_id:
            raise PermissionError("You can only edit your own comment.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            UPDATE community_comments
            SET content = ?, updated_at = ?
            WHERE id = ?
        """, [content, now, comment_id])

        return self.get_comment_by_id(comment_id)

    def delete_comment(self, comment_id: str, user_id: str, is_admin: bool = False) -> bool:
        comm = self.get_comment_by_id(comment_id)
        if not comm:
            return False

        if comm['authorId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to delete this comment.")

        post_id = comm['postId']
        self.db.execute("DELETE FROM community_comments WHERE id = ?", [comment_id])

        # Decrement comments_count
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            UPDATE community_posts
            SET comments_count = MAX(0, (SELECT COUNT(*) FROM community_comments WHERE post_id = ?)),
                updated_at = ?
            WHERE id = ?
        """, [post_id, now, post_id])

        return True

    # =========================================================================
    # MODERATION & REPORTS
    # =========================================================================

    def report_post(self, post_id: str, reporter_id: str, reason: str, details: str = "") -> Dict[str, Any]:
        post = self.get_post_by_id(post_id)
        if not post:
            raise ValueError("Discussion post not found.")

        report_id = f"rep_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        self.db.execute("""
            INSERT INTO reports (id, reporter_id, reported_user_id, target_type, target_id, reason, details, status, created_at, updated_at)
            VALUES (?, ?, ?, 'community_post', ?, ?, ?, 'pending', ?, ?)
        """, [report_id, reporter_id, post['authorId'], post_id, reason, details or '', now, now])

        return {
            "id": report_id,
            "postId": post_id,
            "status": "pending",
            "message": "Discussion reported to moderation team."
        }

    def list_reported_posts(self) -> List[Dict[str, Any]]:
        rows = self.db.query("""
            SELECT r.id as report_id, r.reason, r.details, r.status, r.created_at as reported_at,
                   u_rep.display_name as reporter_name,
                   cp.id as post_id, cp.title, cp.content, cp.batch_id, cp.author_id, cp.author_name
            FROM reports r
            JOIN users u_rep ON r.reporter_id = u_rep.id
            JOIN community_posts cp ON r.target_id = cp.id
            WHERE r.target_type = 'community_post' AND r.status = 'pending'
            ORDER BY r.created_at DESC
        """)
        return rows

    # =========================================================================
    # COMMUNITY HIGHLIGHTS & STATS
    # =========================================================================

    def get_community_highlights(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides dashboard summary of recent discussions and batch activity."""
        recent_posts = self.db.query("""
            SELECT cp.id, cp.title, cp.post_type, cp.created_at, cp.likes_count, cp.comments_count,
                   cp.author_name, cp.author_role, b.id as batch_id, b.name as batch_name
            FROM community_posts cp
            JOIN batches b ON cp.batch_id = b.id
            ORDER BY cp.created_at DESC
            LIMIT 4
        """)

        active_members_row = self.db.get_one("""
            SELECT COUNT(DISTINCT user_id) as total_active FROM batch_members
        """)

        total_posts_row = self.db.get_one("""
            SELECT COUNT(*) as total_posts FROM community_posts
        """)

        return {
            "recentDiscussions": recent_posts,
            "activeMembersCount": active_members_row.get('total_active', 0) if active_members_row else 0,
            "totalDiscussionsCount": total_posts_row.get('total_posts', 0) if total_posts_row else 0
        }

    # =========================================================================
    # PHASE 2: BATCH EVENTS & REUNIONS
    # =========================================================================

    def list_batch_events(self, batch_id: str, status: Optional[str] = None, current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT be.*, u.avatar_url as creator_avatar
            FROM batch_events be
            LEFT JOIN users u ON be.creator_id = u.id
            WHERE be.batch_id = ?
        """
        params = [batch_id]
        if status and status.lower() != 'all':
            query += " AND be.status = ?"
            params.append(status.lower())

        query += " ORDER BY be.date ASC, be.start_time ASC"
        rows = self.db.query(query, params)

        user_rsvps = {}
        if current_user_id:
            rsvp_rows = self.db.query("SELECT event_id, status FROM batch_event_rsvps WHERE user_id = ?", [current_user_id])
            user_rsvps = {r['event_id']: r['status'] for r in rsvp_rows}

        events = []
        for r in rows:
            events.append({
                "id": r['id'],
                "batchId": r.get('batch_id'),
                "creatorId": r.get('creator_id'),
                "creatorName": r.get('creator_name'),
                "creatorRole": r.get('creator_role'),
                "creatorAvatar": r.get('creator_avatar') or '',
                "title": r.get('title'),
                "description": r.get('description'),
                "date": r.get('date'),
                "startTime": r.get('start_time') or '',
                "venue": r.get('venue'),
                "eventType": r.get('event_type') or 'reunion',
                "coverImage": r.get('cover_image') or '',
                "status": r.get('status') or 'upcoming',
                "goingCount": r.get('going_count') or 0,
                "interestedCount": r.get('interested_count') or 0,
                "notGoingCount": r.get('not_going_count') or 0,
                "userRsvp": user_rsvps.get(r['id']),
                "createdAt": r.get('created_at'),
                "updatedAt": r.get('updated_at')
            })
        return events

    def get_batch_event(self, event_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        row = self.db.get_one("""
            SELECT be.*, u.avatar_url as creator_avatar
            FROM batch_events be
            LEFT JOIN users u ON be.creator_id = u.id
            WHERE be.id = ?
        """, [event_id])
        if not row:
            return None

        user_rsvp = None
        if current_user_id:
            r = self.db.get_one("SELECT status FROM batch_event_rsvps WHERE event_id = ? AND user_id = ?", [event_id, current_user_id])
            if r:
                user_rsvp = r.get('status')

        return {
            "id": row['id'],
            "batchId": row.get('batch_id'),
            "creatorId": row.get('creator_id'),
            "creatorName": row.get('creator_name'),
            "creatorRole": row.get('creator_role'),
            "creatorAvatar": row.get('creator_avatar') or '',
            "title": row.get('title'),
            "description": row.get('description'),
            "date": row.get('date'),
            "startTime": row.get('start_time') or '',
            "venue": row.get('venue'),
            "eventType": row.get('event_type') or 'reunion',
            "coverImage": row.get('cover_image') or '',
            "status": row.get('status') or 'upcoming',
            "goingCount": row.get('going_count') or 0,
            "interestedCount": row.get('interested_count') or 0,
            "notGoingCount": row.get('not_going_count') or 0,
            "userRsvp": user_rsvp,
            "createdAt": row.get('created_at'),
            "updatedAt": row.get('updated_at')
        }

    def create_batch_event(self, batch_id: str, creator_id: str, creator_name: str, creator_role: str,
                           title: str, description: str, date: str, start_time: str, venue: str,
                           event_type: str = 'reunion', cover_image: Optional[str] = None) -> Dict[str, Any]:
        evt_id = f"bevt_{uuid.uuid4().hex[:14]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            INSERT INTO batch_events (id, batch_id, creator_id, creator_name, creator_role, title, description,
                                      date, start_time, venue, event_type, cover_image, status, going_count,
                                      interested_count, not_going_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', 0, 0, 0, ?, ?)
        """, [evt_id, batch_id, creator_id, creator_name, creator_role, title, description,
              date, start_time or '', venue, event_type or 'reunion', cover_image or '', now, now])
        return self.get_batch_event(evt_id, creator_id)

    def update_batch_event(self, event_id: str, user_id: str, is_admin: bool, data: Dict[str, Any]) -> Dict[str, Any]:
        evt = self.get_batch_event(event_id)
        if not evt:
            raise ValueError("Event not found.")
        if evt['creatorId'] != user_id and not is_admin:
            raise PermissionError("You can only edit events you organized.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            UPDATE batch_events
            SET title = ?, description = ?, date = ?, start_time = ?, venue = ?,
                event_type = ?, cover_image = ?, status = ?, updated_at = ?
            WHERE id = ?
        """, [
            data.get('title', evt['title']),
            data.get('description', evt['description']),
            data.get('date', evt['date']),
            data.get('startTime', evt['startTime']),
            data.get('venue', evt['venue']),
            data.get('eventType', evt['eventType']),
            data.get('coverImage', evt['coverImage']),
            data.get('status', evt['status']),
            now, event_id
        ])
        return self.get_batch_event(event_id, user_id)

    def cancel_batch_event(self, event_id: str, user_id: str, is_admin: bool) -> Dict[str, Any]:
        evt = self.get_batch_event(event_id)
        if not evt:
            raise ValueError("Event not found.")
        if evt['creatorId'] != user_id and not is_admin:
            raise PermissionError("You can only cancel events you organized.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("UPDATE batch_events SET status = 'cancelled', updated_at = ? WHERE id = ?", [now, event_id])
        return self.get_batch_event(event_id, user_id)

    def delete_batch_event(self, event_id: str, user_id: str, is_admin: bool) -> bool:
        evt = self.get_batch_event(event_id)
        if not evt:
            return False
        if evt['creatorId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to delete this event.")

        self.db.execute("DELETE FROM batch_event_rsvps WHERE event_id = ?", [event_id])
        self.db.execute("DELETE FROM batch_events WHERE id = ?", [event_id])
        return True

    def rsvp_batch_event(self, event_id: str, user_id: str, user_name: str, user_role: str,
                         user_avatar: str, status: str) -> Dict[str, Any]:
        status_norm = status.lower().strip()
        if status_norm not in ('going', 'interested', 'not_going'):
            raise ValueError("RSVP status must be 'going', 'interested', or 'not_going'.")

        evt = self.get_batch_event(event_id)
        if not evt:
            raise ValueError("Event not found.")

        existing = self.db.get_one("SELECT id, status FROM batch_event_rsvps WHERE event_id = ? AND user_id = ?", [event_id, user_id])
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if existing:
            self.db.execute("""
                UPDATE batch_event_rsvps
                SET status = ?, user_name = ?, user_role = ?, user_avatar = ?, updated_at = ?
                WHERE id = ?
            """, [status_norm, user_name, user_role, user_avatar or '', now, existing['id']])
        else:
            rsvp_id = f"rsvp_{uuid.uuid4().hex[:12]}"
            self.db.execute("""
                INSERT INTO batch_event_rsvps (id, event_id, user_id, user_name, user_role, user_avatar, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [rsvp_id, event_id, user_id, user_name, user_role, user_avatar or '', status_norm, now, now])

        # Recalculate attendee counts
        counts = self.db.query("""
            SELECT status, COUNT(*) as cnt
            FROM batch_event_rsvps
            WHERE event_id = ?
            GROUP BY status
        """, [event_id])
        count_map = {c['status']: c['cnt'] for c in counts}

        self.db.execute("""
            UPDATE batch_events
            SET going_count = ?, interested_count = ?, not_going_count = ?, updated_at = ?
            WHERE id = ?
        """, [count_map.get('going', 0), count_map.get('interested', 0), count_map.get('not_going', 0), now, event_id])

        return self.get_batch_event(event_id, user_id)

    def list_event_attendees(self, event_id: str, rsvp_status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT r.*, u.avatar_url as user_avatar, u.display_name, u.role as user_role
            FROM batch_event_rsvps r
            JOIN users u ON r.user_id = u.id
            WHERE r.event_id = ?
        """
        params = [event_id]
        if rsvp_status and rsvp_status.lower() != 'all':
            query += " AND r.status = ?"
            params.append(rsvp_status.lower())

        query += " ORDER BY r.updated_at DESC"
        rows = self.db.query(query, params)
        attendees = []
        for r in rows:
            attendees.append({
                "id": r['id'],
                "eventId": r.get('event_id'),
                "userId": r.get('user_id'),
                "displayName": r.get('display_name') or r.get('user_name'),
                "role": r.get('user_role') or r.get('role'),
                "avatarUrl": r.get('user_avatar') or '',
                "status": r.get('status'),
                "updatedAt": r.get('updated_at')
            })
        return attendees

    # =========================================================================
    # PHASE 2: BATCH ANNOUNCEMENTS
    # =========================================================================

    def list_batch_announcements(self, batch_id: str) -> List[Dict[str, Any]]:
        rows = self.db.query("""
            SELECT ba.*, u.avatar_url as author_avatar
            FROM batch_announcements ba
            LEFT JOIN users u ON ba.author_id = u.id
            WHERE ba.batch_id = ?
            ORDER BY ba.is_pinned DESC, ba.created_at DESC
        """, [batch_id])

        announcements = []
        for r in rows:
            announcements.append({
                "id": r['id'],
                "batchId": r.get('batch_id'),
                "authorId": r.get('author_id'),
                "authorName": r.get('author_name'),
                "authorRole": r.get('author_role'),
                "authorAvatar": r.get('author_avatar') or '',
                "title": r.get('title'),
                "content": r.get('content'),
                "priority": r.get('priority') or 'normal',
                "isPinned": bool(r.get('is_pinned')),
                "createdAt": r.get('created_at'),
                "updatedAt": r.get('updated_at')
            })
        return announcements

    def get_batch_announcement(self, announcement_id: str) -> Optional[Dict[str, Any]]:
        row = self.db.get_one("""
            SELECT ba.*, u.avatar_url as author_avatar
            FROM batch_announcements ba
            LEFT JOIN users u ON ba.author_id = u.id
            WHERE ba.id = ?
        """, [announcement_id])
        if not row:
            return None
        return {
            "id": row['id'],
            "batchId": row.get('batch_id'),
            "authorId": row.get('author_id'),
            "authorName": row.get('author_name'),
            "authorRole": row.get('author_role'),
            "authorAvatar": row.get('author_avatar') or '',
            "title": row.get('title'),
            "content": row.get('content'),
            "priority": row.get('priority') or 'normal',
            "isPinned": bool(row.get('is_pinned')),
            "createdAt": row.get('created_at'),
            "updatedAt": row.get('updated_at')
        }

    def create_batch_announcement(self, batch_id: str, author_id: str, author_name: str, author_role: str,
                                  title: str, content: str, priority: str = 'normal', is_pinned: bool = False) -> Dict[str, Any]:
        ann_id = f"bann_{uuid.uuid4().hex[:14]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            INSERT INTO batch_announcements (id, batch_id, author_id, author_name, author_role, title, content, priority, is_pinned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [ann_id, batch_id, author_id, author_name, author_role, title, content, priority or 'normal', 1 if is_pinned else 0, now, now])
        return self.get_batch_announcement(ann_id)

    def update_batch_announcement(self, announcement_id: str, user_id: str, is_admin: bool,
                                  title: str, content: str, priority: Optional[str] = None, is_pinned: Optional[bool] = None) -> Dict[str, Any]:
        ann = self.get_batch_announcement(announcement_id)
        if not ann:
            raise ValueError("Announcement not found.")
        if ann['authorId'] != user_id and not is_admin:
            raise PermissionError("You can only edit announcements you authored.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        prio = priority if priority is not None else ann['priority']
        pin = (1 if is_pinned else 0) if is_pinned is not None else (1 if ann['isPinned'] else 0)

        self.db.execute("""
            UPDATE batch_announcements
            SET title = ?, content = ?, priority = ?, is_pinned = ?, updated_at = ?
            WHERE id = ?
        """, [title, content, prio, pin, now, announcement_id])
        return self.get_batch_announcement(announcement_id)

    def delete_batch_announcement(self, announcement_id: str, user_id: str, is_admin: bool) -> bool:
        ann = self.get_batch_announcement(announcement_id)
        if not ann:
            return False
        if ann['authorId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to delete this announcement.")

        self.db.execute("DELETE FROM batch_announcements WHERE id = ?", [announcement_id])
        return True

    def toggle_pin_announcement(self, announcement_id: str, user_id: str, is_admin: bool) -> Dict[str, Any]:
        ann = self.get_batch_announcement(announcement_id)
        if not ann:
            raise ValueError("Announcement not found.")
        if ann['authorId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to pin announcements.")

        new_pinned = 0 if ann['isPinned'] else 1
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("UPDATE batch_announcements SET is_pinned = ?, updated_at = ? WHERE id = ?", [new_pinned, now, announcement_id])
        return self.get_batch_announcement(announcement_id)

    # =========================================================================
    # PHASE 2: BATCH POLLS & VOTING
    # =========================================================================

    def list_batch_polls(self, batch_id: str, current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        rows = self.db.query("""
            SELECT bp.*, u.avatar_url as creator_avatar
            FROM batch_polls bp
            LEFT JOIN users u ON bp.creator_id = u.id
            WHERE bp.batch_id = ?
            ORDER BY bp.created_at DESC
        """, [batch_id])

        polls = []
        for r in rows:
            poll_id = r['id']
            options = self._get_poll_options_with_stats(poll_id, r.get('total_votes') or 0)
            user_voted_option_id = None
            if current_user_id:
                v = self.db.get_one("SELECT option_id FROM batch_poll_votes WHERE poll_id = ? AND user_id = ?", [poll_id, current_user_id])
                if v:
                    user_voted_option_id = v.get('option_id')

            polls.append({
                "id": poll_id,
                "batchId": r.get('batch_id'),
                "creatorId": r.get('creator_id'),
                "creatorName": r.get('creator_name'),
                "creatorRole": r.get('creator_role'),
                "creatorAvatar": r.get('creator_avatar') or '',
                "question": r.get('question'),
                "startDate": r.get('start_date') or '',
                "closingDate": r.get('closing_date') or '',
                "status": r.get('status') or 'active',
                "totalVotes": r.get('total_votes') or 0,
                "options": options,
                "userVotedOptionId": user_voted_option_id,
                "hasVoted": bool(user_voted_option_id),
                "createdAt": r.get('created_at'),
                "updatedAt": r.get('updated_at')
            })
        return polls

    def _get_poll_options_with_stats(self, poll_id: str, total_votes: int) -> List[Dict[str, Any]]:
        opts = self.db.query("""
            SELECT * FROM batch_poll_options WHERE poll_id = ? ORDER BY option_order ASC
        """, [poll_id])
        result = []
        for o in opts:
            cnt = o.get('votes_count') or 0
            pct = round((cnt / total_votes * 100), 1) if total_votes > 0 else 0.0
            result.append({
                "id": o['id'],
                "pollId": o.get('poll_id'),
                "optionText": o.get('option_text'),
                "optionOrder": o.get('option_order') or 0,
                "votesCount": cnt,
                "percentage": pct
            })
        return result

    def get_batch_poll(self, poll_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        row = self.db.get_one("""
            SELECT bp.*, u.avatar_url as creator_avatar
            FROM batch_polls bp
            LEFT JOIN users u ON bp.creator_id = u.id
            WHERE bp.id = ?
        """, [poll_id])
        if not row:
            return None

        total_votes = row.get('total_votes') or 0
        options = self._get_poll_options_with_stats(poll_id, total_votes)

        user_voted_option_id = None
        if current_user_id:
            v = self.db.get_one("SELECT option_id FROM batch_poll_votes WHERE poll_id = ? AND user_id = ?", [poll_id, current_user_id])
            if v:
                user_voted_option_id = v.get('option_id')

        return {
            "id": row['id'],
            "batchId": row.get('batch_id'),
            "creatorId": row.get('creator_id'),
            "creatorName": row.get('creator_name'),
            "creatorRole": row.get('creator_role'),
            "creatorAvatar": row.get('creator_avatar') or '',
            "question": row.get('question'),
            "startDate": row.get('start_date') or '',
            "closingDate": row.get('closing_date') or '',
            "status": row.get('status') or 'active',
            "totalVotes": total_votes,
            "options": options,
            "userVotedOptionId": user_voted_option_id,
            "hasVoted": bool(user_voted_option_id),
            "createdAt": row.get('created_at'),
            "updatedAt": row.get('updated_at')
        }

    def create_batch_poll(self, batch_id: str, creator_id: str, creator_name: str, creator_role: str,
                          question: str, options_list: List[str], start_date: Optional[str] = None, closing_date: Optional[str] = None) -> Dict[str, Any]:
        cleaned_options = [opt.strip() for opt in options_list if opt and opt.strip()]
        if len(cleaned_options) < 2:
            raise ValueError("Poll must have at least 2 valid options.")

        poll_id = f"bpoll_{uuid.uuid4().hex[:14]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        self.db.execute("""
            INSERT INTO batch_polls (id, batch_id, creator_id, creator_name, creator_role, question, start_date, closing_date, status, total_votes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)
        """, [poll_id, batch_id, creator_id, creator_name, creator_role, question, start_date or now[:10], closing_date or '', now, now])

        for idx, opt_text in enumerate(cleaned_options):
            opt_id = f"bopt_{uuid.uuid4().hex[:12]}"
            self.db.execute("""
                INSERT INTO batch_poll_options (id, poll_id, option_text, option_order, votes_count)
                VALUES (?, ?, ?, ?, 0)
            """, [opt_id, poll_id, opt_text, idx])

        return self.get_batch_poll(poll_id, creator_id)

    def vote_batch_poll(self, poll_id: str, option_id: str, user_id: str) -> Dict[str, Any]:
        poll = self.get_batch_poll(poll_id, user_id)
        if not poll:
            raise ValueError("Poll not found.")

        if poll['status'] != 'active':
            raise ValueError("This poll is closed and no longer accepting votes.")

        # Check closing date
        if poll.get('closingDate'):
            today_str = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
            if today_str > poll['closingDate']:
                now = datetime.datetime.now(datetime.timezone.utc).isoformat()
                self.db.execute("UPDATE batch_polls SET status = 'closed', updated_at = ? WHERE id = ?", [now, poll_id])
                raise ValueError("This poll reached its closing date and is now closed.")

        # Check valid option
        opt = self.db.get_one("SELECT id FROM batch_poll_options WHERE id = ? AND poll_id = ?", [option_id, poll_id])
        if not opt:
            raise ValueError("Selected option is not part of this poll.")

        existing = self.db.get_one("SELECT id, option_id FROM batch_poll_votes WHERE poll_id = ? AND user_id = ?", [poll_id, user_id])
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if existing:
            old_opt_id = existing['option_id']
            if old_opt_id == option_id:
                # Already voted for this option
                return self.get_batch_poll(poll_id, user_id)

            # Change vote: decrement old option, increment new option
            self.db.execute("UPDATE batch_poll_votes SET option_id = ?, created_at = ? WHERE id = ?", [option_id, now, existing['id']])
            self.db.execute("UPDATE batch_poll_options SET votes_count = MAX(0, votes_count - 1) WHERE id = ?", [old_opt_id])
            self.db.execute("UPDATE batch_poll_options SET votes_count = votes_count + 1 WHERE id = ?", [option_id])
        else:
            vote_id = f"bvote_{uuid.uuid4().hex[:12]}"
            self.db.execute("""
                INSERT INTO batch_poll_votes (id, poll_id, option_id, user_id, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, [vote_id, poll_id, option_id, user_id, now])
            self.db.execute("UPDATE batch_poll_options SET votes_count = votes_count + 1 WHERE id = ?", [option_id])
            self.db.execute("UPDATE batch_polls SET total_votes = total_votes + 1, updated_at = ? WHERE id = ?", [now, poll_id])

        return self.get_batch_poll(poll_id, user_id)

    def close_batch_poll(self, poll_id: str, user_id: str, is_admin: bool) -> Dict[str, Any]:
        poll = self.get_batch_poll(poll_id)
        if not poll:
            raise ValueError("Poll not found.")
        if poll['creatorId'] != user_id and not is_admin:
            raise PermissionError("You can only close polls you created.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("UPDATE batch_polls SET status = 'closed', updated_at = ? WHERE id = ?", [now, poll_id])
        return self.get_batch_poll(poll_id, user_id)

    def delete_batch_poll(self, poll_id: str, user_id: str, is_admin: bool) -> bool:
        poll = self.get_batch_poll(poll_id)
        if not poll:
            return False
        if poll['creatorId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to delete this poll.")

        self.db.execute("DELETE FROM batch_poll_votes WHERE poll_id = ?", [poll_id])
        self.db.execute("DELETE FROM batch_poll_options WHERE poll_id = ?", [poll_id])
        self.db.execute("DELETE FROM batch_polls WHERE id = ?", [poll_id])
        return True

    # =========================================================================
    # PHASE 3: BATCH MEMORIES GALLERY & COMMUNITY MEMORIES
    # =========================================================================

    def list_batch_memories(
        self,
        batch_id: str,
        academic_year: Optional[str] = None,
        graduation_year: Optional[int] = None,
        event_id: Optional[str] = None,
        uploader_id: Optional[str] = None,
        search: Optional[str] = None,
        current_user_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = """
            SELECT bm.*, be.title as event_title, be.date as event_date, be.venue as event_venue
            FROM batch_memories bm
            LEFT JOIN batch_events be ON bm.event_id = be.id
            WHERE bm.batch_id = ? AND bm.status != 'deleted'
        """
        params = [batch_id]

        if academic_year:
            query += " AND bm.academic_year = ?"
            params.append(academic_year)
        if graduation_year:
            query += " AND bm.graduation_year = ?"
            params.append(graduation_year)
        if event_id:
            query += " AND bm.event_id = ?"
            params.append(event_id)
        if uploader_id:
            query += " AND bm.uploader_id = ?"
            params.append(uploader_id)
        if search:
            query += " AND (bm.caption LIKE ? OR bm.description LIKE ? OR bm.uploader_name LIKE ?)"
            s_term = f"%{search}%"
            params.extend([s_term, s_term, s_term])

        query += " ORDER BY bm.created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = self.db.query(query, params)
        res = []
        for r in rows:
            mem = self._format_dict(r)
            if current_user_id:
                has_liked = self.db.get_one(
                    "SELECT id FROM batch_memory_likes WHERE memory_id = ? AND user_id = ?",
                    [r['id'], current_user_id]
                )
                mem['hasLiked'] = bool(has_liked)
            else:
                mem['hasLiked'] = False

            if r.get('event_title'):
                mem['event'] = {
                    "id": r.get('event_id'),
                    "title": r.get('event_title'),
                    "date": r.get('event_date'),
                    "venue": r.get('event_venue')
                }
            else:
                mem['event'] = None
            res.append(mem)
        return res

    def get_batch_memory(self, memory_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        row = self.db.get_one("""
            SELECT bm.*, be.title as event_title, be.date as event_date, be.venue as event_venue
            FROM batch_memories bm
            LEFT JOIN batch_events be ON bm.event_id = be.id
            WHERE bm.id = ? AND bm.status = 'approved'
        """, [memory_id])
        if not row:
            return None
        mem = self._format_dict(row)
        if current_user_id:
            has_liked = self.db.get_one(
                "SELECT id FROM batch_memory_likes WHERE memory_id = ? AND user_id = ?",
                [memory_id, current_user_id]
            )
            mem['hasLiked'] = bool(has_liked)
        else:
            mem['hasLiked'] = False

        if row.get('event_title'):
            mem['event'] = {
                "id": row.get('event_id'),
                "title": row.get('event_title'),
                "date": row.get('event_date'),
                "venue": row.get('event_venue')
            }
        else:
            mem['event'] = None
        return mem

    def create_batch_memory(
        self,
        batch_id: str,
        uploader_id: str,
        uploader_name: str,
        uploader_role: str,
        uploader_avatar: Optional[str],
        image_url: str,
        thumbnail_url: Optional[str],
        caption: str,
        description: Optional[str] = None,
        event_id: Optional[str] = None,
        academic_year: Optional[str] = None,
        graduation_year: Optional[int] = None,
        taken_at: Optional[str] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
        file_size: Optional[int] = None
    ) -> Dict[str, Any]:
        mem_id = f"mem_{uuid.uuid4().hex[:14]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # If event_id provided, ensure event belongs to this batch
        if event_id:
            ev = self.get_batch_event(event_id)
            if not ev or ev.get('batchId') != batch_id:
                raise ValueError("Selected event does not belong to this batch.")
            if not taken_at:
                taken_at = ev.get('date')

        self.db.execute("""
            INSERT INTO batch_memories (
                id, batch_id, uploader_id, uploader_name, uploader_role, uploader_avatar,
                image_url, thumbnail_url, caption, description, event_id,
                academic_year, graduation_year, taken_at, width, height, file_size,
                likes_count, comments_count, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'approved', ?, ?)
        """, [
            mem_id, batch_id, uploader_id, uploader_name, uploader_role, uploader_avatar,
            image_url, thumbnail_url or image_url, caption, description or '', event_id,
            academic_year, graduation_year, taken_at or now[:10], width, height, file_size,
            now, now
        ])
        return self.get_batch_memory(mem_id, uploader_id)

    def update_batch_memory_caption(
        self,
        memory_id: str,
        user_id: str,
        is_admin: bool,
        caption: str,
        description: Optional[str] = None,
        event_id: Optional[str] = None
    ) -> Dict[str, Any]:
        mem = self.get_batch_memory(memory_id)
        if not mem:
            raise ValueError("Memory not found.")
        if mem['uploaderId'] != user_id and not is_admin:
            raise PermissionError("You can only edit your own memory captions.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if event_id and event_id != mem.get('eventId'):
            ev = self.get_batch_event(event_id)
            if not ev or ev.get('batchId') != mem.get('batchId'):
                raise ValueError("Event does not belong to this batch.")

        self.db.execute("""
            UPDATE batch_memories
            SET caption = ?, description = ?, event_id = COALESCE(?, event_id), updated_at = ?
            WHERE id = ?
        """, [caption, description or '', event_id, now, memory_id])
        return self.get_batch_memory(memory_id, user_id)

    def delete_batch_memory(self, memory_id: str, user_id: str, is_admin: bool) -> bool:
        mem = self.get_batch_memory(memory_id)
        if not mem:
            return False
        if mem['uploaderId'] != user_id and not is_admin:
            raise PermissionError("You do not have permission to delete this memory.")

        self.db.execute("DELETE FROM batch_memory_likes WHERE memory_id = ?", [memory_id])
        self.db.execute("DELETE FROM batch_memory_comments WHERE memory_id = ?", [memory_id])
        self.db.execute("DELETE FROM batch_memory_reports WHERE memory_id = ?", [memory_id])
        self.db.execute("DELETE FROM batch_memories WHERE id = ?", [memory_id])
        return True

    def toggle_like_memory(self, memory_id: str, user_id: str) -> Dict[str, Any]:
        mem = self.get_batch_memory(memory_id)
        if not mem:
            raise ValueError("Memory not found.")

        existing = self.db.get_one("SELECT id FROM batch_memory_likes WHERE memory_id = ? AND user_id = ?", [memory_id, user_id])
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if existing:
            self.db.execute("DELETE FROM batch_memory_likes WHERE id = ?", [existing['id']])
            self.db.execute("UPDATE batch_memories SET likes_count = MAX(0, likes_count - 1), updated_at = ? WHERE id = ?", [now, memory_id])
            liked = False
        else:
            lk_id = f"memlike_{uuid.uuid4().hex[:12]}"
            self.db.execute("INSERT INTO batch_memory_likes (id, memory_id, user_id, created_at) VALUES (?, ?, ?, ?)", [lk_id, memory_id, user_id, now])
            self.db.execute("UPDATE batch_memories SET likes_count = likes_count + 1, updated_at = ? WHERE id = ?", [now, memory_id])
            liked = True

        updated = self.get_batch_memory(memory_id, user_id)
        return {
            "liked": liked,
            "likesCount": updated.get('likesCount', 0) if updated else 0,
            "uploaderId": mem.get('uploaderId'),
            "caption": mem.get('caption')
        }

    def list_memory_comments(self, memory_id: str) -> List[Dict[str, Any]]:
        rows = self.db.query("""
            SELECT * FROM batch_memory_comments
            WHERE memory_id = ?
            ORDER BY created_at ASC
        """, [memory_id])
        return [self._format_dict(r) for r in rows]

    def create_memory_comment(
        self,
        memory_id: str,
        user_id: str,
        user_name: str,
        user_role: str,
        user_avatar: Optional[str],
        content: str
    ) -> Dict[str, Any]:
        mem = self.get_batch_memory(memory_id)
        if not mem:
            raise ValueError("Memory not found.")

        cid = f"memcomm_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            INSERT INTO batch_memory_comments (id, memory_id, user_id, user_name, user_role, user_avatar, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [cid, memory_id, user_id, user_name, user_role, user_avatar, content, now, now])

        self.db.execute("UPDATE batch_memories SET comments_count = comments_count + 1, updated_at = ? WHERE id = ?", [now, memory_id])
        row = self.db.get_one("SELECT * FROM batch_memory_comments WHERE id = ?", [cid])
        return self._format_dict(row)

    def delete_memory_comment(self, comment_id: str, user_id: str, is_admin: bool) -> bool:
        row = self.db.get_one("SELECT * FROM batch_memory_comments WHERE id = ?", [comment_id])
        if not row:
            return False
        mem = self.get_batch_memory(row['memory_id'])
        is_owner = (row['user_id'] == user_id)
        is_mem_owner = (mem and mem['uploaderId'] == user_id)
        if not is_owner and not is_mem_owner and not is_admin:
            raise PermissionError("You do not have permission to delete this comment.")

        self.db.execute("DELETE FROM batch_memory_comments WHERE id = ?", [comment_id])
        if mem:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.db.execute("UPDATE batch_memories SET comments_count = MAX(0, comments_count - 1), updated_at = ? WHERE id = ?", [now, mem['id']])
        return True

    def report_batch_memory(
        self,
        memory_id: str,
        reporter_id: str,
        reporter_name: str,
        reason: str,
        details: Optional[str] = None
    ) -> Dict[str, Any]:
        mem = self.get_batch_memory(memory_id)
        if not mem:
            raise ValueError("Memory not found.")

        rep_id = f"memrep_{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.db.execute("""
            INSERT INTO batch_memory_reports (id, memory_id, reporter_id, reporter_name, reason, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        """, [rep_id, memory_id, reporter_id, reporter_name, reason, details or '', now])

        row = self.db.get_one("SELECT * FROM batch_memory_reports WHERE id = ?", [rep_id])
        return self._format_dict(row)

    def list_memory_reports(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = """
            SELECT r.*, m.caption as memory_caption, m.image_url as memory_image_url,
                   m.uploader_id, m.uploader_name, m.batch_id
            FROM batch_memory_reports r
            JOIN batch_memories m ON r.memory_id = m.id
        """
        params = []
        if status:
            query += " WHERE r.status = ?"
            params.append(status)
        query += " ORDER BY r.created_at DESC"
        rows = self.db.query(query, params)
        return [self._format_dict(r) for r in rows]

    def moderate_memory_report(
        self,
        report_id: str,
        admin_id: str,
        action: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        rep = self.db.get_one("SELECT * FROM batch_memory_reports WHERE id = ?", [report_id])
        if not rep:
            raise ValueError("Report not found.")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if action == 'dismiss':
            self.db.execute("""
                UPDATE batch_memory_reports
                SET status = 'dismissed', moderated_by = ?, moderated_at = ?, moderation_note = ?
                WHERE id = ?
            """, [admin_id, now, note or 'Report reviewed and dismissed.', report_id])
        elif action == 'remove':
            self.db.execute("""
                UPDATE batch_memory_reports
                SET status = 'removed', moderated_by = ?, moderated_at = ?, moderation_note = ?
                WHERE id = ?
            """, [admin_id, now, note or 'Content removed due to policy violation.', report_id])
            self.db.execute("""
                UPDATE batch_memories
                SET status = 'removed', updated_at = ?
                WHERE id = ?
            """, [now, rep['memory_id']])
        else:
            raise ValueError("Invalid moderation action. Must be 'dismiss' or 'remove'.")

        updated = self.db.get_one("SELECT * FROM batch_memory_reports WHERE id = ?", [report_id])
        return self._format_dict(updated)

    def list_batch_event_albums(self, batch_id: str) -> List[Dict[str, Any]]:
        """Lists events that have associated photos, with photo counts."""
        rows = self.db.query("""
            SELECT be.id, be.title, be.date, be.venue, be.event_type, be.cover_image,
                   COUNT(bm.id) as photos_count,
                   MAX(bm.image_url) as sample_photo_url
            FROM batch_events be
            LEFT JOIN batch_memories bm ON be.id = bm.event_id AND bm.status = 'approved'
            WHERE be.batch_id = ?
            GROUP BY be.id
            ORDER BY be.date DESC
        """, [batch_id])
        return [self._format_dict(r) for r in rows]

    def get_memory_timeline(self, batch_id: str) -> List[Dict[str, Any]]:
        """Groups batch memories by year for chronological memory timeline."""
        rows = self.db.query("""
            SELECT COALESCE(graduation_year, CAST(SUBSTR(taken_at, 1, 4) AS INTEGER)) as timeline_year,
                   COUNT(id) as count,
                   MAX(image_url) as highlight_image
            FROM batch_memories
            WHERE batch_id = ? AND status = 'approved'
            GROUP BY timeline_year
            ORDER BY timeline_year DESC
        """, [batch_id])

        all_memories = self.list_batch_memories(batch_id)
        result = []
        for r in rows:
            formatted = self._format_dict(r)
            year_val = formatted.get('timelineYear')
            formatted['year'] = year_val
            formatted['memories'] = [
                m for m in all_memories
                if m.get('graduationYear') == year_val or (m.get('takenAt') and str(year_val) in str(m.get('takenAt')))
            ]
            result.append(formatted)
        return result
