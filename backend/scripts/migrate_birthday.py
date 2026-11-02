import sqlite3
import os

db_path = r"D:\lavanya\my-aalumni-main\my-aalumni-main\backend\myalumni.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

def add_col_if_missing(table, col, col_def):
    cols = [r[1] for r in c.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        print(f"Adding {col} to {table}...")
        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
    else:
        print(f"{col} already exists in {table}.")

add_col_if_missing('student_profiles', 'date_of_birth', 'TEXT')
add_col_if_missing('student_profiles', 'birthday_visibility', "TEXT DEFAULT 'visible'")
add_col_if_missing('student_profiles', 'birthday_updated_at', 'TIMESTAMP')

add_col_if_missing('alumni_profiles', 'date_of_birth', 'TEXT')
add_col_if_missing('alumni_profiles', 'birthday_visibility', "TEXT DEFAULT 'visible'")
add_col_if_missing('alumni_profiles', 'birthday_updated_at', 'TIMESTAMP')

add_col_if_missing('birthday_greetings', 'is_read', 'INTEGER DEFAULT 0')
add_col_if_missing('birthday_greetings', 'read_at', 'TIMESTAMP')

conn.commit()
conn.close()
print("Birthday migration successfully executed.")

