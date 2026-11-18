import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app('development')

def verify_setup():
    with app.app_context():
        print("=== DATABASE VERIFICATION ===")

        # 1. Total Student Count
        total_students = db.session.execute(text("SELECT COUNT(*) FROM students;")).scalar()
        print(f"Total Students: {total_students}")
        assert total_students == 30, f"Expected 30 students, found {total_students}"

        # 2. Class Distribution
        class_dist = db.session.execute(text("""
            SELECT cl.name, COUNT(s.id) as student_count
            FROM students s
            JOIN student_enrollments se ON se.student_id = s.id
            JOIN sections sec ON se.section_id = sec.id
            JOIN class_levels cl ON sec.class_level_id = cl.id
            GROUP BY cl.name, cl.sequence_order
            ORDER BY cl.sequence_order;
        """)).fetchall()

        print("\nClass-Wise Student Distribution:")
        expected_dist = {
            "Class 6": 5,
            "Class 7": 5,
            "Class 8": 4,
            "Class 9": 4,
            "Class 10": 5,
            "Class 11": 4,
            "Class 12": 3,
        }
        for row in class_dist:
            print(f"  {row.name}: {row.student_count} students (Expected: {expected_dist.get(row.name)})")
            assert row.student_count == expected_dist.get(row.name), f"Mismatch in {row.name}"

        # 3. User Accounts & Password Hashing Verification
        user_stats = db.session.execute(text("""
            SELECT u.id, u.username, u.email, u.password_hash, r.name as role
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'student';
        """)).fetchall()

        print(f"\nStudent User Accounts: {len(user_stats)} (All 30 verified)")
        assert len(user_stats) == 30
        for u in user_stats:
            assert u.password_hash.startswith("$argon2id$"), f"Password for {u.username} is not Argon2id hash!"

        # 4. Check for Orphan Records
        orphans = db.session.execute(text("""
            SELECT COUNT(*) FROM students WHERE user_id NOT IN (SELECT id FROM users);
        """)).scalar()
        print(f"Orphan Students (Missing User): {orphans}")
        assert orphans == 0

        enroll_orphans = db.session.execute(text("""
            SELECT COUNT(*) FROM student_enrollments WHERE student_id NOT IN (SELECT id FROM students);
        """)).scalar()
        print(f"Orphan Enrollments (Missing Student): {enroll_orphans}")
        assert enroll_orphans == 0

        # 5. Supporting Accounts
        supporting_users = db.session.execute(text("""
            SELECT u.email, u.username, r.name as role
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name != 'student'
            ORDER BY r.name;
        """)).fetchall()
        print(f"\nSupporting Accounts ({len(supporting_users)} accounts):")
        for su in supporting_users:
            print(f"  [{su.role.upper()}] Email: {su.email}, Username: {su.username}")

        print("\n[SUCCESS] ALL DATABASE INTEGRITY & SEED VERIFICATIONS PASSED!")

if __name__ == '__main__':
    verify_setup()

