import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class OpportunityRepository(BaseRepository):
    def __init__(self):
        super().__init__('opportunities')
        self.saved_repo = BaseRepository('savedOpportunities')
        self.apps_repo = BaseRepository('applications')

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

    def list_by_author(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('postedByUserId', '==', user_id).order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = self.collection.where('postedByUserId', '==', user_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    # Saved opportunities
    def toggle_save_opportunity(self, user_id: str, opportunity_id: str) -> bool:
        db = self.db
        docs = db.collection('savedOpportunities').where('userId', '==', user_id).where('opportunityId', '==', opportunity_id).stream()
        found = False
        for d in docs:
            d.reference.delete()
            found = True
        if not found:
            self.saved_repo.create({"userId": user_id, "opportunityId": opportunity_id, "postingId": opportunity_id})
            return True
        return False

    def list_saved_opportunities(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.db
        saved = [serialize_doc(d) for d in db.collection('savedOpportunities').where('userId', '==', user_id).stream()]
        opp_ids = [s.get('opportunityId') or s.get('postingId') or s.get('posting_id') for s in saved]
        results = []
        for oid in opp_ids:
            if oid:
                opp = self.get_by_id(oid)
                if opp:
                    results.append(opp)
        return results

    # Applications tracker
    def get_user_applications(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.db
        try:
            docs = db.collection('applications').where('userId', '==', user_id).order_by('updatedAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = db.collection('applications').where('userId', '==', user_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('updatedAt') or x.get('createdAt') or ''), reverse=True)
            return items

    def track_application(self, user_id: str, opportunity_id: str, opp_title: str, company: str, status: str, notes: str = "", resume_url: Optional[str] = None, resume_filename: Optional[str] = None) -> Dict[str, Any]:
        db = self.db
        existing = db.collection('applications').where('userId', '==', user_id).where('opportunityId', '==', opportunity_id).stream()
        for d in existing:
            # Update existing
            upd = {
                "status": status,
                "notes": notes,
                "updatedAt": datetime.datetime.now(datetime.timezone.utc)
            }
            if resume_url:
                upd["resumeUrl"] = resume_url
            if resume_filename:
                upd["resumeFilename"] = resume_filename
            d.reference.update(upd)
            return serialize_doc(d.reference.get())

        # Create new tracker item
        payload = {
            "userId": user_id,
            "opportunityId": opportunity_id,
            "opportunityTitle": opp_title,
            "company": company,
            "status": status,
            "notes": notes,
            "appliedDate": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        if resume_url:
            payload["resumeUrl"] = resume_url
        if resume_filename:
            payload["resumeFilename"] = resume_filename
        return self.apps_repo.create(payload)

