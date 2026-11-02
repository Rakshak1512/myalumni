import sqlite3
import json

conn = sqlite3.connect('myalumni.db')
c = conn.cursor()
c.execute("SELECT id, data FROM documents WHERE collection = 'resources'")
for rid, d_str in c.fetchall():
    d = json.loads(d_str)
    print(rid, "->", d.get('title'), "| category:", d.get('category'))
