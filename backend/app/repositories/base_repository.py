import datetime
from typing import Dict, Any, List, Optional
from app.db import get_db, Query
from app.utils.serializers import serialize_doc, serialize_dict


class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def db(self):
        return get_db()

    @property
    def collection(self):
        return self.db.collection(self.collection_name)

    def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        doc = self.collection.document(doc_id).get()
        if not doc.exists:
            return None
        return serialize_doc(doc)

    def create(self, data: Dict[str, Any], doc_id: Optional[str] = None) -> Dict[str, Any]:
        now = datetime.datetime.now(datetime.timezone.utc)
        record = {**data, "createdAt": now, "updatedAt": now}
        if doc_id:
            doc_ref = self.collection.document(doc_id)
            doc_ref.set(record)
        else:
            _, doc_ref = self.collection.add(record)
        
        saved = doc_ref.get()
        return serialize_doc(saved)

    def update(self, doc_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc_ref = self.collection.document(doc_id)
        if not doc_ref.get().exists:
            return None
        payload = {**data, "updatedAt": datetime.datetime.now(datetime.timezone.utc)}
        doc_ref.update(payload)
        updated = doc_ref.get()
        return serialize_doc(updated)

    def delete(self, doc_id: str) -> bool:
        doc_ref = self.collection.document(doc_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True

    def list_all(self, limit: int = 100) -> List[Dict[str, Any]]:
        docs = self.collection.limit(limit).stream()
        return [serialize_doc(doc) for doc in docs]

