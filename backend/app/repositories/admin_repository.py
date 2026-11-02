import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class AdminRepository(BaseRepository):
    def __init__(self):
        super().__init__('adminRequests')
        self.reports_repo = BaseRepository('reports')
        self.audit_repo = BaseRepository('auditLogs')

    # Contact Admin / Support Tickets
    def create_request(self, requester_id: str, requester_name: str, requester_email: str, requester_role: str, category: str, subject: str, description: str, priority: str = "medium", attachment_url: Optional[str] = None, attachment_filename: Optional[str] = None) -> Dict[str, Any]:
        payload = {
            "requesterId": requester_id,
            "requesterName": requester_name,
            "requesterEmail": requester_email,
            "requesterRole": requester_role,
            "category": category,
            "subject": subject,
            "description": description,
            "status": "open",
            "priority": priority,
            "adminResponse": "",
            "respondedBy": None,
            "respondedAt": None
        }
        if attachment_url:
            payload["attachmentUrl"] = attachment_url
        if attachment_filename:
            payload["attachmentFilename"] = attachment_filename
        return self.create(payload)

    def list_user_requests(self, requester_id: str) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('requesterId', '==', requester_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items
        except Exception:
            return []

    def list_all_requests(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.collection
            if status and str(status).strip().lower() not in ('undefined', 'null', '', 'all', 'none'):
                query = query.where('status', '==', status)
            docs = query.stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items
        except Exception:
            return []

    def respond_to_request(self, request_id: str, admin_id: str, admin_name: str, response_text: str, new_status: str = "resolved") -> Optional[Dict[str, Any]]:
        return self.update(request_id, {
            "adminResponse": response_text,
            "respondedBy": admin_name,
            "respondedById": admin_id,
            "respondedAt": datetime.datetime.now(datetime.timezone.utc),
            "status": new_status
        })

    # Reports & Moderation
    def create_report(self, reporter_id: str, reported_user_id: str, target_type: str, target_id: str, reason: str, details: str = "") -> Dict[str, Any]:
        return self.reports_repo.create({
            "reporterId": reporter_id,
            "reportedUserId": reported_user_id,
            "targetType": target_type,
            "targetId": target_id,
            "reason": reason,
            "details": details,
            "status": "pending"
        })

    def list_reports(self) -> List[Dict[str, Any]]:
        docs = self.reports_repo.collection.order_by('createdAt', direction=Query.DESCENDING).stream()
        return [serialize_doc(d) for d in docs]

    def update_report_status(self, report_id: str, status: str) -> Optional[Dict[str, Any]]:
        return self.reports_repo.update(report_id, {"status": status})

    # Audit Logs
    def list_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        docs = self.audit_repo.collection.order_by('createdAt', direction=Query.DESCENDING).limit(limit).stream()
        return [serialize_doc(d) for d in docs]

    # Dashboard Statistics
    def get_system_stats(self) -> Dict[str, Any]:
        db = self.db
        users_stream = list(db.collection('users').stream())
        total_users = len(users_stream)
        role_counts = {"student": 0, "alumni": 0, "faculty": 0, "admin": 0}
        for u in users_stream:
            r = (u.to_dict().get('role') or '').lower()
            if r in role_counts:
                role_counts[r] += 1

        pending_opps = sum(1 for _ in db.collection('opportunities').where('status', '==', 'pending').stream())
        pending_achieve = sum(1 for _ in db.collection('achievements').where('status', '==', 'pending').stream())
        open_tickets = sum(1 for _ in self.collection.where('status', '==', 'open').stream())
        total_events = sum(1 for _ in db.collection('events').where('status', '==', 'approved').stream())
        total_resources = sum(1 for _ in db.collection('resources').stream())

        return {
            "totalUsers": total_users,
            "roleBreakdown": role_counts,
            "pendingOpportunities": pending_opps,
            "pendingAchievements": pending_achieve,
            "openSupportTickets": open_tickets,
            "approvedEvents": total_events,
            "totalResources": total_resources
        }

