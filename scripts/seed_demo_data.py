import sys
import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from app.config import Config
from app.firebase import init_firebase, get_firestore_client


def seed_data():
    print("==================================================")
    print("  MyAlumni 2.0 — Seeding Full Demo Data to Cloud")
    print("==================================================")

    success, err = init_firebase()
    if not success:
        print(f"[ABORTED] Firebase connection failed:\n  {err}")
        return False

    db = get_firestore_client()
    now = datetime.datetime.now(datetime.timezone.utc)

    # Stable Demo UIDs
    student_uid = "demo_student_uid"
    alumni_uid = "demo_alumni_uid"
    faculty_uid = "demo_faculty_uid"
    admin_uid = "demo_admin_uid"

    # 1. Courses
    courses = [
        {"id": "course_cs", "code": "CS-101", "name": "B.S. in Computer Science", "department": "Computer Science & Engineering", "durationYears": 4, "degreeType": "Undergraduate", "isActive": True},
        {"id": "course_ds", "code": "DS-201", "name": "M.S. in Data Science", "department": "Data Science & AI", "durationYears": 2, "degreeType": "Postgraduate", "isActive": True},
        {"id": "course_ee", "code": "EE-102", "name": "B.S. in Electrical & Computer Engineering", "department": "Electrical Engineering", "durationYears": 4, "degreeType": "Undergraduate", "isActive": True},
        {"id": "course_it", "code": "IT-103", "name": "B.S. in Information Technology", "department": "Information Technology", "durationYears": 4, "degreeType": "Undergraduate", "isActive": True}
    ]
    for c in courses:
        cid = c.pop("id")
        db.collection('courses').document(cid).set({**c, "updatedAt": now}, merge=True)
    print(f"[+] Seeded {len(courses)} courses.")

    # 2. Academic Years
    years = [
        {"id": "year_2025", "name": "2024-2025", "startDate": "2024-09-01", "endDate": "2025-06-30", "isCurrent": False},
        {"id": "year_2026", "name": "2025-2026", "startDate": "2025-09-01", "endDate": "2026-06-30", "isCurrent": True},
        {"id": "year_2027", "name": "2026-2027", "startDate": "2026-09-01", "endDate": "2027-06-30", "isCurrent": False}
    ]
    for y in years:
        yid = y.pop("id")
        db.collection('academicYears').document(yid).set({**y, "updatedAt": now}, merge=True)
    print(f"[+] Seeded {len(years)} academic years.")

    # 3. Connection Request
    conn_id = f"conn_{student_uid}_{alumni_uid}"
    db.collection('connectionRequests').document(conn_id).set({
        "senderId": student_uid,
        "senderName": "Alex Chen",
        "senderRole": "student",
        "recipientId": alumni_uid,
        "recipientName": "Elena Rostova",
        "recipientRole": "alumni",
        "status": "accepted",
        "message": "Hi Elena, I am a final-year CS student interested in cloud systems and distributed engineering at Apex Technologies. Would love to connect!",
        "createdAt": now - datetime.timedelta(days=10),
        "updatedAt": now - datetime.timedelta(days=9)
    }, merge=True)
    print("[+] Seeded accepted connection request.")

    # 4. Mentorship Request
    mentor_req_id = f"mentor_{student_uid}_{alumni_uid}"
    db.collection('mentorshipRequests').document(mentor_req_id).set({
        "studentId": student_uid,
        "studentName": "Alex Chen",
        "mentorId": alumni_uid,
        "mentorName": "Elena Rostova",
        "goals": "Transition into Cloud Infrastructure roles, prepare for systems design interviews, and review resume.",
        "message": "Looking forward to learning from your experience leading infrastructure at Apex!",
        "status": "accepted",
        "createdAt": now - datetime.timedelta(days=8),
        "updatedAt": now - datetime.timedelta(days=7)
    }, merge=True)
    print("[+] Seeded active mentorship relationship.")

    # 5. Conversation and Messages (Human-to-Human Chat)
    conv_id = f"conv_{student_uid}_{alumni_uid}"
    db.collection('conversations').document(conv_id).set({
        "participants": [student_uid, alumni_uid],
        "participantNames": {
            student_uid: "Alex Chen",
            alumni_uid: "Elena Rostova"
        },
        "participantRoles": {
            student_uid: "student",
            alumni_uid: "alumni"
        },
        "lastMessage": "Sounds great Alex! Let us schedule a mock system design session next Tuesday at 5 PM.",
        "lastMessageSenderId": alumni_uid,
        "lastMessageAt": now - datetime.timedelta(hours=2),
        "createdAt": now - datetime.timedelta(days=6),
        "updatedAt": now - datetime.timedelta(hours=2)
    }, merge=True)

    messages = [
        {"id": "msg_1", "senderId": student_uid, "senderName": "Alex Chen", "text": "Hi Elena! Thank you so much for accepting my mentorship request.", "createdAt": now - datetime.timedelta(days=5)},
        {"id": "msg_2", "senderId": alumni_uid, "senderName": "Elena Rostova", "text": "Happy to connect Alex! Tell me about the projects you are currently building.", "createdAt": now - datetime.timedelta(days=4)},
        {"id": "msg_3", "senderId": student_uid, "senderName": "Alex Chen", "text": "I just deployed a distributed URL shortener using Docker, Flask, and Redis. I am preparing for cloud engineering roles.", "createdAt": now - datetime.timedelta(days=2)},
        {"id": "msg_4", "senderId": alumni_uid, "senderName": "Elena Rostova", "text": "Sounds great Alex! Let us schedule a mock system design session next Tuesday at 5 PM.", "createdAt": now - datetime.timedelta(hours=2)}
    ]
    for m in messages:
        mid = m.pop("id")
        db.collection('conversations').document(conv_id).collection('messages').document(mid).set({
            **m,
            "conversationId": conv_id,
            "readBy": [student_uid, alumni_uid]
        }, merge=True)
    print(f"[+] Seeded 1-on-1 human conversation with {len(messages)} messages.")

    # 6. Opportunities (Jobs, Internships, Referrals)
    opportunities = [
        {
            "id": "opp_1",
            "title": "Graduate Cloud Infrastructure Engineer",
            "company": "Apex Technologies",
            "type": "job",
            "location": "Seattle, WA / Remote",
            "isRemote": True,
            "description": "Join our Core Infrastructure team building next-generation container orchestration and telemetry systems.",
            "requirements": "Strong Python/Go skills, Docker, Linux fundamentals, and passion for distributed reliability.",
            "targetCourses": ["B.S. in Computer Science", "M.S. in Data Science"],
            "applicationUrl": "https://apextech.demo/careers/cloud-engineer",
            "deadline": "2026-12-31",
            "contactEmail": "elena.rostova@apextech.demo",
            "postedByUserId": alumni_uid,
            "postedByName": "Elena Rostova",
            "postedByRole": "alumni",
            "status": "approved",
            "reviewNotes": "Verified legitimate alumni job opportunity.",
            "reviewedBy": "Prof. Marcus Vance",
            "createdAt": now - datetime.timedelta(days=12)
        },
        {
            "id": "opp_2",
            "title": "Summer 2027 Full-Stack Software Engineering Intern",
            "company": "CloudMatrix Systems",
            "type": "internship",
            "location": "San Francisco, CA",
            "isRemote": False,
            "description": "12-week paid engineering internship building real-time collaboration tools for enterprise clients.",
            "requirements": "Familiarity with modern JavaScript, REST APIs, Git, and data structures.",
            "targetCourses": ["B.S. in Computer Science", "B.S. in Information Technology"],
            "applicationUrl": "https://cloudmatrix.demo/internships",
            "deadline": "2027-02-15",
            "contactEmail": "campus-recruiting@cloudmatrix.demo",
            "postedByUserId": faculty_uid,
            "postedByName": "Prof. Marcus Vance",
            "postedByRole": "faculty",
            "status": "approved",
            "reviewNotes": "Department endorsed internship partner.",
            "reviewedBy": "Prof. Marcus Vance",
            "createdAt": now - datetime.timedelta(days=5)
        },
        {
            "id": "opp_3",
            "title": "Senior Data Platform Engineer (Direct Alumni Referral)",
            "company": "DataVanguard AI",
            "type": "referral",
            "location": "Remote (US/Canada)",
            "isRemote": True,
            "description": "Looking for talented graduates and alumni with BigQuery, Spark, and pipeline architecture experience for internal referral.",
            "requirements": "3+ years data engineering, Spark, SQL, Airflow.",
            "targetCourses": ["M.S. in Data Science", "B.S. in Computer Science"],
            "applicationUrl": "mailto:referrals@myalumni.portal",
            "deadline": "2026-11-30",
            "contactEmail": "referrals@myalumni.portal",
            "postedByUserId": alumni_uid,
            "postedByName": "Elena Rostova",
            "postedByRole": "alumni",
            "status": "pending",
            "reviewNotes": "",
            "reviewedBy": None,
            "createdAt": now - datetime.timedelta(hours=6)
        }
    ]
    for o in opportunities:
        oid = o.pop("id")
        db.collection('opportunities').document(oid).set({**o, "updatedAt": now}, merge=True)
    print(f"[+] Seeded {len(opportunities)} opportunities.")

    # 7. Student Application Tracker
    db.collection('applications').document(f"app_{student_uid}_opp_1").set({
        "userId": student_uid,
        "opportunityId": "opp_1",
        "opportunityTitle": "Graduate Cloud Infrastructure Engineer",
        "company": "Apex Technologies",
        "status": "interviewing",
        "notes": "Had preliminary recruiter screen; system design technical round scheduled with Elena's team.",
        "appliedDate": (now - datetime.timedelta(days=6)).isoformat(),
        "createdAt": now - datetime.timedelta(days=6),
        "updatedAt": now - datetime.timedelta(days=1)
    }, merge=True)
    print("[+] Seeded private career application tracker item.")

    # 8. Resources & Announcements
    resources = [
        {
            "id": "res_1",
            "title": "Comprehensive Cloud Architecture & Distributed Systems Guide",
            "description": "Curated PDF review covering CAP theorem, consensus algorithms (Raft), sharding, and caching strategies.",
            "category": "study_materials",
            "fileUrl": "https://storage.googleapis.com/demo/cloud_architecture_handbook.pdf",
            "externalUrl": "https://github.com/donnemartin/system-design-primer",
            "targetCourseId": "course_cs",
            "targetCourseName": "B.S. in Computer Science",
            "targetYearId": "year_2026",
            "uploadedByUserId": faculty_uid,
            "uploadedByName": "Prof. Marcus Vance",
            "uploadedByRole": "faculty",
            "fileSize": "3.4 MB",
            "mimeType": "application/pdf",
            "createdAt": now - datetime.timedelta(days=15)
        },
        {
            "id": "res_2",
            "title": "Previous Year Midterm & Final Question Papers (2023-2025)",
            "description": "Compiled examination archives for Advanced Algorithms (CS-401) and Database Internals (CS-405).",
            "category": "previous_question_papers",
            "fileUrl": "https://storage.googleapis.com/demo/exam_archive_cs.zip",
            "externalUrl": "",
            "targetCourseId": "course_cs",
            "targetCourseName": "B.S. in Computer Science",
            "targetYearId": "year_2026",
            "uploadedByUserId": faculty_uid,
            "uploadedByName": "Prof. Marcus Vance",
            "uploadedByRole": "faculty",
            "fileSize": "8.1 MB",
            "mimeType": "application/zip",
            "createdAt": now - datetime.timedelta(days=20)
        }
    ]
    for r in resources:
        rid = r.pop("id")
        db.collection('resources').document(rid).set({**r, "updatedAt": now}, merge=True)

    announcements = [
        {
            "id": "ann_1",
            "title": "Annual Alumni Career Conclave 2026 Registration Open",
            "content": "We are proud to announce the 2026 MyAlumni Annual Career Conclave featuring over 40 alumni speakers across Tech, Finance, and Research.",
            "category": "event",
            "targetRole": "all",
            "priority": "high",
            "publishedByUserId": faculty_uid,
            "publishedByName": "Prof. Marcus Vance",
            "status": "published",
            "createdAt": now - datetime.timedelta(days=3)
        }
    ]
    for a in announcements:
        aid = a.pop("id")
        db.collection('announcements').document(aid).set({**a, "updatedAt": now}, merge=True)
    print(f"[+] Seeded academic resources and announcements.")

    # 9. Achievements
    achievements = [
        {
            "id": "ach_1",
            "userId": alumni_uid,
            "userName": "Elena Rostova",
            "userRole": "alumni",
            "title": "Promoted to Senior Cloud Software Engineer at Apex Technologies",
            "category": "promotion",
            "description": "Excited to share that I have been promoted to Senior Cloud Software Engineer! Leading a team of 6 engineers on container infrastructure.",
            "supportingUrl": "https://linkedin.com/in/elena-rostova-demo",
            "status": "approved",
            "reviewNotes": "Verified promotion announcement.",
            "reviewedBy": "Prof. Marcus Vance",
            "createdAt": now - datetime.timedelta(days=7)
        },
        {
            "id": "ach_2",
            "userId": alumni_uid,
            "userName": "Elena Rostova",
            "userRole": "alumni",
            "title": "Published Research Paper at IEEE Cloud 2026 Conference",
            "category": "award",
            "description": "Co-authored 'Low-Latency Serverless Scheduling in Multi-Region Clusters' accepted at IEEE Cloud 2026.",
            "supportingUrl": "https://ieee.demo/cloud2026/paper/8941",
            "status": "pending",
            "reviewNotes": "",
            "reviewedBy": None,
            "createdAt": now - datetime.timedelta(days=1)
        }
    ]
    for ach in achievements:
        ach_id = ach.pop("id")
        db.collection('achievements').document(ach_id).set({**ach, "updatedAt": now}, merge=True)
    print(f"[+] Seeded approved and pending achievements.")

    # 10. Events and Registrations
    events = [
        {
            "id": "evt_1",
            "title": "Cloud Systems & DevOps Masterclass with Alumni",
            "description": "Hands-on virtual session covering Kubernetes deployment, microservices architecture, and production incident response.",
            "eventType": "webinar",
            "startDate": (now + datetime.timedelta(days=7)).strftime("%Y-%m-%dT18:00:00Z"),
            "endDate": (now + datetime.timedelta(days=7, hours=2)).strftime("%Y-%m-%dT20:00:00Z"),
            "locationType": "virtual",
            "venueOrUrl": "https://meet.google.com/myalumni-cloud-session",
            "targetCourses": ["B.S. in Computer Science", "M.S. in Data Science"],
            "targetBatches": ["batch_cs_2026", "batch_cs_2021"],
            "capacity": 100,
            "registrationDeadline": (now + datetime.timedelta(days=6)).strftime("%Y-%m-%dT23:59:59Z"),
            "registeredCount": 1,
            "organizerId": alumni_uid,
            "organizerName": "Elena Rostova",
            "organizerRole": "alumni",
            "status": "approved",
            "createdAt": now - datetime.timedelta(days=4)
        },
        {
            "id": "evt_2",
            "title": "Batch of 2021 5-Year Milestone Reunion",
            "description": "In-person dinner and networking mixer celebrating five years since graduation.",
            "eventType": "reunion",
            "startDate": (now + datetime.timedelta(days=30)).strftime("%Y-%m-%dT19:00:00Z"),
            "endDate": (now + datetime.timedelta(days=30, hours=4)).strftime("%Y-%m-%dT23:00:00Z"),
            "locationType": "in_person",
            "venueOrUrl": "Grand Alumni Pavilion, Campus Center",
            "targetCourses": ["All Courses"],
            "targetBatches": ["batch_cs_2021"],
            "capacity": 250,
            "registrationDeadline": (now + datetime.timedelta(days=25)).strftime("%Y-%m-%dT23:59:59Z"),
            "registeredCount": 0,
            "organizerId": admin_uid,
            "organizerName": "Dr. Sarah Admin",
            "organizerRole": "admin",
            "status": "approved",
            "createdAt": now - datetime.timedelta(days=2)
        }
    ]
    for e in events:
        eid = e.pop("id")
        db.collection('events').document(eid).set({**e, "updatedAt": now}, merge=True)

    db.collection('eventRegistrations').document(f"reg_{student_uid}_evt_1").set({
        "eventId": "evt_1",
        "userId": student_uid,
        "userName": "Alex Chen",
        "userEmail": "student.demo@myalumni.test",
        "userRole": "student",
        "status": "confirmed",
        "registeredAt": now - datetime.timedelta(days=1)
    }, merge=True)
    print(f"[+] Seeded events and confirmed registrations.")

    # 11. Batches & Community Posts
    batches = [
        {"id": "batch_cs_2021", "name": "Class of 2021 — Computer Science", "courseId": "course_cs", "courseName": "B.S. in Computer Science", "graduationYear": 2021, "description": "Official community for CS Batch of 2021."},
        {"id": "batch_cs_2026", "name": "Class of 2026 — Computer Science", "courseId": "course_cs", "courseName": "B.S. in Computer Science", "graduationYear": 2026, "description": "Graduating senior class cohort for CS."}
    ]
    for b in batches:
        bid = b.pop("id")
        db.collection('batches').document(bid).set({**b, "createdAt": now - datetime.timedelta(days=100)}, merge=True)

    db.collection('batchMembers').document(f"bm_{alumni_uid}").set({
        "batchId": "batch_cs_2021",
        "userId": alumni_uid,
        "userName": "Elena Rostova",
        "role": "alumni",
        "joinedAt": now - datetime.timedelta(days=50)
    }, merge=True)
    db.collection('batchMembers').document(f"bm_{student_uid}").set({
        "batchId": "batch_cs_2026",
        "userId": student_uid,
        "userName": "Alex Chen",
        "role": "student",
        "joinedAt": now - datetime.timedelta(days=40)
    }, merge=True)

    db.collection('communityPosts').document("post_1").set({
        "batchId": "batch_cs_2021",
        "authorId": alumni_uid,
        "authorName": "Elena Rostova",
        "authorRole": "alumni",
        "title": "Excited for our 5-Year Reunion!",
        "content": "Can not believe it has been 5 years since our senior capstone presentation! Who is flying in for the reunion dinner next month?",
        "likesCount": 12,
        "createdAt": now - datetime.timedelta(days=2)
    }, merge=True)
    print("[+] Seeded batch communities and discussion posts.")

    # 12. Student Career Goals & Milestones
    goal_id = f"goal_{student_uid}_cloud"
    db.collection('careerGoals').document(goal_id).set({
        "userId": student_uid,
        "title": "Secure Junior Cloud / Backend Software Engineer Role",
        "description": "Land a full-time engineering position working with cloud native distributed systems.",
        "targetRole": "Cloud Software Engineer",
        "targetDate": "2026-12-01",
        "status": "in_progress",
        "progressPercentage": 67,
        "createdAt": now - datetime.timedelta(days=30),
        "updatedAt": now - datetime.timedelta(days=2)
    }, merge=True)

    milestones = [
        {"id": f"m_{goal_id}_1", "goalId": goal_id, "userId": student_uid, "title": "Complete LeetCode Blind 75 algorithms list", "isCompleted": True, "completedAt": now - datetime.timedelta(days=15), "createdAt": now - datetime.timedelta(days=30)},
        {"id": f"m_{goal_id}_2", "goalId": goal_id, "userId": student_uid, "title": "Build & deploy full-stack distributed systems project with Docker", "isCompleted": True, "completedAt": now - datetime.timedelta(days=5), "createdAt": now - datetime.timedelta(days=25)},
        {"id": f"m_{goal_id}_3", "goalId": goal_id, "userId": student_uid, "title": "Pass mock technical interview with alumni mentor Elena", "isCompleted": False, "completedAt": None, "createdAt": now - datetime.timedelta(days=20)}
    ]
    for m in milestones:
        mid = m.pop("id")
        db.collection('careerMilestones').document(mid).set(m, merge=True)

    db.collection('projects').document(f"proj_{student_uid}_1").set({
        "userId": student_uid,
        "title": "Distributed Task Scheduler & Worker Pool",
        "description": "High-throughput asynchronous task queue built in Go and Redis with automatic worker autoscaling.",
        "technologies": ["Go", "Redis", "Docker", "Prometheus"],
        "projectUrl": "https://task-scheduler.demo.app",
        "githubUrl": "https://github.com/alexchen-demo/distributed-task-pool",
        "createdAt": now - datetime.timedelta(days=20),
        "updatedAt": now - datetime.timedelta(days=20)
    }, merge=True)
    print("[+] Seeded student career growth goals, milestones, and portfolio project.")

    # 13. Notifications
    notifications = [
        {
            "id": "notif_1",
            "recipientId": student_uid,
            "type": "mentorship_accepted",
            "title": "Mentorship Request Accepted!",
            "message": "Elena Rostova accepted your mentorship request. You can now chat directly.",
            "link": "/#/mentorship",
            "isRead": True,
            "readAt": now - datetime.timedelta(days=7),
            "createdAt": now - datetime.timedelta(days=7)
        },
        {
            "id": "notif_2",
            "recipientId": student_uid,
            "type": "new_opportunity",
            "title": "New Matching Job: Graduate Cloud Engineer",
            "message": "Elena Rostova posted a new job at Apex Technologies matching your profile.",
            "link": "/#/opportunities",
            "isRead": False,
            "readAt": None,
            "createdAt": now - datetime.timedelta(days=3)
        }
    ]
    for n in notifications:
        nid = n.pop("id")
        db.collection('notifications').document(nid).set(n, merge=True)
    print(f"[+] Seeded {len(notifications)} notifications.")

    # 14. Support Ticket
    db.collection('adminRequests').document("ticket_demo_1").set({
        "requesterId": student_uid,
        "requesterName": "Alex Chen",
        "requesterEmail": "student.demo@myalumni.test",
        "requesterRole": "student",
        "category": "academic_verification",
        "subject": "Request for Graduation Degree Verification Transcript",
        "description": "Hello Administration, I have been requested by Apex Technologies to submit an official pre-graduation verification letter for my upcoming employment background check.",
        "status": "resolved",
        "adminResponse": "Hello Alex, your pre-graduation verification transcript has been attested and emailed to your student address. Best wishes on your onboarding!",
        "respondedBy": "Dr. Sarah Admin",
        "respondedById": admin_uid,
        "respondedAt": now - datetime.timedelta(days=1),
        "createdAt": now - datetime.timedelta(days=4),
        "updatedAt": now - datetime.timedelta(days=1)
    }, merge=True)
    print("[+] Seeded support ticket with administrative reply.")

    print("\n==================================================")
    print("  Full Demo Data Seeding Completed Successfully!")
    print("==================================================")
    return True


if __name__ == '__main__':
    ok = seed_data()
    sys.exit(0 if ok else 1)
