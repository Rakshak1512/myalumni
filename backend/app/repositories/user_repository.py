import datetime
import calendar
from typing import Dict, Any, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc

try:
    from zoneinfo import ZoneInfo
    KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
except Exception:
    KOLKATA_TZ = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__('users')

    def get_user_with_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        user = self.get_by_id(user_id)
        if not user:
            return None

        role = user.get('role', '').lower()
        profile_collection = None
        if role == 'student':
            profile_collection = 'studentProfiles'
        elif role == 'alumni':
            profile_collection = 'alumniProfiles'
        elif role == 'faculty':
            profile_collection = 'facultyProfiles'

        if profile_collection:
            p_doc = self.db.collection(profile_collection).document(user_id).get()
            if p_doc.exists:
                user['profile'] = serialize_doc(p_doc)
            else:
                user['profile'] = {}
        else:
            user['profile'] = {}

        return user

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        docs = list(self.collection.where('email', '==', clean_email).stream())
        if not docs:
            return None
        return serialize_doc(docs[0])

    def update_role_profile(self, user_id: str, role: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        coll_name = f"{role.lower()}Profiles"
        doc_ref = self.db.collection(coll_name).document(user_id)
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {**profile_data, "userId": user_id, "updatedAt": now}
        
        if doc_ref.get().exists:
            doc_ref.update(payload)
        else:
            payload["createdAt"] = now
            doc_ref.set(payload)
            
        return serialize_doc(doc_ref.get())

    def search_alumni(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        query = self.collection.where('role', '==', 'alumni').where('accountStatus', '==', 'active')
        users = [serialize_doc(d) for d in query.stream()]
        results = []

        q_name = (query_params.get('name') or '').lower()
        q_course = (query_params.get('courseId') or '').lower()
        q_year = query_params.get('graduationYear')
        q_company = (query_params.get('company') or '').lower()
        q_role = (query_params.get('jobTitle') or '').lower()
        q_skills = (query_params.get('skills') or '').lower()
        q_mentoring = query_params.get('isMentoringAvailable')

        for u in users:
            uid = u['id']
            p_doc = self.db.collection('alumniProfiles').document(uid).get()
            profile = serialize_doc(p_doc) if p_doc.exists else {}
            # Strict DOB and birthday privacy sanitization
            profile.pop('date_of_birth', None)
            profile.pop('dateOfBirth', None)
            profile.pop('dob', None)
            vis = profile.get('birthdayVisibility') or profile.get('birthday_visibility') or 'visible'
            bday = profile.get('birthday')
            if (isinstance(bday, dict) and not bday.get('isPublic', True)) or str(vis).lower() == 'hidden':
                profile.pop('birthday', None)
            u['profile'] = profile

            if q_name and q_name not in (u.get('displayName') or '').lower():
                continue
            if q_course and q_course != (profile.get('courseId') or '').lower() and q_course not in (profile.get('courseName') or '').lower():
                continue
            if q_year and str(q_year) != str(profile.get('graduationYear', '')):
                continue
            if q_company and q_company not in (profile.get('company') or '').lower():
                continue
            if q_role and q_role not in (profile.get('jobTitle') or '').lower():
                continue
            if q_mentoring is not None:
                is_mentor = profile.get('isMentoringAvailable', False)
                if str(q_mentoring).lower() in ('true', '1') and not is_mentor:
                    continue
                elif str(q_mentoring).lower() in ('false', '0') and is_mentor:
                    continue
            if q_skills:
                skills_list = [str(s).lower() for s in profile.get('skills', [])]
                if not any(q_skills in s for s in skills_list):
                    continue

            results.append(u)

        return results

    def list_by_role(self, role: str) -> List[Dict[str, Any]]:
        query = self.collection.where('role', '==', role)
        users = [serialize_doc(d) for d in query.stream()]
        coll_name = f"{role.lower()}Profiles"
        for u in users:
            uid = u['id']
            try:
                p_doc = self.db.collection(coll_name).document(uid).get()
                u['profile'] = serialize_doc(p_doc) if p_doc.exists else {}
            except Exception:
                u['profile'] = {}
        return users

    def get_birthdays(self, current_user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves today's and upcoming birthdays of students and alumni whose birthday privacy allows it.
        Uses Asia/Kolkata timezone (UTC+05:30) as required.
        Handles Feb 29 birthdays (celebrated on Feb 28 in non-leap years).
        Strictly excludes birth years for privacy.
        """
        now_kolkata = datetime.datetime.now(KOLKATA_TZ)
        today = now_kolkata.date()

        # Gather profiles from both studentProfiles and alumniProfiles
        profiles_to_check = []
        try:
            for doc in self.db.collection('studentProfiles').stream():
                profiles_to_check.append(('student', doc.id, serialize_doc(doc)))
        except Exception:
            pass

        try:
            for doc in self.db.collection('alumniProfiles').stream():
                profiles_to_check.append(('alumni', doc.id, serialize_doc(doc)))
        except Exception:
            pass

        today_birthdays = []
        upcoming_birthdays = []

        # Count greetings per recipient for celebrations feed
        greetings_counts = {}
        try:
            conn = self.db._get_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT recipient_id, COUNT(*) FROM birthday_greetings GROUP BY recipient_id")
            for r_id, count in cursor.fetchall():
                greetings_counts[str(r_id)] = count
        except Exception:
            pass

        for role, uid, p_data in profiles_to_check:
            # Check privacy preference: explicit consent
            vis = p_data.get('birthdayVisibility') or p_data.get('birthday_visibility') or 'visible'
            bday_dict = p_data.get('birthday')
            if isinstance(bday_dict, dict) and not bday_dict.get('isPublic', True):
                vis = 'hidden'

            if str(vis).lower() == 'hidden':
                continue

            # Parse date of birth or legacy birthday
            dob_str = p_data.get('dateOfBirth') or p_data.get('date_of_birth') or p_data.get('dob')
            birth_month = None
            birth_day = None

            if dob_str and isinstance(dob_str, str):
                try:
                    parts = dob_str.strip().split('-')
                    if len(parts) == 3:
                        birth_month = int(parts[1])
                        birth_day = int(parts[2])
                except Exception:
                    pass

            if not birth_month and isinstance(bday_dict, dict):
                birth_month = bday_dict.get('month')
                birth_day = bday_dict.get('day')

            if not birth_month or not birth_day:
                continue

            # Fetch user account details
            u_doc = self.db.collection('users').document(uid).get()
            if not u_doc.exists:
                continue
            u_data = serialize_doc(u_doc)
            if u_data.get('accountStatus') != 'active':
                continue

            # Calculate next celebration date handling Feb 29 policy
            # In non-leap years, Feb 29 is celebrated on Feb 28
            def get_celebration_date_for_year(y, m, d):
                if m == 2 and d == 29:
                    if not calendar.isleap(y):
                        return datetime.date(y, 2, 28)
                try:
                    return datetime.date(y, m, d)
                except ValueError:
                    return datetime.date(y, m, min(d, 28))

            this_year_bday = get_celebration_date_for_year(today.year, birth_month, birth_day)
            if this_year_bday < today:
                next_bday = get_celebration_date_for_year(today.year + 1, birth_month, birth_day)
            else:
                next_bday = this_year_bday

            days_remaining = (next_bday - today).days

            # Month name formatting without year
            month_name = datetime.date(2000, birth_month, 1).strftime('%B')
            formatted_date = f"{birth_day} {month_name}"

            badge = "Upcoming"
            if days_remaining == 0:
                badge = "Today"
            elif days_remaining == 1:
                badge = "Tomorrow"
            elif days_remaining <= 3:
                badge = f"In {days_remaining} days"
            elif days_remaining <= 7:
                badge = f"In {days_remaining} days"

            item = {
                "userId": uid,
                "displayName": u_data.get('displayName', 'Community Member'),
                "avatarUrl": u_data.get('avatarUrl', ''),
                "role": role,
                "roleLabel": "Student Scholar" if role == 'student' else "Distinguished Alumni",
                "courseName": p_data.get('courseName') or u_data.get('courseName', ''),
                "company": p_data.get('company', ''),
                "jobTitle": p_data.get('jobTitle', ''),
                "graduationYear": p_data.get('graduationYear', ''),
                "month": birth_month,
                "day": birth_day,
                "formattedDate": formatted_date,
                "daysRemaining": days_remaining,
                "badge": badge,
                "isToday": (days_remaining == 0),
                "greetingsCount": greetings_counts.get(uid, 0)
            }

            if days_remaining == 0:
                today_birthdays.append(item)
            elif 0 < days_remaining <= 30:
                upcoming_birthdays.append(item)

        # Sort today's birthdays by display name
        today_birthdays.sort(key=lambda x: x['displayName'].lower())

        # Sort upcoming by days remaining ascending
        upcoming_birthdays.sort(key=lambda x: (x['daysRemaining'], x['displayName'].lower()))

        # Community celebrations feed: today + upcoming within 7 days
        celebrations = list(today_birthdays)
        for b in upcoming_birthdays:
            if b['daysRemaining'] <= 7 and b not in celebrations:
                celebrations.append(b)

        # Current user personal DOB status
        my_dob_info = {"hasDob": False, "dob": None, "visibility": "visible"}
        if current_user_id:
            curr_u = self.get_user_with_profile(current_user_id)
            if curr_u and 'profile' in curr_u:
                p = curr_u['profile']
                my_dob = p.get('dateOfBirth') or p.get('date_of_birth') or p.get('dob')
                my_vis = p.get('birthdayVisibility') or p.get('birthday_visibility') or 'visible'
                my_dob_info["hasDob"] = bool(my_dob)
                my_dob_info["dob"] = my_dob
                my_dob_info["visibility"] = my_vis

        return {
            "today": today_birthdays,
            "upcoming": upcoming_birthdays,
            "celebrations": celebrations,
            "myDob": my_dob_info
        }

    def update_birthday_and_privacy(self, user_id: str, dob: str, visibility: str = 'visible') -> Dict[str, Any]:
        """
        Validates and updates user's date of birth and community privacy setting.
        Stores complete DOB privately in SQLite.
        """
        user = self.get_by_id(user_id)
        if not user:
            raise ValueError("User not found.")

        role = user.get('role', 'student').lower()
        if role not in ('student', 'alumni', 'faculty', 'admin'):
            role = 'student'

        # Validate date of birth
        if not dob:
            raise ValueError("Date of birth is required.")

        try:
            parts = dob.strip().split('-')
            if len(parts) != 3:
                raise ValueError("Invalid date format. Expected YYYY-MM-DD.")
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            parsed_date = datetime.date(y, m, d)
        except Exception:
            raise ValueError("Invalid date. Please select a valid calendar date (YYYY-MM-DD).")

        now_kolkata = datetime.datetime.now(KOLKATA_TZ).date()
        if parsed_date >= now_kolkata:
            raise ValueError("Date of birth cannot be in the future or today.")

        age_years = (now_kolkata - parsed_date).days / 365.25
        if age_years < 12:
            raise ValueError("User must be at least 12 years of age to register a student or alumni profile.")
        if age_years > 120:
            raise ValueError("Please provide a valid date of birth.")

        clean_vis = 'hidden' if str(visibility).lower() == 'hidden' else 'visible'
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        payload = {
            "dateOfBirth": dob.strip(),
            "date_of_birth": dob.strip(),
            "birthdayVisibility": clean_vis,
            "birthday_visibility": clean_vis,
            "birthdayUpdatedAt": now_iso,
            "birthday_updated_at": now_iso,
            "birthday": {
                "month": m,
                "day": d,
                "isPublic": (clean_vis == 'visible')
            }
        }

        # Update role-specific profile table
        self.update_role_profile(user_id, role, payload)
        return {
            "userId": user_id,
            "dateOfBirth": dob.strip(),
            "birthdayVisibility": clean_vis,
            "month": m,
            "day": d,
            "updatedAt": now_iso
        }

