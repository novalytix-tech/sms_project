import uuid
from datetime import date, time
from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import (
    Institution, AcademicYear, Room, ClassLevel, Section, Subject,
    Student, StudentEnrollment, StudentAttendance,
    TimetablePeriod, TimetableSlot,
    FeeStructure, FeeInvoice,
    Book, BookCopy, BookLoan,
    QuestionPaper, QuestionPaperVersion,
    User
)


def test_enrollment_duplication_prevention(session):
    """Enforce: One student cannot have duplicate active enrollment in the same academic session."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"ENR-{uid}", name="Enroll School", email=f"enr@{uid}.edu")
    session.add(inst)
    session.flush()

    ay = AcademicYear(institution_id=inst.id, name=f"2026-2027-{uid}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31))
    cl = ClassLevel(institution_id=inst.id, name=f"C10-{uid}", code=f"C10-{uid}", sequence_order=10)
    session.add_all([ay, cl])
    session.flush()

    sec1 = Section(class_level_id=cl.id, name="A", capacity=40)
    sec2 = Section(class_level_id=cl.id, name="B", capacity=40)
    student = Student(
        institution_id=inst.id, admission_number=f"ADM-ENR-{uid}",
        admission_date=date(2026, 4, 1), date_of_birth=date(2010, 1, 1), gender="MALE"
    )
    session.add_all([sec1, sec2, student])
    session.flush()

    # Initial valid enrollment
    enr1 = StudentEnrollment(student_id=student.id, academic_year_id=ay.id, section_id=sec1.id, status="ACTIVE")
    session.add(enr1)
    session.flush()

    # Attempt second enrollment in same academic year -> MUST RAISE IntegrityError
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            enr2 = StudentEnrollment(student_id=student.id, academic_year_id=ay.id, section_id=sec2.id, status="ACTIVE")
            session.add(enr2)
            session.flush()


def test_attendance_duplication_prevention(session):
    """Enforce: One attendance record per student per school day."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"ATT-{uid}", name="Att School", email=f"att@{uid}.edu")
    session.add(inst)
    session.flush()

    ay = AcademicYear(institution_id=inst.id, name=f"2026-2027-{uid}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31))
    cl = ClassLevel(institution_id=inst.id, name=f"C10-{uid}", code=f"C10-{uid}", sequence_order=10)
    session.add_all([ay, cl])
    session.flush()

    sec = Section(class_level_id=cl.id, name="A", capacity=40)
    teacher = User(institution_id=inst.id, username=f"t_{uid}", email=f"t_{uid}@att.edu",  first_name="T", last_name="C")
    student = Student(institution_id=inst.id, admission_number=f"ADM-ATT-{uid}", admission_date=date(2026, 4, 1), date_of_birth=date(2010, 1, 1), gender="FEMALE")
    session.add_all([sec, teacher, student])
    session.flush()

    enr = StudentEnrollment(student_id=student.id, academic_year_id=ay.id, section_id=sec.id)
    session.add(enr)
    session.flush()

    today = date(2026, 9, 15)
    att1 = StudentAttendance(enrollment_id=enr.id, attendance_date=today, status="PRESENT", recorded_by=teacher.id)
    session.add(att1)
    session.flush()

    # Duplicate attendance for same student on same date -> MUST RAISE IntegrityError
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            att2 = StudentAttendance(enrollment_id=enr.id, attendance_date=today, status="ABSENT", recorded_by=teacher.id)
            session.add(att2)
            session.flush()


def test_timetable_teacher_and_room_conflicts(session):
    """Enforce: Teacher timetable conflict & room double-booking prevention."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"TT-{uid}", name="TT School", email=f"tt@{uid}.edu")
    session.add(inst)
    session.flush()

    ay = AcademicYear(institution_id=inst.id, name=f"2026-2027-{uid}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31))
    room1 = Room(institution_id=inst.id, room_number=f"R1-{uid}", capacity=40)
    room2 = Room(institution_id=inst.id, room_number=f"R2-{uid}", capacity=40)
    period1 = TimetablePeriod(institution_id=inst.id, name="P1", period_number=1, start_time=time(8, 30), end_time=time(9, 15))
    cl = ClassLevel(institution_id=inst.id, name=f"C10-{uid}", code=f"C10-{uid}", sequence_order=10)
    sub = Subject(institution_id=inst.id, code=f"SUB-{uid}", name="Physics", credit_hours=Decimal("1.0"))
    teacher1 = User(institution_id=inst.id, username=f"t1_{uid}", email=f"t1_{uid}@tt.edu",  first_name="T1", last_name="S")
    teacher2 = User(institution_id=inst.id, username=f"t2_{uid}", email=f"t2_{uid}@tt.edu",  first_name="T2", last_name="S")
    session.add_all([ay, room1, room2, period1, cl, sub, teacher1, teacher2])
    session.flush()

    sec1 = Section(class_level_id=cl.id, name="A", capacity=40)
    sec2 = Section(class_level_id=cl.id, name="B", capacity=40)
    session.add_all([sec1, sec2])
    session.flush()

    # Slot 1: Teacher 1 teaches Section 1 in Room 1 during Period 1 on Monday (day 1)
    slot1 = TimetableSlot(
        academic_year_id=ay.id, section_id=sec1.id, subject_id=sub.id,
        teacher_id=teacher1.id, room_id=room1.id, period_id=period1.id, day_of_week=1
    )
    session.add(slot1)
    session.flush()

    # Collision 1: Same Teacher 1 scheduled in Section 2 & Room 2 at the same period and day
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            slot_teacher_conflict = TimetableSlot(
                academic_year_id=ay.id, section_id=sec2.id, subject_id=sub.id,
                teacher_id=teacher1.id, room_id=room2.id, period_id=period1.id, day_of_week=1
            )
            session.add(slot_teacher_conflict)
            session.flush()

    # Collision 2: Different Teacher 2 scheduled into the same Room 1 during the same period and day
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            slot_room_conflict = TimetableSlot(
                academic_year_id=ay.id, section_id=sec2.id, subject_id=sub.id,
                teacher_id=teacher2.id, room_id=room1.id, period_id=period1.id, day_of_week=1
            )
            session.add(slot_room_conflict)
            session.flush()


def test_financial_invoice_check_constraints(session):
    """Enforce: Payment cannot exceed total invoice amount and non-negative constraints."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"FIN-{uid}", name="Fin School", email=f"fin@{uid}.edu")
    session.add(inst)
    session.flush()

    ay = AcademicYear(institution_id=inst.id, name=f"2026-2027-{uid}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31))
    cl = ClassLevel(institution_id=inst.id, name=f"C10-{uid}", code=f"C10-{uid}", sequence_order=10)
    student = Student(institution_id=inst.id, admission_number=f"ADM-FIN-{uid}", admission_date=date(2026, 4, 1), date_of_birth=date(2010, 1, 1), gender="MALE")
    session.add_all([ay, cl, student])
    session.flush()

    fs = FeeStructure(institution_id=inst.id, academic_year_id=ay.id, class_level_id=cl.id, name="Annual Fee", due_date=date(2026, 6, 1))
    session.add(fs)
    session.flush()

    # Violation: paid_amount (15000) > total_amount (10000)
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            invalid_invoice = FeeInvoice(
                institution_id=inst.id, invoice_number=f"INV-{uid}", student_id=student.id,
                fee_structure_id=fs.id, subtotal=Decimal("10000.00"), total_amount=Decimal("10000.00"),
                paid_amount=Decimal("15000.00"), balance_amount=Decimal("-5000.00"), due_date=date(2026, 6, 1)
            )
            session.add(invalid_invoice)
            session.flush()


def test_library_active_loan_collision_prevention(session):
    """Enforce: A library copy cannot be issued to two active loans simultaneously."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"LIB-{uid}", name="Lib School", email=f"lib@{uid}.edu")
    session.add(inst)
    session.flush()

    user1 = User(institution_id=inst.id, username=f"u1_{uid}", email=f"u1_{uid}@lib.edu",  first_name="U1", last_name="A")
    user2 = User(institution_id=inst.id, username=f"u2_{uid}", email=f"u2_{uid}@lib.edu",  first_name="U2", last_name="B")
    librarian = User(institution_id=inst.id, username=f"lib_{uid}", email=f"lib_{uid}@lib.edu",  first_name="L", last_name="C")
    book = Book(institution_id=inst.id, isbn=f"ISBN-{uid}", title="Database Systems", author="Silberschatz", total_copies=1, available_copies=0)
    session.add_all([user1, user2, librarian, book])
    session.flush()

    copy = BookCopy(book_id=book.id, barcode=f"BAR-{uid}", accession_number=f"ACC-{uid}", status="ISSUED")
    session.add(copy)
    session.flush()

    # Active Loan 1
    loan1 = BookLoan(copy_id=copy.id, borrower_user_id=user1.id, issue_date=date(2026, 9, 1), due_date=date(2026, 9, 15), status="ISSUED", issued_by=librarian.id)
    session.add(loan1)
    session.flush()

    # Attempt second simultaneous active loan on same copy -> MUST RAISE IntegrityError via partial index
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            loan2 = BookLoan(copy_id=copy.id, borrower_user_id=user2.id, issue_date=date(2026, 9, 5), due_date=date(2026, 9, 20), status="ISSUED", issued_by=librarian.id)
            session.add(loan2)
            session.flush()


def test_admission_number_unique_within_institution(session):
    """Enforce: Admission numbers must be unique within an institution."""
    uid = uuid.uuid4().hex[:6]
    inst1 = Institution(code=f"INST1-{uid}", name="School One", email=f"s1@{uid}.edu")
    inst2 = Institution(code=f"INST2-{uid}", name="School Two", email=f"s2@{uid}.edu")
    session.add_all([inst1, inst2])
    session.flush()

    adm_no = f"ADM-UNIQ-{uid}"
    s1 = Student(institution_id=inst1.id, admission_number=adm_no, admission_date=date(2026, 4, 1), date_of_birth=date(2010, 1, 1), gender="MALE")
    session.add(s1)
    session.flush()

    # Within same institution, same admission number MUST fail
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            s_dup = Student(institution_id=inst1.id, admission_number=adm_no, admission_date=date(2026, 4, 1), date_of_birth=date(2010, 2, 2), gender="FEMALE")
            session.add(s_dup)
            session.flush()

    # Across different institutions, same admission number is PERMITTED (Tenant scoped)
    s2 = Student(institution_id=inst2.id, admission_number=adm_no, admission_date=date(2026, 4, 1), date_of_birth=date(2010, 2, 2), gender="FEMALE")
    session.add(s2)
    session.flush()
    assert s1.id != s2.id


def test_immutable_question_paper_versions(session):
    """Enforce: Historical question paper versions must not be overwritten."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"QP-{uid}", name="QP School", email=f"qp@{uid}.edu")
    session.add(inst)
    session.flush()

    cl = ClassLevel(institution_id=inst.id, name=f"C10-{uid}", code=f"C10-{uid}", sequence_order=10)
    sub = Subject(institution_id=inst.id, code=f"QP-SUB-{uid}", name="Chemistry", credit_hours=Decimal("1.0"))
    teacher = User(institution_id=inst.id, username=f"qp_t_{uid}", email=f"qp_t_{uid}@qp.edu",  first_name="T", last_name="Q")
    session.add_all([cl, sub, teacher])
    session.flush()

    paper = QuestionPaper(
        institution_id=inst.id, subject_id=sub.id, class_level_id=cl.id,
        author_teacher_id=teacher.id, title="Chemistry Midterm 2026", paper_code=f"CHEM-MID-{uid}"
    )
    session.add(paper)
    session.flush()

    v1 = QuestionPaperVersion(paper_id=paper.id, version_number=1, content_text="Version 1 Questions", created_by=teacher.id)
    session.add(v1)
    session.flush()

    # Duplicate version 1 on same paper -> MUST FAIL
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            v1_dup = QuestionPaperVersion(paper_id=paper.id, version_number=1, content_text="Overwrite attempt", created_by=teacher.id)
            session.add(v1_dup)
            session.flush()

    # Version 2 is accepted
    v2 = QuestionPaperVersion(paper_id=paper.id, version_number=2, content_text="Version 2 Revised", created_by=teacher.id)
    session.add(v2)
    session.flush()
    assert len(paper.versions) == 2
