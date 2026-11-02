import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class NotificationRepository(BaseRepository):
    def __init__(self):
        super().__init__('notifications')
        self.greetings_repo = BaseRepository('birthdayGreetings')

    def create_notification(self, recipient_id: str, notif_type: str, title: str, message: str, link: str = "") -> Dict[str, Any]:
        return self.create({
            "recipientId": recipient_id,
            "type": notif_type,
            "title": title,
            "message": message,
            "link": link,
            "isRead": False,
            "readAt": None
        })

    def list_user_notifications(self, user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('recipientId', '==', user_id).order_by('createdAt', direction=Query.DESCENDING).limit(limit).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = self.collection.where('recipientId', '==', user_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items[:limit]

    def get_unread_count(self, user_id: str) -> int:
        docs = self.collection.where('recipientId', '==', user_id).where('isRead', '==', False).stream()
        return sum(1 for _ in docs)

    def mark_as_read(self, notification_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        doc = self.get_by_id(notification_id)
        if not doc or doc.get('recipientId') != user_id:
            return None
        return self.update(notification_id, {
            "isRead": True,
            "readAt": datetime.datetime.now(datetime.timezone.utc)
        })

    def mark_all_as_read(self, user_id: str) -> int:
        docs = self.collection.where('recipientId', '==', user_id).where('isRead', '==', False).stream()
        count = 0
        now = datetime.datetime.now(datetime.timezone.utc)
        for d in docs:
            d.reference.update({"isRead": True, "readAt": now})
            count += 1
        return count

    # Birthday greetings
    def has_sent_recent_greeting(self, sender_id: str, recipient_id: str) -> bool:
        """Checks if sender already sent a greeting to recipient within the last 24 hours."""
        conn = self.db._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM birthday_greetings WHERE sender_id = ? AND recipient_id = ? AND datetime(created_at) >= datetime('now', '-1 day')",
                (sender_id, recipient_id)
            )
            row = cursor.fetchone()
            return (row[0] if row else 0) > 0
        except Exception:
            return False

    def send_birthday_greeting(self, sender_id: str, sender_name: str, recipient_id: str, recipient_name: str, text: str) -> Dict[str, Any]:
        greeting = self.greetings_repo.create({
            "senderId": sender_id,
            "senderName": sender_name,
            "recipientId": recipient_id,
            "recipientName": recipient_name,
            "greetingText": text,
            "text": text,
            "isRead": False,
            "is_read": 0
        })
        # Also create in-app notification for the recipient
        self.create_notification(
            recipient_id=recipient_id,
            notif_type="birthday_greeting",
            title=f"Birthday Greeting from {sender_name}!",
            message=f"'{text}'",
            link="/#/birthdays?tab=my-greetings"
        )
        return greeting

    def list_received_greetings(self, recipient_id: str) -> List[Dict[str, Any]]:
        db = self.db
        try:
            docs = db.collection('birthdayGreetings').where('recipientId', '==', recipient_id).order_by('createdAt', direction=Query.DESCENDING).stream()
            items = [serialize_doc(d) for d in docs]
        except Exception:
            docs = db.collection('birthdayGreetings').where('recipientId', '==', recipient_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)

        # Enrich with sender avatar and role
        for g in items:
            s_id = g.get('senderId') or g.get('sender_id')
            if s_id:
                try:
                    s_doc = db.collection('users').document(s_id).get()
                    if s_doc.exists:
                        s_data = serialize_doc(s_doc)
                        g['senderAvatarUrl'] = s_data.get('avatarUrl', '')
                        g['senderRole'] = s_data.get('role', 'student')
                except Exception:
                    pass
            g['isRead'] = bool(g.get('isRead') or g.get('is_read'))
            g['greetingText'] = g.get('greetingText') or g.get('text') or ''
        return items

    def mark_greeting_as_read(self, greeting_id: str, recipient_id: str) -> Optional[Dict[str, Any]]:
        """Marks a received birthday greeting as read."""
        doc = self.greetings_repo.get_by_id(greeting_id)
        if not doc:
            return None
        r_id = doc.get('recipientId') or doc.get('recipient_id')
        if r_id != recipient_id:
            return None
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return self.greetings_repo.update(greeting_id, {
            "isRead": True,
            "is_read": 1,
            "readAt": now_iso,
            "read_at": now_iso
        })

