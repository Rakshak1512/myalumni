import sqlite3

def run_migration():
    conn = sqlite3.connect('myalumni.db')
    c = conn.cursor()

    cols_evt = [r[1] for r in c.execute('PRAGMA table_info(events)').fetchall()]
    new_cols_evt = [
        ('start_date', 'TEXT'),
        ('end_date', 'TEXT'),
        ('venue_or_url', 'TEXT'),
        ('registered_count', 'INTEGER DEFAULT 0'),
        ('organizer_role', 'TEXT'),
        ('location_type', "TEXT DEFAULT 'in_person'"),
        ('registration_deadline', 'TEXT'),
        ('target_courses', 'TEXT'),
        ('target_batches', 'TEXT')
    ]
    for col, defn in new_cols_evt:
        if col not in cols_evt:
            c.execute(f"ALTER TABLE events ADD COLUMN {col} {defn}")
            print(f"Added to events: {col}")

    cols_att = [r[1] for r in c.execute('PRAGMA table_info(event_attendees)').fetchall()]
    new_cols_att = [
        ('user_email', 'TEXT'),
        ('status', "TEXT DEFAULT 'confirmed'"),
        ('cancelled_at', 'TIMESTAMP')
    ]
    for col, defn in new_cols_att:
        if col not in cols_att:
            c.execute(f"ALTER TABLE event_attendees ADD COLUMN {col} {defn}")
            print(f"Added to event_attendees: {col}")

    # Create views if not existing
    c.execute("CREATE VIEW IF NOT EXISTS eventRegistrations AS SELECT * FROM event_attendees")
    c.execute("CREATE VIEW IF NOT EXISTS eventAttendees AS SELECT * FROM event_attendees")

    # Sync dates and registered counts on existing events
    c.execute("""
        UPDATE events 
        SET start_date = date || 'T18:00:00Z', 
            end_date = date || 'T22:00:00Z', 
            venue_or_url = location, 
            registered_count = attendees_count 
        WHERE start_date IS NULL OR start_date = ''
    """)

    conn.commit()
    conn.close()
    print("Events and Attendees schema migration successful!")

if __name__ == '__main__':
    run_migration()

