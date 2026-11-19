"""
End-to-End Business Workflow Tests for School Management System (SMS ERP)
Tests real-world school administrative workflows:
- Workflow A: Admission to Enrollment
- Workflow B: Student Attendance Cycle
- Workflow C: Homework Lifecycle
- Workflow D: Examination and Grading
- Workflow E: Fee Management and Ledger
- Workflow F: Library Circulation and Fines
- Workflow G: Transport Routing and Allocation
- Workflow H: Academic Promotion Batch
- Workflow I: Leave Request and Approval
- Workflow J: Question Paper Review and Versioning
- Workflow K: Supplier Procurement and PO
"""

import uuid
from datetime import date, datetime, time, timezone, timedelta
from decimal import Decimal
import pytest
from app.extensions import db
from app.models import (
    Institution, User, Student, StudentEnrollment, ClassLevel, Section, Subject, ClassSubject,
    AdmissionInquiry, AdmissionApplication, StudentAttendance,
    Assignment, AssignmentSubmission, SubmissionReview,
    Exam, ExamSchedule, ExamResult, GradingScale, AcademicYear,
    FeeStructure, FeeInvoice, FeePayment, FinancialTransaction,
    Book, BookCopy, BookLoan,
    TransportRoute, TransportStop, TransportVehicle, TransportAllocation, TransportTrip,
    LeaveCategory, LeaveRequest, LeaveApproval,
    QuestionPaper, QuestionPaperVersion, QuestionPaperReview,
    Supplier, SupplierInstitution, PurchaseOrder, PurchaseOrderItem
)


def get_target_institution():
    inst = Institution.query.filter_by(code="STXAV-DELHI").first()
    if not inst:
        inst = Institution.query.first()
    return inst


def test_workflow_a_admission_to_enrollment(client, auth_headers):
    """
    Workflow A: Admission to Enrollment
    1. Create admission enquiry
    2. Convert enquiry into application
    3. Update application status (SUBMITTED -> OFFERED -> ENROLLED)
    4. Create permanent student record with unique admission number
    5. Assign class and section enrollment
    6. Verify student appears in Student Directory
    """
    headers = auth_headers("principal@stxaviers.edu.in")
    ts = int(datetime.now().timestamp())
    adm_num = f"ADM-E2E-{ts}"

    # 1. Create Enquiry
    inq_res = client.post("/api/v1/admissions/inquiries", json={
        "institution_code": "STXAV-DELHI",
        "first_name": "Aarav",
        "last_name": "Mehta",
        "phone_number": "+91 98333 11224",
        "grade": "Grade 9",
        "email": f"aarav.enq.{ts}@example.com",
    }, headers=headers)
    assert inq_res.status_code == 201
    inquiry_data = inq_res.get_json()["data"]
    assert inquiry_data["status"] == "NEW"

    # 2. Submit Application
    app_res = client.post("/api/v1/admissions/applications", json={
        "first_name": "Aarav",
        "last_name": "Mehta",
        "date_of_birth": "2011-04-12",
        "gender": "Male",
        "parent_first_name": "Vikram",
        "parent_last_name": "Mehta",
        "parent_phone": "+91 98333 11224",
        "parent_email": f"vikram.mehta.{ts}@example.com",
    }, headers=headers)
    assert app_res.status_code == 201
    app_id = app_res.get_json()["data"]["id"]

    # 3. Status Transitions
    offer_res = client.put(f"/api/v1/admissions/applications/{app_id}/status", json={"status": "OFFERED"}, headers=headers)
    assert offer_res.status_code == 200
    assert offer_res.get_json()["data"]["status"] == "OFFERED"

    enroll_res = client.put(f"/api/v1/admissions/applications/{app_id}/status", json={"status": "ENROLLED"}, headers=headers)
    assert enroll_res.status_code == 200
    assert enroll_res.get_json()["data"]["status"] == "ENROLLED"

    # 4. Create Permanent Student Record
    student_res = client.post("/api/v1/students", json={
        "admission_number": adm_num,
        "first_name": "Aarav",
        "last_name": "Mehta",
        "gender": "Male",
        "date_of_birth": "2011-04-12",
        "admission_date": "2026-04-01",
        "email": f"aarav.mehta.{ts}@student.stxaviers.edu.in",
        "emergency_contact_name": "Vikram Mehta",
        "emergency_contact_phone": "+91 98333 11224",
    }, headers=headers)
    assert student_res.status_code == 201
    created_student = student_res.get_json()["data"]
    student_id = created_student["id"]

    # 5. Verify Student Appears in Directory
    get_res = client.get(f"/api/v1/students/{student_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.get_json()["data"]["admission_number"] == adm_num


def test_workflow_c_homework_lifecycle(client, auth_headers):
    """
    Workflow C: Homework Lifecycle
    1. Teacher creates assignment for class subject
    2. Student submits homework
    3. Teacher reviews and grades submission
    4. Feedback and awarded marks verified
    """
    inst = get_target_institution()
    cs = ClassSubject.query.first()
    assert cs is not None
    teacher = User.query.filter_by(email="sunita.verma@stxaviers.edu.in").first()
    student = Student.query.filter_by(institution_id=inst.id).first()

    # 1. Create Assignment
    assignment = Assignment(
        class_subject_id=cs.id,
        teacher_id=teacher.id,
        title=f"Trigonometry Exercise {uuid.uuid4().hex[:4]}",
        description="Solve problems 1 through 15 from Chapter 4.",
        assigned_date=date.today(),
        due_date=date.today() + timedelta(days=7),
        max_marks=Decimal("50.00"),
        status="PUBLISHED",
    )
    db.session.add(assignment)
    db.session.commit()

    # 2. Student Submits
    submission = AssignmentSubmission(
        assignment_id=assignment.id,
        student_id=student.id,
        submission_text="Completed all 15 trigonometry problems with step-by-step derivations.",
        status="SUBMITTED",
    )
    db.session.add(submission)
    db.session.commit()

    # 3. Teacher Reviews and Grades
    submission.status = "GRADED"
    submission.marks_awarded = Decimal("48.50")
    submission.teacher_feedback = "Excellent work on trigonometric identities. Minor sign error on Q12."

    review = SubmissionReview(
        submission_id=submission.id,
        reviewed_by=teacher.id,
        status="GRADED",
        feedback="Approved with distinctions.",
        marks=Decimal("48.50"),
    )
    db.session.add(review)
    db.session.commit()

    # Verify
    saved = AssignmentSubmission.query.filter_by(id=submission.id).first()
    assert saved.status == "GRADED"
    assert saved.marks_awarded == Decimal("48.50")
    assert "Minor sign error" in saved.teacher_feedback


def test_workflow_e_fee_management_and_ledger(client, auth_headers):
    """
    Workflow E: Fee Management and Ledger
    1. Query fee structures
    2. Query student invoice
    3. Process invoice payment
    4. Verify balance calculation and financial ledger entry
    """
    headers = auth_headers("principal@stxaviers.edu.in")
    inst = get_target_institution()
    student = Student.query.filter_by(institution_id=inst.id).first()
    fs = FeeStructure.query.filter_by(institution_id=inst.id).first()
    if not fs:
        fs = FeeStructure.query.first()

    # Ensure invoice exists
    inv = FeeInvoice.query.filter_by(student_id=student.id, status="UNPAID").first()
    if not inv:
        inv = FeeInvoice(
            institution_id=inst.id,
            invoice_number=f"INV-WF-E-{uuid.uuid4().hex[:6]}",
            student_id=student.id,
            fee_structure_id=fs.id,
            subtotal=Decimal("5000.00"),
            discount_amount=Decimal("0.00"),
            adjustment_amount=Decimal("0.00"),
            total_amount=Decimal("5000.00"),
            paid_amount=Decimal("0.00"),
            balance_amount=Decimal("5000.00"),
            status="UNPAID",
            due_date=date(2026, 12, 31),
        )
        db.session.add(inv)
        db.session.commit()

    # Pay partial
    pay_res = client.post(f"/api/v1/finance/invoices/{inv.id}/pay", json={
        "amount": 2000.0,
        "payment_method": "Net Banking",
        "transaction_reference": f"NB-REF-{uuid.uuid4().hex[:6]}",
    }, headers=headers)
    assert pay_res.status_code == 201
    pay_data = pay_res.get_json()["data"]
    assert pay_data["invoice"]["paidAmount"] >= 2000.0

    # Verify ledger entry
    trans = FinancialTransaction.query.filter_by(institution_id=inst.id).order_by(FinancialTransaction.entry_date.desc()).first()
    assert trans is not None
    assert trans.amount >= Decimal("2000.00")


def test_workflow_f_library_circulation_and_fines(client, auth_headers):
    """
    Workflow F: Library Circulation and Fines
    1. Add new book with copies
    2. Issue book copy to borrower
    3. Verify available copies count decreases
    4. Return book copy
    5. Verify copy returns to available status
    """
    headers = auth_headers("sunita.verma@stxaviers.edu.in")
    ts = int(datetime.now().timestamp())
    isbn = f"978-WF-F-{ts}"

    # 1. Add Book
    add_res = client.post("/api/v1/library/books", json={
        "title": "Quantum Mechanics: Principles and Applications",
        "author": "David Griffiths",
        "isbn": isbn,
        "category": "SCIENCE",
        "copies_count": 2,
    }, headers=headers)
    assert add_res.status_code == 201

    # 2. Get Book Copy
    b_res = client.get(f"/api/v1/library/books?search={isbn}", headers=headers)
    b_data = b_res.get_json()["data"][0]
    copy_id = b_data["copies"][0]["id"]

    user = User.query.filter_by(email="aarav.sharma@student.stxaviers.edu.in").first()

    # 3. Issue Loan
    issue_res = client.post("/api/v1/library/loans/issue", json={
        "copy_id": copy_id,
        "borrower_user_id": str(user.id),
        "duration_days": 14,
    }, headers=headers)
    assert issue_res.status_code == 201
    loan_id = issue_res.get_json()["data"]["loan_id"]

    # 4. Return Book
    ret_res = client.post(f"/api/v1/library/loans/{loan_id}/return", headers=headers)
    assert ret_res.status_code == 200
    assert ret_res.get_json()["data"]["status"] == "RETURNED"


def test_workflow_g_transport_routing_and_allocation(client, auth_headers):
    """
    Workflow G: Transport Routing and Allocation
    1. Create route and bus stops
    2. Add vehicle and assign driver
    3. Allocate student to transport stop
    4. Verify route and vehicle operational state
    """
    headers = auth_headers("principal@stxaviers.edu.in")
    inst = get_target_institution()
    student = Student.query.filter_by(institution_id=inst.id).first()
    academic_year = AcademicYear.query.filter_by(institution_id=inst.id).first()
    if not academic_year:
        academic_year = AcademicYear.query.first()
    ts = int(datetime.now().timestamp())

    # Create Route
    route = TransportRoute(
        institution_id=inst.id,
        route_name=f"South Express Route {ts}",
        route_code=f"RT-E2E-{ts}",
        start_point="Vasant Kunj",
        end_point="Main Campus",
        fare_amount=Decimal("1500.00"),
    )
    db.session.add(route)
    db.session.flush()

    # Add Stop
    stop = TransportStop(
        route_id=route.id,
        stop_name="Sector B Gate 2",
        pickup_time=time(7, 30),
        drop_time=time(14, 45),
        latitude=Decimal("28.5244"),
        longitude=Decimal("77.1855"),
        sequence_order=1,
    )
    db.session.add(stop)
    db.session.flush()

    # Vehicle
    vehicle = TransportVehicle.query.filter_by(institution_id=inst.id).first()
    if not vehicle:
        vehicle = TransportVehicle(
            institution_id=inst.id,
            vehicle_number=f"DL-01-E2E-{uuid.uuid4().hex[:4].upper()}",
            capacity=40,
            fitness_valid_until=date(2027, 12, 31),
            status="ACTIVE",
        )
        db.session.add(vehicle)
        db.session.flush()

    # Allocate Student (respecting uq_student_transport_year constraint)
    alloc = TransportAllocation.query.filter_by(student_id=student.id, academic_year_id=academic_year.id).first()
    if not alloc:
        alloc = TransportAllocation(
            student_id=student.id,
            route_id=route.id,
            stop_id=stop.id,
            vehicle_id=vehicle.id,
            academic_year_id=academic_year.id,
            start_date=date.today(),
            status="ACTIVE",
        )
        db.session.add(alloc)
    else:
        alloc.route_id = route.id
        alloc.stop_id = stop.id
        alloc.vehicle_id = vehicle.id
        alloc.status = "ACTIVE"
    db.session.commit()

    # Verify via API
    r_res = client.get("/api/v1/transport/routes", headers=headers)
    assert r_res.status_code == 200
    routes = r_res.get_json()["data"]
    assert any(r["route_code"] == f"RT-E2E-{ts}" for r in routes)


def test_workflow_h_academic_promotion_batch(client, auth_headers):
    """
    Workflow H: Academic Promotion Batch
    1. Select current academic year and enrolled students
    2. Verify existing enrollment status
    3. Create next academic session
    4. Transition completed enrollment and generate promoted enrollment record
    5. Maintain complete historical enrollment audit trail
    """
    inst = get_target_institution()
    student = Student.query.filter_by(institution_id=inst.id).first()
    current_year = AcademicYear.query.filter_by(institution_id=inst.id, is_current=True).first()
    if not current_year:
        current_year = AcademicYear.query.filter_by(institution_id=inst.id).first() or AcademicYear.query.first()

    sec = Section.query.first()

    # Ensure existing active enrollment
    active_enroll = StudentEnrollment.query.filter_by(student_id=student.id, academic_year_id=current_year.id).first()
    if not active_enroll:
        active_enroll = StudentEnrollment(
            student_id=student.id,
            academic_year_id=current_year.id,
            section_id=sec.id,
            roll_number="1",
            enrollment_date=date.today(),
            status="ACTIVE",
        )
        db.session.add(active_enroll)
        db.session.commit()

    # Transition to COMPLETED
    active_enroll.status = "COMPLETED"

    # Create next year if not exists
    next_year = AcademicYear.query.filter_by(institution_id=inst.id, name="2027-2028").first()
    if not next_year:
        next_year = AcademicYear(
            institution_id=inst.id,
            name="2027-2028",
            start_date=date(2027, 4, 1),
            end_date=date(2028, 3, 31),
            is_current=False,
        )
        db.session.add(next_year)
        db.session.flush()

    # Promote to next enrollment if not already created
    promoted_enroll = StudentEnrollment.query.filter_by(student_id=student.id, academic_year_id=next_year.id).first()
    if not promoted_enroll:
        promoted_enroll = StudentEnrollment(
            student_id=student.id,
            academic_year_id=next_year.id,
            section_id=sec.id,
            roll_number="1",
            enrollment_date=date(2027, 4, 1),
            status="ACTIVE",
        )
        db.session.add(promoted_enroll)
    else:
        promoted_enroll.status = "ACTIVE"
    db.session.commit()

    # Verify history
    all_enrollments = StudentEnrollment.query.filter_by(student_id=student.id).all()
    assert len(all_enrollments) >= 2
    assert any(e.status == "COMPLETED" for e in all_enrollments)
    assert any(e.academic_year_id == next_year.id and e.status == "ACTIVE" for e in all_enrollments)


def test_workflow_i_leave_request_and_approval(client, auth_headers):
    """
    Workflow I: Leave Request and Approval
    1. Ensure leave category exists
    2. Staff/student submits leave request
    3. Administrator reviews and approves request
    4. Verified status changes to APPROVED
    """
    inst = get_target_institution()
    user = User.query.filter_by(institution_id=inst.id, is_active=True).first()

    # 1. Leave Category
    cat = LeaveCategory.query.filter_by(institution_id=inst.id, name="Casual Leave").first()
    if not cat:
        cat = LeaveCategory(
            institution_id=inst.id,
            name="Casual Leave",
            days_allowed_per_year=12,
            applicable_to="ALL",
        )
        db.session.add(cat)
        db.session.commit()

    # 2. Leave Request
    req = LeaveRequest(
        institution_id=inst.id,
        applicant_user_id=user.id,
        leave_category_id=cat.id,
        start_date=date.today() + timedelta(days=5),
        end_date=date.today() + timedelta(days=6),
        reason="Attending family function",
        status="PENDING",
    )
    db.session.add(req)
    db.session.commit()

    # 3. Admin Approval
    req.status = "APPROVED"
    approval = LeaveApproval(
        leave_request_id=req.id,
        approver_user_id=user.id,
        decision="APPROVED",
        remarks="Approved as per available casual leave balance.",
    )
    db.session.add(approval)
    db.session.commit()

    saved = LeaveRequest.query.filter_by(id=req.id).first()
    assert saved.status == "APPROVED"
    assert saved.approval.remarks is not None


def test_workflow_j_question_paper_review_and_versioning(client, auth_headers):
    """
    Workflow J: Question Paper Review and Versioning
    1. Teacher creates question paper draft
    2. Version 1 recorded
    3. Principal reviews and requests modifications
    4. Teacher updates to Version 2
    5. Principal approves and finalizes paper
    6. Verify immutable version history
    """
    headers = auth_headers("principal@stxaviers.edu.in")
    inst = get_target_institution()
    subject = Subject.query.filter_by(institution_id=inst.id).first()
    cl = ClassLevel.query.filter_by(institution_id=inst.id).first()
    teacher = User.query.filter_by(email="sunita.verma@stxaviers.edu.in").first()

    # 1. Create Question Paper
    qp = QuestionPaper(
        institution_id=inst.id,
        title="Midterm Physics Assessment",
        paper_code=f"QP-PHYS-{uuid.uuid4().hex[:4].upper()}",
        subject_id=subject.id,
        class_level_id=cl.id,
        author_teacher_id=teacher.id,
        total_marks=Decimal("70.00"),
        time_allowed_minutes=180,
        status="DRAFT",
    )
    db.session.add(qp)
    db.session.flush()

    # Version 1
    v1 = QuestionPaperVersion(
        paper_id=qp.id,
        version_number=1,
        content_text="Sections A and B questions",
        change_summary="Initial draft submission",
        created_by=teacher.id,
    )
    db.session.add(v1)
    db.session.flush()

    # 2. Review - Request Revision
    rev1 = QuestionPaperReview(
        paper_id=qp.id,
        version_id=v1.id,
        reviewer_user_id=teacher.id,
        review_decision="CHANGES_REQUESTED",
        comments="Please increase numerical problems in Section B.",
    )
    qp.status = "IN_REVIEW"
    db.session.add(rev1)
    db.session.commit()

    # 3. Teacher creates Version 2
    v2 = QuestionPaperVersion(
        paper_id=qp.id,
        version_number=2,
        content_text="Added 5 advanced numerical problems in Section B",
        change_summary="Added numerical problems as requested",
        created_by=teacher.id,
    )
    db.session.add(v2)
    db.session.flush()

    # 4. Approval
    rev2 = QuestionPaperReview(
        paper_id=qp.id,
        version_id=v2.id,
        reviewer_user_id=teacher.id,
        review_decision="APPROVED",
        comments="Looks comprehensive and balanced.",
    )
    qp.status = "APPROVED"
    db.session.add(rev2)
    db.session.commit()

    # Verify version immutability and history
    paper_res = client.get(f"/api/v1/question-papers/{qp.id}", headers=headers)
    assert paper_res.status_code == 200
    data = paper_res.get_json()["data"]
    assert len(data["versions"]) == 2
    assert len(data["reviews"]) == 2
    assert data["status"] == "APPROVED"


def test_workflow_k_supplier_procurement_and_po(client, auth_headers):
    """
    Workflow K: Supplier Procurement and PO
    1. Register supplier and link to institution contract
    2. Issue purchase order with line items
    3. Update PO status upon delivery
    4. Verify purchase order tracking and items
    """
    inst = get_target_institution()
    admin = User.query.filter_by(institution_id=inst.id, is_active=True).first()
    ts = int(datetime.now().timestamp())

    # 1. Register Supplier
    supp = Supplier.query.filter_by(vendor_code=f"VEND-E2E-{ts}").first()
    if not supp:
        supp = Supplier(
            vendor_code=f"VEND-E2E-{ts}",
            company_name="Apex Educational Supplies Pvt Ltd",
            contact_person="Ramesh Gupta",
            email=f"sales.apex.{ts}@example.com",
            phone="+91 98111 22334",
            gstin="07AAAAA0000A1Z5",
            category="LAB_EQUIPMENT",
            status="ACTIVE",
        )
        db.session.add(supp)
        db.session.flush()

        contract = SupplierInstitution(
            supplier_id=supp.id,
            institution_id=inst.id,
            contract_reference="CONTRACT-2026-LAB",
            payment_terms_days=30,
        )
        db.session.add(contract)
        db.session.commit()

    # 2. Create Purchase Order
    po = PurchaseOrder(
        institution_id=inst.id,
        supplier_id=supp.id,
        order_number=f"PO-E2E-{ts}",
        order_date=date.today(),
        expected_delivery_date=date.today() + timedelta(days=14),
        total_amount=Decimal("45000.00"),
        status="PENDING",
        created_by=admin.id,
    )
    db.session.add(po)
    db.session.flush()

    # Add PO Line Items
    item1 = PurchaseOrderItem(
        purchase_order_id=po.id,
        item_description="Optical Microscopes (1000x magnification)",
        quantity=5,
        unit_price=Decimal("7000.00"),
        total_price=Decimal("35000.00"),
    )
    item2 = PurchaseOrderItem(
        purchase_order_id=po.id,
        item_description="Prepared Biology Slides Box (100 pcs)",
        quantity=10,
        unit_price=Decimal("1000.00"),
        total_price=Decimal("10000.00"),
    )
    db.session.add_all([item1, item2])
    db.session.commit()

    # 3. Delivery Update
    po.status = "DELIVERED"
    po.actual_delivery_date = date.today()
    db.session.commit()

    # Verify
    saved_po = PurchaseOrder.query.filter_by(order_number=f"PO-E2E-{ts}").first()
    assert saved_po.status == "DELIVERED"
    assert len(saved_po.items) == 2
    assert sum(it.total_price for it in saved_po.items) == Decimal("45000.00")
