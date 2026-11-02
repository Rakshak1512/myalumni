import sys
import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from app.firebase import init_firebase, get_firestore_client


def redesign_database():
    print("==================================================")
    print("  MyAlumni 2.0 — Redesigning Cloud Firestore Schema")
    print("==================================================")

    success, err = init_firebase()
    if not success:
        print(f"[ERROR] Firebase connection failed: {err}")
        return False

    db = get_firestore_client()
    now = datetime.datetime.now(datetime.timezone.utc)

    student_uid = "demo_student_uid"
    alumni_uid = "demo_alumni_uid"
    faculty_uid = "demo_faculty_uid"
    admin_uid = "demo_admin_uid"

    # 1. Clean legacy collections if any exist
    for legacy_col in ['postings', 'temp', 'old_users']:
        docs = list(db.collection(legacy_col).stream())
        if docs:
            for d in docs:
                d.reference.delete()
            print(f"[-] Removed legacy collection: {legacy_col} ({len(docs)} docs)")

    # 2. Verify / Upsert Demo Users (Without Authentication Required)
    demo_users = [
        {
            "uid": admin_uid,
            "email": "admin.demo@myalumni.test",
            "displayName": "Dr. Sarah Admin",
            "role": "admin",
            "accountStatus": "active",
            "bio": "Chief Portal Administrator & Systems Overseer at MyAlumni.",
            "phone": "+1 (555) 019-2831",
            "avatarUrl": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            "isDemoAccount": True
        },
        {
            "uid": faculty_uid,
            "email": "faculty.demo@myalumni.test",
            "displayName": "Prof. Marcus Vance",
            "role": "faculty",
            "accountStatus": "active",
            "bio": "Professor of Computer Science & Academic Department Chair.",
            "phone": "+1 (555) 019-2832",
            "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "isDemoAccount": True
        },
        {
            "uid": student_uid,
            "email": "student.demo@myalumni.test",
            "displayName": "Alex Chen",
            "role": "student",
            "accountStatus": "active",
            "bio": "Final year CS student passionate about full-stack web architectures and cloud engineering.",
            "phone": "+1 (555) 019-2833",
            "avatarUrl": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
            "isDemoAccount": True
        },
        {
            "uid": alumni_uid,
            "email": "alumni.demo@myalumni.test",
            "displayName": "Elena Rostova",
            "role": "alumni",
            "accountStatus": "active",
            "bio": "Senior Cloud Software Engineer at Apex Technologies. Alumna of Batch 2021.",
            "phone": "+1 (555) 019-2834",
            "avatarUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "isDemoAccount": True
        }
    ]

    for u in demo_users:
        db.collection('users').document(u['uid']).set({**u, "updatedAt": now}, merge=True)
    print(f"[+] Verified and seeded {len(demo_users)} Demo User accounts (No authentication required).")

    # 3. Role-specific profiles
    db.collection('studentProfiles').document(student_uid).set({
        "userId": student_uid,
        "enrollmentNumber": "CS-2023-8941",
        "courseId": "course_cs",
        "courseName": "B.S. in Computer Science",
        "academicYearId": "year_2026",
        "academicYearName": "2025-2026",
        "skills": ["JavaScript", "Python", "Flask", "Docker", "Git", "PostgreSQL"],
        "careerInterests": ["Full-Stack Engineering", "Cloud Architecture", "DevOps"],
        "gpa": "3.85",
        "batchId": "batch_cs_2026",
        "githubUrl": "https://github.com/alexchen-demo",
        "linkedinUrl": "https://linkedin.com/in/alexchen-demo",
        "updatedAt": now
    }, merge=True)

    db.collection('alumniProfiles').document(alumni_uid).set({
        "userId": alumni_uid,
        "graduationYear": "2021",
        "courseId": "course_cs",
        "courseName": "B.S. in Computer Science",
        "company": "Apex Technologies",
        "jobTitle": "Senior Cloud Software Engineer",
        "industry": "Enterprise Software",
        "yearsOfExperience": 5,
        "location": "Seattle, WA (Remote)",
        "skills": ["Python", "Go", "Kubernetes", "GCP", "System Design"],
        "linkedinUrl": "https://linkedin.com/in/elena-rostova-demo",
        "isMentoringAvailable": True,
        "maxMentees": 4,
        "currentMenteesCount": 1,
        "batchId": "batch_cs_2021",
        "birthday": {"month": now.month, "day": now.day, "isPublic": True},
        "updatedAt": now
    }, merge=True)

    db.collection('facultyProfiles').document(faculty_uid).set({
        "userId": faculty_uid,
        "department": "Computer Science & Engineering",
        "designation": "Associate Professor & Student Advisor",
        "officeLocation": "Tech Hall, Room 402",
        "researchAreas": ["Distributed Systems", "Cloud Computing", "AI Ethics"],
        "updatedAt": now
    }, merge=True)
    print("[+] Seeded role-specific profile documents.")

    # 4. Additional specialized collections
    # savedOpportunities
    db.collection('savedOpportunities').document(f"save_{student_uid}_opp_1").set({
        "userId": student_uid,
        "opportunityId": "opp_1",
        "savedAt": now
    }, merge=True)

    # birthdayGreetings
    db.collection('birthdayGreetings').document(f"greet_{student_uid}_{alumni_uid}").set({
        "senderId": student_uid,
        "senderName": "Alex Chen",
        "recipientId": alumni_uid,
        "recipientName": "Elena Rostova",
        "message": "Happy Birthday Elena! Wishing you another successful year in tech!",
        "createdAt": now
    }, merge=True)

    # certifications
    db.collection('certifications').document(f"cert_{student_uid}_gcp").set({
        "userId": student_uid,
        "name": "Google Cloud Associate Cloud Engineer",
        "issuingOrganization": "Google Cloud",
        "issueDate": "2025-11-15",
        "credentialId": "GCP-ACE-98231",
        "credentialUrl": "https://cloud.google.com/certification",
        "createdAt": now
    }, merge=True)

    # mentorPreferences
    db.collection('mentorPreferences').document(alumni_uid).set({
        "mentorId": alumni_uid,
        "preferredTopics": ["System Design", "Cloud Migrations", "Career Navigation"],
        "maxMentees": 4,
        "meetingFrequency": "Bi-weekly",
        "isActive": True,
        "updatedAt": now
    }, merge=True)

    # reports
    db.collection('reports').document("report_quarterly_metrics").set({
        "title": "Q1 2026 Student & Alumni Engagement Report",
        "generatedBy": admin_uid,
        "metrics": {
            "totalStudents": 450,
            "totalAlumni": 1280,
            "activeMentorships": 64,
            "opportunitiesPosted": 38
        },
        "status": "published",
        "createdAt": now
    }, merge=True)

    print("[+] Seeded savedOpportunities, birthdayGreetings, certifications, mentorPreferences, and reports.")

    # Summary
    print("\n--------------------------------------------------")
    print("Database redesigned and all collections structured!")
    print("==================================================")
    return True


if __name__ == '__main__':
    ok = redesign_database()
    sys.exit(0 if ok else 1)

