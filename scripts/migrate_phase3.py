import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'myalumni.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Applying Phase 3 safe schema migrations to myalumni.db...")

schema_phase3 = """
-- Batch Memories
CREATE TABLE IF NOT EXISTS batch_memories (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploader_name TEXT,
    uploader_role TEXT,
    uploader_avatar TEXT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    description TEXT,
    event_id TEXT REFERENCES batch_events(id) ON DELETE SET NULL,
    academic_year TEXT,
    graduation_year INTEGER,
    taken_at TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_memories_batch ON batch_memories(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_memories_event ON batch_memories(event_id);
CREATE INDEX IF NOT EXISTS idx_batch_memories_uploader ON batch_memories(uploader_id);
CREATE INDEX IF NOT EXISTS idx_batch_memories_year ON batch_memories(graduation_year, academic_year);

-- Batch Memory Likes
CREATE TABLE IF NOT EXISTS batch_memory_likes (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES batch_memories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(memory_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_memory_likes_mem ON batch_memory_likes(memory_id);
CREATE INDEX IF NOT EXISTS idx_batch_memory_likes_usr ON batch_memory_likes(user_id);

-- Batch Memory Comments
CREATE TABLE IF NOT EXISTS batch_memory_comments (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES batch_memories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_memory_comments_mem ON batch_memory_comments(memory_id);

-- Batch Memory Reports
CREATE TABLE IF NOT EXISTS batch_memory_reports (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES batch_memories(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_name TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    moderated_by TEXT,
    moderated_at TEXT,
    moderation_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_memory_reports_status ON batch_memory_reports(status, memory_id);
"""

cursor.executescript(schema_phase3)
conn.commit()

# Verify integrity
cursor.execute("PRAGMA integrity_check;")
assert cursor.fetchall() == [('ok',)], "Integrity check failed"

cursor.execute("PRAGMA foreign_key_check;")
assert len(cursor.fetchall()) == 0, "Foreign key check failed"

for tbl in ['batch_memories', 'batch_memory_likes', 'batch_memory_comments', 'batch_memory_reports']:
    cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
    print(f"Table verified: {tbl} (count = {cursor.fetchone()[0]})")

conn.close()
print("Phase 3 migration applied cleanly with zero errors!")

