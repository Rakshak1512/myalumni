import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class AchievementRepository(BaseRepository):
    def __init__(self):
        super().__init__('achievements')

    def list_approved(self) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('status', '==', 'approved').order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = self.collection.where('status', '==', 'approved').stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    def list_pending(self) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('status', '==', 'pending').order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = self.collection.where('status', '==', 'pending').stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('userId', '==', user_id).order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = self.collection.where('userId', '==', user_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    def review_achievement(self, achievement_id: str, status: str, notes: str, reviewer_id: str) -> Optional[Dict[str, Any]]:
        return self.update(achievement_id, {
            "status": status,
            "reviewNotes": notes,
            "reviewedBy": reviewer_id,
            "reviewedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

