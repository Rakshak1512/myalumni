import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class ResourceRepository(BaseRepository):
    def __init__(self):
        super().__init__('resources')
        self.ann_repo = BaseRepository('announcements')

    # Resources
    def list_resources(self, course_id: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.collection
        if course_id:
            query = query.where('targetCourseId', '==', course_id)
        if category:
            query = query.where('category', '==', category)
        try:
            docs = query.order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = query.stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    # Announcements
    def list_announcements(self, user_role: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            docs = self.ann_repo.collection.where('status', '==', 'published').order_by('createdAt', direction=Query.DESCENDING).stream()
            all_ann = [serialize_doc(d) for d in docs]
        except Exception:
            docs = self.ann_repo.collection.where('status', '==', 'published').stream()
            all_ann = [serialize_doc(d) for d in docs]
            all_ann.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
        if not user_role or user_role.lower() == 'admin':
            return all_ann

        results = []
        for a in all_ann:
            target = (a.get('targetRole') or 'all').lower()
            if target in ('all', user_role.lower()):
                results.append(a)
        return results

    def create_announcement(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.ann_repo.create({**data, "status": data.get("status", "published")})

