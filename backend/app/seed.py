import sys
import uuid
import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from werkzeug.security import generate_password_hash
from app.db import get_db


def seed_sqlite_database(db=None):
    """Populates the SQLite database with test users and rich demonstration data."""
    if db is None:
        db = get_db()

    now = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now.isoformat()
    default_pwd_hash = generate_password_hash("Password123!")

    print(f"[*] Seeding SQLite database at {db.db_path}...")

    # 1. Test Users for all 4 roles
    test_users = [
        {
            "uid": "demo_admin_uid",
            "role": "admin",
            "email": "admin@myalumni.edu",
            "displayName": "Dr. Sarah Admin",
            "bio": "Chief Portal Administrator & Systems Overseer at MyAlumni.",
            "phone": "+1 (555) 019-2831",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
            "profile": {}
        },
        {
            "uid": "demo_admin_uid_alias",
            "role": "admin",
            "email": "admin.demo@myalumni.test",
            "displayName": "Dr. Sarah Admin",
            "bio": "Chief Portal Administrator & Systems Overseer at MyAlumni.",
            "phone": "+1 (555) 019-2831",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
            "profile": {}
        },
        {
            "uid": "demo_faculty_uid",
            "role": "faculty",
            "email": "faculty@myalumni.edu",
            "displayName": "Prof. Marcus Vance",
            "bio": "Professor of Computer Science & Academic Department Chair.",
            "phone": "+1 (555) 019-2832",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
            "profile": {
                "department": "Computer Science & Engineering",
                "designation": "Associate Professor & Student Advisor",
                "officeLocation": "Tech Hall, Room 402",
                "researchAreas": ["Distributed Systems", "Cloud Computing", "AI Ethics"]
            }
        },
        {
            "uid": "demo_faculty_uid_alias",
            "role": "faculty",
            "email": "faculty.demo@myalumni.test",
            "displayName": "Prof. Marcus Vance",
            "bio": "Professor of Computer Science & Academic Department Chair.",
            "phone": "+1 (555) 019-2832",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
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
            "email": "student@myalumni.edu",
            "displayName": "Alex Chen",
            "bio": "Final year CS student passionate about full-stack web architectures and cloud engineering.",
            "phone": "+1 (555) 019-2833",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
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
            "uid": "demo_student_uid_alias",
            "role": "student",
            "email": "student.demo@myalumni.test",
            "displayName": "Alex Chen",
            "bio": "Final year CS student passionate about full-stack web architectures and cloud engineering.",
            "phone": "+1 (555) 019-2833",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
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
            "email": "alumni@myalumni.edu",
            "displayName": "Elena Rostova",
            "bio": "Senior Cloud Software Engineer at Apex Technologies. Alumna of Batch 2021. Actively mentoring students.",
            "phone": "+1 (555) 019-2834",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
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
                    "day": datetime.datetime.now().day,
                    "isPublic": True
                }
            }
        },
        {
            "uid": "demo_alumni_uid_alias",
            "role": "alumni",
            "email": "alumni.demo@myalumni.test",
            "displayName": "Elena Rostova",
            "bio": "Senior Cloud Software Engineer at Apex Technologies. Alumna of Batch 2021. Actively mentoring students.",
            "phone": "+1 (555) 019-2834",
            "passwordHash": default_pwd_hash,
            "accountStatus": "active",
            "isProvisioned": True,
            "emailVerified": True,
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
                    "day": datetime.datetime.now().day,
                    "isPublic": True
                }
            }
        }
    ]

    for u in test_users:
        uid = u["uid"]
        profile_data = u.pop("profile", {})
        role = u["role"]
        db.collection('users').document(uid).set({**u, "id": uid, "createdAt": now_iso, "updatedAt": now_iso})
        if role in ('student', 'alumni', 'faculty') and profile_data:
            coll_name = f"{role}Profiles"
            db.collection(coll_name).document(uid).set({**profile_data, "userId": uid, "createdAt": now_iso, "updatedAt": now_iso})

    print(f"  [+] Seeded {len(test_users)} test users.")

    # 2. Courses
    courses = [
        {"id": "course_cs", "code": "CS-101", "name": "B.S. in Computer Science", "department": "Computer Science & Engineering", "durationYears": 4, "degreeType": "Undergraduate", "isActive": True},
        {"id": "course_ds", "code": "DS-201", "name": "M.S. in Data Science", "department": "Data Science & AI", "durationYears": 2, "degreeType": "Postgraduate", "isActive": True},
        {"id": "course_ee", "code": "EE-102", "name": "B.S. in Electrical & Computer Engineering", "department": "Electrical Engineering", "durationYears": 4, "degreeType": "Undergraduate", "isActive": True},
        {"id": "course_it", "code": "IT-103", "name": "B.S. in Information Technology", "department": "Information Technology", "durationYears": 4, "degreeType": "Undergraduate", "isActive": True}
    ]
    for c in courses:
        cid = c.pop("id")
        db.collection('courses').document(cid).set({**c, "id": cid, "createdAt": now_iso, "updatedAt": now_iso})
    print(f"  [+] Seeded {len(courses)} courses.")

    # 3. Academic Years
    years = [
        {"id": "year_2025", "name": "2024-2025", "startDate": "2024-09-01", "endDate": "2025-06-30", "isCurrent": False},
        {"id": "year_2026", "name": "2025-2026", "startDate": "2025-09-01", "endDate": "2026-06-30", "isCurrent": True},
        {"id": "year_2027", "name": "2026-2027", "startDate": "2026-09-01", "endDate": "2027-06-30", "isCurrent": False}
    ]
    for y in years:
        yid = y.pop("id")
        db.collection('academicYears').document(yid).set({**y, "id": yid, "createdAt": now_iso, "updatedAt": now_iso})
    print(f"  [+] Seeded {len(years)} academic years.")

    # 4. Connection Request
    conn_id = "conn_demo_student_uid_demo_alumni_uid"
    db.collection('connectionRequests').document(conn_id).set({
        "id": conn_id,
        "senderId": "demo_student_uid",
        "senderName": "Alex Chen",
        "senderRole": "student",
        "recipientId": "demo_alumni_uid",
        "recipientName": "Elena Rostova",
        "recipientRole": "alumni",
        "status": "accepted",
        "message": "Hi Elena, I am a final-year CS student interested in cloud systems at Apex. Would love to connect!",
        "createdAt": now_iso,
        "updatedAt": now_iso
    })

    # 5. Mentorship Request
    mentor_req_id = "mentor_demo_student_uid_demo_alumni_uid"
    db.collection('mentorshipRequests').document(mentor_req_id).set({
        "id": mentor_req_id,
        "studentId": "demo_student_uid",
        "studentName": "Alex Chen",
        "mentorId": "demo_alumni_uid",
        "mentorName": "Elena Rostova",
        "goals": "Transition into Cloud Infrastructure roles and prepare for systems design interviews.",
        "message": "Looking forward to learning from your experience leading infrastructure at Apex!",
        "status": "accepted",
        "createdAt": now_iso,
        "updatedAt": now_iso
    })

    # 6. Direct Human-to-Human Conversation and Messages
    conv_id = "conv_demo_student_uid_demo_alumni_uid"
    conv_ref = db.collection('conversations').document(conv_id)
    conv_ref.set({
        "id": conv_id,
        "participants": ["demo_student_uid", "demo_alumni_uid"],
        "participantNames": {
            "demo_student_uid": "Alex Chen",
            "demo_alumni_uid": "Elena Rostova"
        },
        "participantRoles": {
            "demo_student_uid": "student",
            "demo_alumni_uid": "alumni"
        },
        "lastMessage": "Sounds great Alex! Let us schedule a mock system design session next Tuesday at 5 PM.",
        "lastMessageSenderId": "demo_alumni_uid",
        "lastMessageAt": now_iso,
        "createdAt": now_iso,
        "updatedAt": now_iso
    })

    # Messages inside conversation
    msgs = [
        {"senderId": "demo_student_uid", "senderName": "Alex Chen", "text": "Hi Elena! Thank you for accepting my mentorship request. I have been studying distributed systems."},
        {"senderId": "demo_alumni_uid", "senderName": "Elena Rostova", "text": "Welcome Alex! Glad to help. Have you looked into Kubernetes and container networking?"},
        {"senderId": "demo_student_uid", "senderName": "Alex Chen", "text": "Yes, I deployed a Flask cluster on minikube and configured ingress routing."},
        {"senderId": "demo_alumni_uid", "senderName": "Elena Rostova", "text": "Sounds great Alex! Let us schedule a mock system design session next Tuesday at 5 PM."}
    ]
    for m in msgs:
        m_id = str(uuid.uuid4()).replace('-', '')[:20]
        conv_ref.collection('messages').document(m_id).set({
            **m,
            "id": m_id,
            "conversationId": conv_id,
            "readBy": ["demo_student_uid", "demo_alumni_uid"],
            "createdAt": now_iso
        })
    print("  [+] Seeded active conversation and message history.")

    # 7. Opportunities
    opps = [
        {
            "id": "opp_apex_cloud",
            "title": "Cloud Infrastructure Software Engineer",
            "company": "Apex Technologies",
            "type": "job",
            "location": "Seattle, WA (Hybrid)",
            "workplaceType": "hybrid",
            "experienceLevel": "Entry Level (0-2 years)",
            "description": "Join our Core Cloud Infrastructure group building low-latency microservices with Python, Go, and Kubernetes.",
            "skillsRequired": ["Python", "Go", "Docker", "Kubernetes", "Linux"],
            "applicationUrl": "https://tinyurl.com/hcl-fresher-recruitment",
            "postedByUserId": "demo_alumni_uid",
            "postedByUserName": "Elena Rostova",
            "status": "approved",
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "opp_stripe_fullstack",
            "title": "Full-Stack Software Engineer (Grad 2026)",
            "company": "Stripe",
            "type": "job",
            "location": "San Francisco, CA (or Remote)",
            "workplaceType": "remote",
            "experienceLevel": "New Graduate",
            "description": "Design and implement intuitive customer interfaces and reliable financial backend workflows.",
            "skillsRequired": ["JavaScript", "React", "Python", "API Design", "PostgreSQL"],
            "applicationUrl": "https://tinyurl.com/hcl-fresher-recruitment",
            "postedByUserId": "demo_alumni_uid",
            "postedByUserName": "Elena Rostova",
            "status": "approved",
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "opp_google_intern",
            "title": "Summer 2026 Software Engineering Intern",
            "company": "Google",
            "type": "internship",
            "location": "Mountain View, CA",
            "workplaceType": "onsite",
            "experienceLevel": "Student / Intern",
            "description": "Work directly on high-scale distributed storage and production ML pipelines during an intensive 12-week internship.",
            "skillsRequired": ["Algorithms", "Data Structures", "C++", "Python"],
            "applicationUrl": "https://tinyurl.com/hcl-fresher-recruitment",
            "postedByUserId": "demo_admin_uid",
            "postedByUserName": "Dr. Sarah Admin",
            "status": "approved",
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "opp_mit_research",
            "title": "Graduate Research Fellow in Generative Systems",
            "company": "MIT CSAIL",
            "type": "research",
            "location": "Cambridge, MA",
            "workplaceType": "onsite",
            "experienceLevel": "Postgraduate",
            "description": "Investigate agentic workflow safety, formal verification, and resilient distributed data representations.",
            "skillsRequired": ["Python", "PyTorch", "Formal Methods", "Mathematics"],
            "applicationUrl": "https://tinyurl.com/hcl-fresher-recruitment",
            "postedByUserId": "demo_faculty_uid",
            "postedByUserName": "Prof. Marcus Vance",
            "status": "approved",
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "opp_pending_moderation",
            "title": "Junior DevOps Engineer (Pending Review)",
            "company": "CloudForge Labs",
            "type": "job",
            "location": "Remote",
            "workplaceType": "remote",
            "experienceLevel": "Entry Level",
            "description": "Pending faculty moderation review before publication on the community board.",
            "skillsRequired": ["Terraform", "AWS", "Bash"],
            "applicationUrl": "https://tinyurl.com/hcl-fresher-recruitment",
            "postedByUserId": "demo_alumni_uid",
            "postedByUserName": "Elena Rostova",
            "status": "pending",
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]
    for opp in opps:
        oid = opp.pop("id")
        db.collection('opportunities').document(oid).set({**opp, "id": oid})
    print(f"  [+] Seeded {len(opps)} opportunities (approved and pending moderation).")

    # 8. Events
    events = [
        {
            "id": "event_alumni_homecoming",
            "title": "Annual Alumni Homecoming & Networking Gala 2026",
            "description": "Reunite with your classmates, celebrate outstanding departmental achievements, and expand your professional circle.",
            "date": (now + datetime.timedelta(days=30)).strftime("%Y-%m-%d"),
            "time": "18:00 - 22:00 PST",
            "location": "Grand University Ballroom & Live Stream",
            "eventType": "reunion",
            "organizerId": "demo_admin_uid",
            "organizerName": "Dr. Sarah Admin",
            "capacity": 300,
            "attendeesCount": 85,
            "status": "approved",
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "id": "event_sys_design_workshop",
            "title": "Industry Workshop: Production Systems Architecture at Scale",
            "description": "Interactive technical workshop led by Elena Rostova covering high-availability distributed systems.",
            "date": (now + datetime.timedelta(days=14)).strftime("%Y-%m-%d"),
            "time": "17:00 - 19:00 PST",
            "location": "Virtual (Google Meet)",
            "eventType": "webinar",
            "organizerId": "demo_alumni_uid",
            "organizerName": "Elena Rostova",
            "capacity": 150,
            "attendeesCount": 42,
            "status": "approved",
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]
    for ev in events:
        eid = ev.pop("id")
        db.collection('events').document(eid).set({**ev, "id": eid})
    print(f"  [+] Seeded {len(events)} events.")

    # 9. Batch Communities
    batches = [
        {"id": "batch_cs_2021", "name": "Class of 2021 — Computer Science", "courseId": "course_cs", "courseName": "B.S. in Computer Science", "graduationYear": 2021, "membersCount": 48},
        {"id": "batch_cs_2026", "name": "Class of 2026 — Computer Science", "courseId": "course_cs", "courseName": "B.S. in Computer Science", "graduationYear": 2026, "membersCount": 62}
    ]
    for b in batches:
        bid = b.pop("id")
        db.collection('batches').document(bid).set({**b, "id": bid, "createdAt": now_iso, "updatedAt": now_iso})

    # Add batch memberships
    db.collection('batchMembers').document("bm_alex_2026").set({
        "id": "bm_alex_2026",
        "batchId": "batch_cs_2026",
        "userId": "demo_student_uid",
        "userName": "Alex Chen",
        "role": "member",
        "createdAt": now_iso
    })
    db.collection('batchMembers').document("bm_elena_2021").set({
        "id": "bm_elena_2021",
        "batchId": "batch_cs_2021",
        "userId": "demo_alumni_uid",
        "userName": "Elena Rostova",
        "role": "member",
        "createdAt": now_iso
    })

    # Community post
    post_id = "post_batch_2026_welcome"
    db.collection('communityPosts').document(post_id).set({
        "id": post_id,
        "batchId": "batch_cs_2026",
        "authorId": "demo_student_uid",
        "authorName": "Alex Chen",
        "authorRole": "student",
        "title": "Welcome to our Senior Year Discussion Thread!",
        "content": "Let us use this space to coordinate capstone projects, share technical interview question banks, and plan study groups.",
        "likesCount": 12,
        "createdAt": now_iso,
        "updatedAt": now_iso
    })
    print("  [+] Seeded batch communities and cohort threads.")

    # 10. Academic Resources & Announcements
    resources = [
        {
            "id": "res_cs_dist_systems",
            "title": "CS-401 Distributed Systems Lecture Archives & Lab Guide",
            "category": "study_materials",
            "courseId": "course_cs",
            "courseName": "B.S. in Computer Science",
            "uploadedBy": "Prof. Marcus Vance",
            "fileUrl": "https://archive.example/cs401_notes.pdf",
            "fileSize": "4.2 MB",
            "createdAt": now_iso
        },
        {
            "id": "res_announcement_spring_reg",
            "title": "Notice: Spring Term Elective Course Registration Open",
            "category": "announcement",
            "priority": "high",
            "content": "All undergraduate CS and DS students must finalize their elective course registrations before the 15th.",
            "uploadedBy": "Academic Dean",
            "createdAt": now_iso
        }
    ]
    for r in resources:
        rid = r.pop("id")
        db.collection('resources').document(rid).set({**r, "id": rid})
    print(f"  [+] Seeded {len(resources)} academic resources.")

    # 11. Career Goals & Milestones for Student
    goal_id = "goal_alex_cloud_architect"
    db.collection('careerGoals').document(goal_id).set({
        "id": goal_id,
        "userId": "demo_student_uid",
        "title": "Land Cloud Software Engineer Role",
        "description": "Secure a full-time distributed systems software engineering position at a top tier cloud infrastructure company.",
        "targetRole": "Cloud Software Engineer",
        "targetDate": "2026-06-01",
        "status": "in_progress",
        "progressPercentage": 67,
        "createdAt": now_iso,
        "updatedAt": now_iso
    })

    milestones = [
        {"id": "ms_1", "goalId": goal_id, "userId": "demo_student_uid", "title": "Complete CKA (Certified Kubernetes Administrator) Course", "isCompleted": True},
        {"id": "ms_2", "goalId": goal_id, "userId": "demo_student_uid", "title": "Build distributed key-value store in Go with Raft consensus", "isCompleted": True},
        {"id": "ms_3", "goalId": goal_id, "userId": "demo_student_uid", "title": "Conduct 5 mock technical system design interviews with Elena", "isCompleted": False}
    ]
    for ms in milestones:
        msid = ms.pop("id")
        db.collection('careerMilestones').document(msid).set({**ms, "id": msid, "createdAt": now_iso})
    print("  [+] Seeded student career goals and milestones.")

    print("[SUCCESS] SQLite database successfully seeded with all test users and records!")
    return True


if __name__ == '__main__':
    # Add backend directory to sys.path
    backend_dir = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(backend_dir))
    seed_sqlite_database()
