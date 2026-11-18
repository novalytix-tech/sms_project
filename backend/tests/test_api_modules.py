import uuid
from datetime import date, datetime
import pytest
from app.models import (
    Student, AcademicYear, ClassLevel, Section, Subject,
    FeeStructure, FeeInvoice, Book, BookCopy, BookLoan,
    Notice, Message, QuestionPaper
)


def test_students_crud_and_validation(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. List students
    res = client.get("/api/v1/students", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "items" in data["data"]
    assert data["data"]["total"] >= 1

    # 2. Create student
    adm_no = f"TEST-ADM-{int(datetime.now().timestamp())}"
    create_payload = {
        "admission_number": adm_no,
        "first_name": "Rohan",
        "last_name": "Gupta",
        "gender": "Male",
        "date_of_birth": "2011-05-15",
        "admission_date": "2026-04-01",
        "email": f"{adm_no.lower()}@student.stxaviers.edu.in",
        "emergency_contact_name": "Suresh Gupta",
        "emergency_contact_phone": "+91 98765 11223",
    }
    create_res = client.post("/api/v1/students", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    created_student = create_res.get_json()["data"]
    student_id = created_student["id"]
    assert created_student["admission_number"] == adm_no
    assert created_student["full_name"] == "Rohan Gupta"

    # 3. Prevent duplicate admission number
    dup_res = client.post("/api/v1/students", json=create_payload, headers=headers)
    assert dup_res.status_code == 409
    assert dup_res.get_json()["success"] is False

    # 4. Get student by ID
    get_res = client.get(f"/api/v1/students/{student_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.get_json()["data"]["admission_number"] == adm_no

    # 5. Update student
    update_res = client.put(f"/api/v1/students/{student_id}", json={
        "first_name": "Rohan Kumar",
        "emergency_contact_phone": "+91 99999 88888",
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.get_json()["data"]["emergency_contact_phone"] == "+91 99999 88888"

    # 6. Delete (soft-withdraw) student
    del_res = client.delete(f"/api/v1/students/{student_id}", headers=headers)
    assert del_res.status_code == 200
    assert "withdrawn" in del_res.get_json()["message"]


def test_academics_modules(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. Sessions
    res = client.get("/api/v1/academics/sessions", headers=headers)
    assert res.status_code == 200
    assert len(res.get_json()["data"]) >= 1

    # 2. Classes & Sections
    res_cls = client.get("/api/v1/academics/classes", headers=headers)
    assert res_cls.status_code == 200
    classes = res_cls.get_json()["data"]
    assert len(classes) >= 1
    sec_id = classes[0]["sections"][0]["id"]

    # 3. Section Details
    res_sec = client.get(f"/api/v1/academics/sections/{sec_id}", headers=headers)
    assert res_sec.status_code == 200
    assert res_sec.get_json()["data"]["id"] == sec_id

    # 4. Subjects
    res_sub = client.get("/api/v1/academics/subjects", headers=headers)
    assert res_sub.status_code == 200
    assert len(res_sub.get_json()["data"]) >= 1

    # 5. Timetable
    res_tt = client.get("/api/v1/academics/timetable", headers=headers)
    assert res_tt.status_code == 200
    assert isinstance(res_tt.get_json()["data"], list)


def test_admissions_workflow(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. Create Inquiry
    inq_res = client.post("/api/v1/admissions/inquiries", json={
        "institution_code": "STXAV-DELHI",
        "first_name": "Amit",
        "last_name": "Sharma",
        "phone_number": "+91 98111 55667",
        "grade": "Grade 5",
        "email": "amit.parent@example.com",
    }, headers=headers)
    assert inq_res.status_code == 201
    assert inq_res.get_json()["data"]["status"] == "NEW"

    # 2. List Inquiries
    list_res = client.get("/api/v1/admissions/inquiries", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.get_json()["data"]) >= 1

    # 3. Submit Application
    app_res = client.post("/api/v1/admissions/applications", json={
        "first_name": "Pooja",
        "last_name": "Verma",
        "date_of_birth": "2015-08-20",
        "gender": "Female",
        "parent_first_name": "Rajesh",
        "parent_last_name": "Verma",
        "parent_phone": "+91 98222 33445",
        "parent_email": "rajesh.verma@example.com",
    }, headers=headers)
    assert app_res.status_code == 201
    app_id = app_res.get_json()["data"]["id"]
    assert app_res.get_json()["data"]["status"] == "SUBMITTED"

    # 4. Transition Application Status
    stat_res = client.put(f"/api/v1/admissions/applications/{app_id}/status", json={
        "status": "OFFERED"
    }, headers=headers)
    assert stat_res.status_code == 200
    assert stat_res.get_json()["data"]["status"] == "OFFERED"


def test_attendance_logging(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. Get classes to obtain section
    cls_res = client.get("/api/v1/academics/classes", headers=headers)
    sec_id = cls_res.get_json()["data"][0]["sections"][0]["id"]

    # 2. Get active students
    stud_res = client.get("/api/v1/students", headers=headers)
    students = stud_res.get_json()["data"]["items"]
    assert len(students) >= 1
    stud_id = students[0]["id"]

    # 3. Record student attendance batch
    today_str = date.today().isoformat()
    att_res = client.post("/api/v1/attendance/students/batch", json={
        "date": today_str,
        "records": [
            {
                "student_id": stud_id,
                "status": "PRESENT",
                "remarks": "On time in morning assembly",
            }
        ]
    }, headers=headers)
    assert att_res.status_code == 200
    assert att_res.get_json()["data"]["count"] >= 1

    # 4. Verify recorded attendance retrieval
    get_att = client.get(f"/api/v1/attendance/students?date={today_str}", headers=headers)
    assert get_att.status_code == 200
    records = get_att.get_json()["data"]
    assert len(records) >= 1
    assert any(r["student_id"] == stud_id for r in records)


def test_finance_and_invoice_payment(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. Check or create fee structure
    res_fs = client.get("/api/v1/finance/fee-structures", headers=headers)
    assert res_fs.status_code == 200
    structures = res_fs.get_json()["data"]

    fs_id = None
    if not structures:
        # Create fee structure
        ses_res = client.get("/api/v1/academics/sessions", headers=headers)
        session_id = ses_res.get_json()["data"][0]["id"]
        cls_res = client.get("/api/v1/academics/classes", headers=headers)
        from app.models import ClassLevel
        cl = ClassLevel.query.first()
        cl_id = str(cl.id)

        create_fs_res = client.post("/api/v1/finance/fee-structures", json={
            "name": "Standard Annual Tuition",
            "academic_year_id": session_id,
            "class_level_id": cl_id,
            "term_frequency": "ANNUAL",
            "due_date": "2026-12-31",
            "items": [{"fee_head": "Tuition Fee", "amount": 10000.0, "is_optional": False}],
        }, headers=headers)
        assert create_fs_res.status_code in (200, 201)
        fs_id = create_fs_res.get_json()["data"]["id"]
    else:
        fs_id = structures[0]["id"]

    # 2. Ensure test invoice with adequate balance exists or create one directly
    stud_res = client.get("/api/v1/students", headers=headers)
    student_id = stud_res.get_json()["data"]["items"][0]["id"]

    inv_res = client.get(f"/api/v1/finance/invoices?student_id={student_id}", headers=headers)
    invoices = inv_res.get_json()["data"]

    unpaid_invoice = next((inv for inv in invoices if inv.get("balance_amount", 0) >= 2500.0), None)
    if not unpaid_invoice:
        from app.extensions import db
        from app.models import FeeInvoice, Student
        s = Student.query.filter_by(id=uuid.UUID(student_id)).first()
        new_inv = FeeInvoice(
            institution_id=s.institution_id,
            invoice_number=f"INV-TEST-{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:4]}",
            student_id=s.id,
            fee_structure_id=uuid.UUID(fs_id),
            subtotal=10000.0,
            discount_amount=0.0,
            adjustment_amount=0.0,
            total_amount=10000.0,
            paid_amount=0.0,
            balance_amount=10000.0,
            status="UNPAID",
            due_date=date(2026, 12, 31),
        )
        db.session.add(new_inv)
        db.session.commit()
        invoice_id = str(new_inv.id)
    else:
        invoice_id = unpaid_invoice["id"]

    # 3. Pay invoice
    pay_res = client.post(f"/api/v1/finance/invoices/{invoice_id}/pay", json={
        "amount": 2500.0,
        "payment_method": "UPI",
        "transaction_reference": "UPI-TEST-12345",
    }, headers=headers)
    assert pay_res.status_code == 201
    pay_data = pay_res.get_json()["data"]
    assert pay_data["paid_amount"] >= 2500.0

    # 4. Summary
    sum_res = client.get("/api/v1/finance/summary", headers=headers)
    assert sum_res.status_code == 200
    assert "total_billed" in sum_res.get_json()["data"]


def test_library_and_circulation(client, auth_headers):
    headers = auth_headers("sunita.verma@stxaviers.edu.in")

    # 1. List books
    b_res = client.get("/api/v1/library/books", headers=headers)
    assert b_res.status_code == 200
    books = b_res.get_json()["data"]
    assert len(books) >= 1
    book = books[0]

    # 2. Add book
    isbn = f"978-TEST-{int(datetime.now().timestamp())}"
    add_res = client.post("/api/v1/library/books", json={
        "title": "Introduction to Algorithms and Data Structures",
        "author": "Thomas Cormen",
        "isbn": isbn,
        "category": "SCIENCE",
        "copies_count": 2,
    }, headers=headers)
    assert add_res.status_code == 201

    # 3. Issue and Return
    # Fetch newly created book copies
    book_res = client.get(f"/api/v1/library/books?search={isbn}", headers=headers)
    created_book = book_res.get_json()["data"][0]
    copy_id = created_book["copies"][0]["id"]

    # Borrow with student user ID
    stud_res = client.get("/api/v1/students", headers=headers)
    stud_email = stud_res.get_json()["data"]["items"][0]["email"]

    from app.models import User
    u = User.query.filter_by(email=stud_email).first()

    issue_res = client.post("/api/v1/library/loans/issue", json={
        "copy_id": copy_id,
        "borrower_user_id": str(u.id),
        "duration_days": 7,
    }, headers=headers)
    assert issue_res.status_code == 201
    loan_id = issue_res.get_json()["data"]["loan_id"]

    # Return
    ret_res = client.post(f"/api/v1/library/loans/{loan_id}/return", headers=headers)
    assert ret_res.status_code == 200
    assert ret_res.get_json()["data"]["status"] == "RETURNED"


def test_transport_and_fleet(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. Routes
    r_res = client.get("/api/v1/transport/routes", headers=headers)
    assert r_res.status_code == 200
    assert len(r_res.get_json()["data"]) >= 1

    # 2. Vehicles
    v_res = client.get("/api/v1/transport/vehicles", headers=headers)
    assert v_res.status_code == 200
    assert isinstance(v_res.get_json()["data"], list)


def test_communications_notices_and_messages(client, auth_headers):
    headers = auth_headers("principal@stxaviers.edu.in")

    # 1. Post notice
    notice_res = client.post("/api/v1/communications/notices", json={
        "title": "Annual Sports Meet 2026 Announcement",
        "content": "All students must register with physical education department by Friday.",
        "priority": "HIGH",
        "target_audience": "ALL",
    }, headers=headers)
    assert notice_res.status_code == 201

    # 2. List notices
    list_res = client.get("/api/v1/communications/notices", headers=headers)
    assert list_res.status_code == 200
    notices = list_res.get_json()["data"]
    assert any("Sports Meet" in n["title"] for n in notices)


def test_sync_store_hydration(client, auth_headers):
    res = client.get("/api/v1/sync/store", headers=auth_headers("principal@stxaviers.edu.in"))
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert "institutions" in data
    assert "classes" in data
    assert "students" in data
    assert "teachers" in data
    assert len(data["institutions"]) >= 1
    assert len(data["classes"]) >= 1
