import sys
import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from app.config import Config
from app.firebase import init_firebase, get_firestore_client


DEMO_USERS = [
    {
        "uid": "demo_admin_uid",
        "role": "admin",
        "email": "admin.demo@myalumni.test",
        "displayName": "Dr. Sarah Admin",
        "bio": "Chief Portal Administrator & Systems Overseer at MyAlumni.",
        "phone": "+1 (555) 019-2831",
        "profile": {}
    },
    {
        "uid": "demo_faculty_uid",
        "role": "faculty",
        "email": "faculty.demo@myalumni.test",
        "displayName": "Prof. Marcus Vance",
        "bio": "Professor of Computer Science & Academic Department Chair.",
        "phone": "+1 (555) 019-2832",
        "profile": {
            "department": "Computer Science & Engineering",
            "designation": "Associate Professor & Student Advisor",
            "officeLocation": "Tech Hall, Room 402",
            "researchAreas": ["Distributed Systems", "Cloud Computing", "AI Ethics"]
        }
    },
    {
        "uid": "demo_student_uid",
        "role": "student",
        "email": "student.demo@myalumni.test",
        "displayName": "Alex Chen",
        "bio": "Final year CS student passionate about full-stack web architectures and cloud engineering.",
        "phone": "+1 (555) 019-2833",
        "profile": {
            "enrollmentNumber": "CS-2023-8941",
            "courseId": "course_cs",
            "courseName": "B.S. in Computer Science",
            "academicYearId": "year_2026",
            "academicYearName": "2025-2026",
            "skills": ["JavaScript", "Python", "Flask", "Docker", "Git"],
            "careerInterests": ["Full-Stack Engineering", "Cloud Architecture", "DevOps"],
            "gpa": "3.85",
            "batchId": "batch_cs_2026",
            "githubUrl": "https://github.com/alexchen-demo",
            "linkedinUrl": "https://linkedin.com/in/alexchen-demo"
        }
    },
    {
        "uid": "demo_alumni_uid",
        "role": "alumni",
        "email": "alumni.demo@myalumni.test",
        "displayName": "Elena Rostova",
        "bio": "Senior Cloud Software Engineer at Apex Technologies. Alumna of Batch 2021. Actively mentoring students.",
        "phone": "+1 (555) 019-2834",
        "profile": {
            "graduationYear": "2021",
            "courseId": "course_cs",
            "courseName": "B.S. in Computer Science",
            "company": "Apex Technologies",
            "jobTitle": "Senior Cloud Software Engineer",
            "industry": "Enterprise Software",
            "yearsOfExperience": 5,
            "location": "Seattle, WA (Remote)",
            "skills": ["Python", "Go", "Kubernetes", "GCP", "Distributed Systems", "System Design"],
            "linkedinUrl": "https://linkedin.com/in/elena-rostova-demo",
            "isMentoringAvailable": True,
            "maxMentees": 4,
            "currentMenteesCount": 1,
            "batchId": "batch_cs_2021",
            "birthday": {
                "month": datetime.datetime.now().month,
                "day": datetime.datetime.now().day,  # Birthday today for celebration demo!
                "isPublic": True
            }
        }
    }
]


def remove_old_users_and_seed_demo():
    print("==================================================")
    print("  MyAlumni 2.0 — Database User Reset & Demo Seeding")
    print("==================================================")

    success, err = init_firebase()
    if not success:
        print(f"[ABORTED] Could not connect to Firebase:\n  {err}")
        return False

    db = get_firestore_client()
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Clean out old legacy user documents from Firestore
    print("\n[1/3] Removing old users from database...")
    old_docs = list(db.collection('users').stream())
    deleted_count = 0
    demo_uids = {u['uid'] for u in DEMO_USERS}

    for doc in old_docs:
        if doc.id not in demo_uids:
            doc.reference.delete()
            deleted_count += 1
            print(f"  [-] Removed legacy user doc: {doc.id}")

    print(f"[OK] Cleaned {deleted_count} old user documents from Firestore.")

    # 2. Add demo users directly into Cloud Firestore (No authentication required)
    print("\n[2/3] Adding demo users to Cloud Firestore...")
    for user_spec in DEMO_USERS:
        uid = user_spec['uid']
        email = user_spec['email']
        role = user_spec['role']
        display_name = user_spec['displayName']

        user_doc_ref = db.collection('users').document(uid)
        user_payload = {
            "uid": uid,
            "email": email,
            "displayName": display_name,
            "role": role,
            "accountStatus": "active",
            "bio": user_spec.get('bio', ''),
            "phone": user_spec.get('phone', ''),
            "avatarUrl": "",
            "isDemoAccount": True,
            "createdAt": now,
            "updatedAt": now
        }
        user_doc_ref.set(user_payload, merge=True)

        # Profile collection
        profile_data = user_spec.get('profile', {})
        if role in ('student', 'alumni', 'faculty') and profile_data:
            coll_name = f"{role}Profiles"
            prof_doc_ref = db.collection(coll_name).document(uid)
            prof_payload = {**profile_data, "userId": uid, "createdAt": now, "updatedAt": now}
            prof_doc_ref.set(prof_payload, merge=True)

        print(f"  [+] Seeded {role.upper():<7} user: {email} (UID: {uid})")

    # 3. Summary
    print("\n[3/3] Demo Users Ready in Database:")
    print("--------------------------------------------------")
    for u in DEMO_USERS:
        print(f"  [{u['role'].upper():<7}] {u['email']:<30} | {u['displayName']}")
    print("--------------------------------------------------")
    print("  Instant 1-Click Login Active: No password required for demo accounts!")
    print("==================================================")
    return True


if __name__ == '__main__':
    ok = remove_old_users_and_seed_demo()
    sys.exit(0 if ok else 1)
