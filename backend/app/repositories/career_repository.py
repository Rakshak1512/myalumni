import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class CareerRepository:
    def __init__(self):
        self.goals_repo = BaseRepository('careerGoals')
        self.milestones_repo = BaseRepository('careerMilestones')
        self.projects_repo = BaseRepository('projects')
        self.certs_repo = BaseRepository('certifications')

    # Goals
    def list_user_goals(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.goals_repo.db
        try:
            docs = db.collection('careerGoals').where('userId', '==', user_id).order_by('createdAt', direction=Query.DESCENDING).stream()
            goals = [serialize_doc(d) for d in docs]
        except Exception:
            docs = db.collection('careerGoals').where('userId', '==', user_id).stream()
            goals = [serialize_doc(d) for d in docs]
            goals.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
        for g in goals:
            g['milestones'] = self.list_goal_milestones(g['id'])
        return goals

    def create_goal(self, user_id: str, title: str, description: str, target_role: str, target_date: str) -> Dict[str, Any]:
        return self.goals_repo.create({
            "userId": user_id,
            "title": title,
            "description": description,
            "targetRole": target_role,
            "targetDate": target_date,
            "status": "in_progress",
            "progressPercentage": 0
        })

    def update_goal(self, goal_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return self.goals_repo.update(goal_id, data)

    # Milestones
    def list_goal_milestones(self, goal_id: str) -> List[Dict[str, Any]]:
        db = self.milestones_repo.db
        try:
            docs = db.collection('careerMilestones').where('goalId', '==', goal_id).order_by('createdAt', direction=Query.ASCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = db.collection('careerMilestones').where('goalId', '==', goal_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''))
            return items

    def add_milestone(self, goal_id: str, user_id: str, title: str) -> Dict[str, Any]:
        m = self.milestones_repo.create({
            "goalId": goal_id,
            "userId": user_id,
            "title": title,
            "isCompleted": False,
            "completedAt": None
        })
        self.recalculate_goal_progress(goal_id)
        return m

    def toggle_milestone(self, milestone_id: str, is_completed: bool) -> Optional[Dict[str, Any]]:
        now = datetime.datetime.now(datetime.timezone.utc) if is_completed else None
        m = self.milestones_repo.update(milestone_id, {
            "isCompleted": is_completed,
            "completedAt": now
        })
        if m and 'goalId' in m:
            self.recalculate_goal_progress(m['goalId'])
        return m

    def recalculate_goal_progress(self, goal_id: str):
        milestones = self.list_goal_milestones(goal_id)
        if not milestones:
            self.goals_repo.update(goal_id, {"progressPercentage": 0})
            return
        completed = sum(1 for m in milestones if m.get('isCompleted'))
        percentage = round((completed / len(milestones)) * 100)
        status = "achieved" if percentage == 100 else "in_progress"
        self.goals_repo.update(goal_id, {"progressPercentage": percentage, "status": status})

    # Projects
    def list_user_projects(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.projects_repo.db
        try:
            docs = db.collection('projects').where('userId', '==', user_id).order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = db.collection('projects').where('userId', '==', user_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    def add_project(self, user_id: str, title: str, description: str, technologies: List[str], project_url: str = "", github_url: str = "") -> Dict[str, Any]:
        return self.projects_repo.create({
            "userId": user_id,
            "title": title,
            "description": description,
            "technologies": technologies,
            "projectUrl": project_url,
            "githubUrl": github_url
        })

    def delete_project(self, project_id: str, user_id: str) -> bool:
        doc = self.projects_repo.get_by_id(project_id)
        if doc and doc.get('userId') == user_id:
            return self.projects_repo.delete(project_id)
        return False

    # Certifications
    def list_user_certifications(self, user_id: str) -> List[Dict[str, Any]]:
        db = self.certs_repo.db
        try:
            docs = db.collection('certifications').where('userId', '==', user_id).order_by('createdAt', direction=Query.DESCENDING).stream()
            return [serialize_doc(d) for d in docs]
        except Exception:
            docs = db.collection('certifications').where('userId', '==', user_id).stream()
            items = [serialize_doc(d) for d in docs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
            return items

    def add_certification(self, user_id: str, name: str, issuing_org: str, issue_date: str, credential_id: str = "", credential_url: str = "") -> Dict[str, Any]:
        return self.certs_repo.create({
            "userId": user_id,
            "name": name,
            "issuingOrganization": issuing_org,
            "issueDate": issue_date,
            "credentialId": credential_id,
            "credentialUrl": credential_url
        })

