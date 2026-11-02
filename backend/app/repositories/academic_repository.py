from typing import Dict, Any, List
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class AcademicRepository:
    def __init__(self):
        self.courses_repo = BaseRepository('courses')
        self.years_repo = BaseRepository('academicYears')

    def list_courses(self) -> List[Dict[str, Any]]:
        return self.courses_repo.list_all()

    def get_course(self, course_id: str) -> Dict[str, Any]:
        return self.courses_repo.get_by_id(course_id)

    def create_course(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.courses_repo.create(data)

    def update_course(self, course_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.courses_repo.update(course_id, data)

    def delete_course(self, course_id: str) -> bool:
        return self.courses_repo.delete(course_id)

    def list_academic_years(self) -> List[Dict[str, Any]]:
        return self.years_repo.list_all()

    def create_academic_year(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.years_repo.create(data)

    def update_academic_year(self, year_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.years_repo.update(year_id, data)

    def delete_academic_year(self, year_id: str) -> bool:
        return self.years_repo.delete(year_id)

