from argon2 import PasswordHasher
from app.models import User, Institution, Role, Student
from seed import seed_database, STUDENTS_DATA

ph = PasswordHasher()


def test_seed_idempotency_and_personas(app):
    """Verify seed execution, presence of personas, 30 students, and Argon2 password hashing."""
    with app.app_context():
        # Execute seed on test app database
        seed_database(app)

        # Check demo institution
        inst = Institution.query.filter_by(code="STXAV-DELHI").first()
        assert inst is not None
        assert inst.name == "St. Xavier's Senior Secondary School"

        # Check all 6 canonical roles
        expected_roles = [
            Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER,
            Role.STUDENT, Role.PARENT, Role.SUPPLIER
        ]
        for r in expected_roles:
            role = Role.query.filter_by(name=r).first()
            assert role is not None, f"Missing role: {r}"

        # Check seed personas
        personas = [
            ("principal@stxaviers.edu.in", Role.SCHOOL_ADMIN),
            ("ananya.sharma@stxaviers.edu.in", Role.TEACHER),
            ("sunita.verma@stxaviers.edu.in", Role.TEACHER),
            ("aarav.sharma@student.stxaviers.edu.in", Role.STUDENT),
            ("vikram.patel@gmail.com", Role.PARENT),
            ("orders@apexsupplies.in", Role.SUPPLIER),
        ]
        for email, expected_role in personas:
            user = User.query.filter_by(email=email).first()
            assert user is not None, f"Missing seed user: {email}"
            assert expected_role in user.role_names, f"User {email} missing role {expected_role}"
            # Verify Argon2id password hashing prefix
            assert user.password_hash.startswith("$argon2id$")

        # Verify exactly all 30 students from the fresh dataset are seeded
        seeded_adms = [s["adm_no"] for s in STUDENTS_DATA]
        assert len(seeded_adms) == 30
        assert Student.query.filter(Student.admission_number.in_(seeded_adms)).count() == 30

        # Re-run seed to verify idempotency (no exceptions thrown)
        seed_database(app)
