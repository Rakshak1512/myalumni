from app.repositories.base_repository import BaseRepository
from app.repositories.user_repository import UserRepository
from app.repositories.academic_repository import AcademicRepository
from app.repositories.networking_repository import NetworkingRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.event_repository import EventRepository
from app.repositories.achievement_repository import AchievementRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.career_repository import CareerRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.admin_repository import AdminRepository

__all__ = [
    'BaseRepository',
    'UserRepository',
    'AcademicRepository',
    'NetworkingRepository',
    'ChatRepository',
    'OpportunityRepository',
    'EventRepository',
    'AchievementRepository',
    'ResourceRepository',
    'CommunityRepository',
    'CareerRepository',
    'NotificationRepository',
    'AdminRepository',
]

