import sqlite3
import os

db_path = 'd:/lavanya/my-aalumni-main/my-aalumni-main/backend/myalumni.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("PRAGMA integrity_check;")
print("integrity_check:", [dict(r) for r in cur.fetchall()])

cur.execute("PRAGMA foreign_key_check;")
print("foreign_key_check violations:", len(cur.fetchall()))

accounts = ["admin@myalumni.edu", "faculty@myalumni.edu", "student@myalumni.edu", "alumni@myalumni.edu"]
for email in accounts:
    cur.execute("SELECT email, role, display_name, account_status FROM users WHERE email = ?", (email,))
    u = cur.fetchone()
    print(f"[PASS] {u['email']} | role={u['role']} | status={u['account_status']}")

cur.execute("SELECT COUNT(1) as c FROM users")
print("Total users:", cur.fetchone()["c"])
cur.execute("SELECT COUNT(1) as c FROM student_profiles")
print("Total student_profiles:", cur.fetchone()["c"])
cur.execute("SELECT COUNT(1) as c FROM alumni_profiles")
print("Total alumni_profiles:", cur.fetchone()["c"])
cur.execute("SELECT COUNT(1) as c FROM faculty_profiles")
print("Total faculty_profiles:", cur.fetchone()["c"])
cur.execute("SELECT COUNT(1) as c FROM batches")
print("Total batches:", cur.fetchone()["c"])

conn.close()

# Check uploaded files on disk
memories_dir = 'd:/lavanya/my-aalumni-main/my-aalumni-main/backend/static/uploads/memories'
avatars_dir = 'd:/lavanya/my-aalumni-main/my-aalumni-main/backend/static/uploads/avatars'
mem_count = len(os.listdir(memories_dir)) if os.path.exists(memories_dir) else 0
av_count = len(os.listdir(avatars_dir)) if os.path.exists(avatars_dir) else 0
print(f"Uploaded files on disk: {mem_count} files in memories, {av_count} files in avatars")
