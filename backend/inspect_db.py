import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

app = create_app('development')
with app.app_context():
    inspector = inspect(db.engine)
    table_names = sorted(inspector.get_table_names())
    print(f"TOTAL_TABLES={len(table_names)}")
    print("ALL_TABLE_NAMES:")
    for t in table_names:
        print(f"  {t}")

    print("\nROW_COUNTS_FOR_ALL_TABLES:")
    counts = {}
    for t in table_names:
        try:
            cnt = db.session.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            counts[t] = cnt
            if cnt > 0:
                print(f"  {t}: {cnt}")
        except Exception as e:
            print(f"  {t}: ERROR {e}")

    print("\nCURRENT_USERS:")
    users = db.session.execute(text('SELECT id, username, email, first_name, last_name, is_active FROM users ORDER BY created_at')).fetchall()
    for u in users:
        print(f"  User: id={u.id}, username={u.username}, email={u.email}, name={u.first_name} {u.last_name}, active={u.is_active}")

    print("\nCURRENT_STUDENTS:")
    students = db.session.execute(text('SELECT s.id, s.admission_number, u.email, u.first_name, u.last_name, s.status FROM students s JOIN users u ON s.user_id = u.id')).fetchall()
    for s in students:
        print(f"  Student: id={s.id}, adm_no={s.admission_number}, email={s.email}, name={s.first_name} {s.last_name}, status={s.status}")

    print("\nCURRENT_INSTITUTIONS:")
    insts = db.session.execute(text('SELECT id, name, code, subdomain FROM institutions')).fetchall()
    for i in insts:
        print(f"  Institution: id={i.id}, name={i.name}, code={i.code}, subdomain={i.subdomain}")

    print("\nCURRENT_CLASSES_AND_SECTIONS:")
    classes = db.session.execute(text('SELECT cl.id, cl.name, cl.code, sec.id as sec_id, sec.name as sec_name FROM class_levels cl LEFT JOIN sections sec ON sec.class_level_id = cl.id')).fetchall()
    for c in classes:
        print(f"  Class: {c.name} ({c.code}), Section: {c.sec_name} (id={c.sec_id})")

    print("\nCURRENT_ACADEMIC_YEARS:")
    years = db.session.execute(text('SELECT id, name, is_current, start_date, end_date FROM academic_years')).fetchall()
    for y in years:
        print(f"  Year: {y.name}, current={y.is_current}, start={y.start_date}, end={y.end_date}")

