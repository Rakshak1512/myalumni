import datetime
from typing import Dict, Any, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class NetworkingRepository:
    def __init__(self):
        self.conn_repo = BaseRepository('connectionRequests')
        self.mentor_repo = BaseRepository('mentorshipRequests')
        self.pref_repo = BaseRepository('mentorPreferences')

    # Connection Requests
    def find_existing_connection(self, user1: str, user2: str) -> Optional[Dict[str, Any]]:
        db = self.conn_repo.db
        q1 = db.collection('connectionRequests').where('senderId', '==', user1).where('recipientId', '==', user2).stream()
        for doc in q1:
            return serialize_doc(doc)
        q2 = db.collection('connectionRequests').where('senderId', '==', user2).where('recipientId', '==', user1).stream()
        for doc in q2:
            return serialize_doc(doc)
        return None

    def send_connection_request(self, sender_id: str, sender_name: str, sender_role: str, recipient_id: str, recipient_name: str, recipient_role: str, message: str = "") -> Dict[str, Any]:
        data = {
            "senderId": sender_id,
            "senderName": sender_name,
            "senderRole": sender_role,
            "recipientId": recipient_id,
            "recipientName": recipient_name,
            "recipientRole": recipient_role,
            "status": "pending",
            "message": message,
        }
        return self.conn_repo.create(data)

    def list_user_connections(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.conn_repo.db
        sent = [serialize_doc(d) for d in db.collection('connectionRequests').where('senderId', '==', user_id).stream()]
        received = [serialize_doc(d) for d in db.collection('connectionRequests').where('recipientId', '==', user_id).stream()]
        all_reqs = sent + received
        all_reqs.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return all_reqs

    def update_connection_status(self, request_id: str, status: str) -> Optional[Dict[str, Any]]:
        return self.conn_repo.update(request_id, {"status": status})

    # Mentorship Requests
    def find_existing_mentorship(self, student_id: str, mentor_id: str) -> Optional[Dict[str, Any]]:
        db = self.mentor_repo.db
        docs = db.collection('mentorshipRequests').where('studentId', '==', student_id).where('mentorId', '==', mentor_id).where('status', 'in', ['pending', 'accepted']).stream()
        for d in docs:
            return serialize_doc(d)
        return None

    def send_mentorship_request(self, student_id: str, student_name: str, mentor_id: str, mentor_name: str, goals: str, message: str) -> Dict[str, Any]:
        data = {
            "studentId": student_id,
            "studentName": student_name,
            "mentorId": mentor_id,
            "mentorName": mentor_name,
            "goals": goals,
            "message": message,
            "status": "pending"
        }
        return self.mentor_repo.create(data)

    def list_user_mentorships(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.mentor_repo.db
        as_student = [serialize_doc(d) for d in db.collection('mentorshipRequests').where('studentId', '==', user_id).stream()]
        as_mentor = [serialize_doc(d) for d in db.collection('mentorshipRequests').where('mentorId', '==', user_id).stream()]
        all_m = as_student + as_mentor
        all_m.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return all_m

    def update_mentorship_status(self, request_id: str, status: str) -> Optional[Dict[str, Any]]:
        return self.mentor_repo.update(request_id, {"status": status})

