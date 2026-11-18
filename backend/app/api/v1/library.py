import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from flask import g, Blueprint, request, jsonify
from app.auth import ADMIN, ANY_MEMBER, STAFF, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import Book, BookCopy, BookLoan, LibraryFine, User
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

library_bp = Blueprint("library", __name__, url_prefix="/library")


# -------------------------------------------------------------
# 1. Books Catalog
# -------------------------------------------------------------

@library_bp.route("/books", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_books():
    institution_id = get_current_tenant_id()
    query = Book.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(
            (Book.title.ilike(f"%{search}%")) |
            (Book.author.ilike(f"%{search}%")) |
            (Book.isbn.ilike(f"%{search}%")) |
            (Book.category.ilike(f"%{search}%"))
        )

    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category.upper())

    books = query.order_by(Book.title.asc()).all()
    data = [
        {
            "id": str(b.id),
            "isbn": b.isbn,
            "title": b.title,
            "author": b.author,
            "publisher": b.publisher,
            "edition": b.edition,
            "category": b.category,
            "total_copies": b.total_copies,
            "available_copies": b.available_copies,
            "copies": [
                {
                    "id": str(c.id),
                    "barcode": c.barcode,
                    "accession_number": c.accession_number,
                    "condition": c.condition,
                    "status": c.status,
                }
                for c in b.copies
            ]
        }
        for b in books
    ]
    return jsonify({"success": True, "data": data}), 200


@library_bp.route("/books", methods=["POST"])
@role_required(*STAFF)
def create_book():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    title = payload.get("title")
    author = payload.get("author")
    isbn = payload.get("isbn") or f"ISBN-{int(datetime.now().timestamp())}"
    copies_count = max(1, payload.get("copies_count", 1))

    if not title or not author:
        raise APIException("Title and author are required", status_code=400)

    exists = Book.query.filter_by(institution_id=institution_id, isbn=isbn.strip()).first()
    if exists:
        raise APIException(f"Book with ISBN '{isbn}' already exists", status_code=409)

    book = Book(
        institution_id=institution_id,
        isbn=isbn.strip(),
        title=title.strip(),
        author=author.strip(),
        publisher=payload.get("publisher"),
        edition=payload.get("edition"),
        category=payload.get("category", "GENERAL").upper(),
        total_copies=copies_count,
        available_copies=copies_count,
    )
    db.session.add(book)
    db.session.flush()

    for idx in range(1, copies_count + 1):
        copy = BookCopy(
            book_id=book.id,
            barcode=f"BC-{book.isbn}-{idx}",
            accession_number=f"ACC-{book.isbn}-{idx}",
            condition="NEW",
            status="AVAILABLE",
        )
        db.session.add(copy)

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(book.id), "title": book.title, "total_copies": book.total_copies},
        "message": f"Book '{book.title}' added with {copies_count} copies."
    }), 201


# -------------------------------------------------------------
# 2. Circulation (Issue, Return, Renew)
# -------------------------------------------------------------

@library_bp.route("/loans", methods=["GET"])
@role_required(*STAFF)
def list_loans():
    status = request.args.get("status")
    query = BookLoan.query
    if status:
        query = query.filter_by(status=status.upper())

    loans = query.order_by(BookLoan.issue_date.desc()).all()
    data = []
    for l in loans:
        data.append({
            "id": str(l.id),
            "copy_id": str(l.copy_id),
            "book_title": l.copy.book.title if l.copy and l.copy.book else None,
            "barcode": l.copy.barcode if l.copy else None,
            "borrower_user_id": str(l.borrower_user_id),
            "borrower_name": f"{l.borrower.first_name} {l.borrower.last_name}".strip() if l.borrower else None,
            "issue_date": l.issue_date.isoformat(),
            "due_date": l.due_date.isoformat(),
            "return_date": l.return_date.isoformat() if l.return_date else None,
            "status": l.status,
            "fine_amount": float(l.fine.amount) if l.fine else 0.0,
            "fine_paid": l.fine.is_paid if l.fine else False,
        })
    return jsonify({"success": True, "data": data}), 200


@library_bp.route("/loans/issue", methods=["POST"])
@role_required(*STAFF)
def issue_book():
    payload = request.get_json() or {}
    copy_id = payload.get("copy_id")
    borrower_id = payload.get("borrower_user_id")

    if not copy_id or not borrower_id:
        raise APIException("copy_id and borrower_user_id are required", status_code=400)
    borrower = db.session.get(User, uuid.UUID(str(borrower_id)))
    if not borrower:
        raise APIException("Borrower not found", status_code=404)
    ensure_same_tenant(borrower.institution_id)

    copy = BookCopy.query.filter_by(id=uuid.UUID(str(copy_id))).first()
    if not copy:
        raise APIException("Book copy not found", status_code=404)
    ensure_same_tenant(copy.book.institution_id)

    if copy.status != "AVAILABLE":
        raise APIException(f"Copy is currently '{copy.status}' and cannot be issued", status_code=400)

    # Resolve issuer user
    issuer_id = str(g.user_id)

    duration_days = payload.get("duration_days", 14)
    due_date = date.today() + timedelta(days=duration_days)

    loan = BookLoan(
        copy_id=copy.id,
        borrower_user_id=uuid.UUID(str(borrower_id)),
        issue_date=date.today(),
        due_date=due_date,
        status="ISSUED",
        issued_by=uuid.UUID(str(issuer_id)),
    )
    copy.status = "ISSUED"
    if copy.book.available_copies > 0:
        copy.book.available_copies -= 1

    db.session.add(loan)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "loan_id": str(loan.id),
            "book_title": copy.book.title,
            "due_date": due_date.isoformat(),
            "status": loan.status,
        },
        "message": f"Book copy issued successfully until {due_date.isoformat()}."
    }), 201


@library_bp.route("/loans/<uuid:loan_id>/return", methods=["POST"])
@role_required(*STAFF)
def return_book(loan_id):
    loan = BookLoan.query.filter_by(id=loan_id).first()
    if not loan:
        raise APIException("Loan record not found", status_code=404)
    ensure_same_tenant(loan.copy.book.institution_id)

    if loan.status == "RETURNED":
        raise APIException("Book has already been returned", status_code=400)

    today = date.today()
    loan.return_date = today
    loan.status = "RETURNED"

    # Mark copy available
    if loan.copy:
        loan.copy.status = "AVAILABLE"
        if loan.copy.book:
            loan.copy.book.available_copies += 1

    # Check overdue fine (e.g. ₹5 per day late)
    fine_obj = None
    if today > loan.due_date:
        days_late = (today - loan.due_date).days
        fine_amount = Decimal(str(days_late * 5.0))
        fine = LibraryFine(
            loan_id=loan.id,
            amount=fine_amount,
            is_paid=False,
        )
        db.session.add(fine)
        fine_obj = {"amount": float(fine_amount), "days_late": days_late}

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "loan_id": str(loan.id),
            "status": loan.status,
            "return_date": today.isoformat(),
            "fine": fine_obj,
        },
        "message": "Book copy returned successfully."
    }), 200

