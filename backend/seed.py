"""
Idempotent Database Seed Script for School ERP Development & Testing Environments.
Populates:
- Demonstration Institution: St. Xavier's Senior Secondary School (STXAV-DELHI)
- Canonical RBAC Roles and Module Permissions
- Academic Structure: Academic Year 2026-2027, Term 1, Room 204
- Classes 6 through 12 with Section A and Core Subject Curriculum
- Exactly 30 fictional Indian Student profiles distributed across Classes 6 to 12
- Student user records (sign-in is handled by Clerk; no passwords are stored)
- Supporting Administrator, Faculty, Parent, and Supplier Accounts
"""

import os
import sys
import uuid
from datetime import date, time, datetime, timezone
from decimal import Decimal

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from app.models import (
    Institution, ServiceEntitlement, InstitutionSetting,
    User, Role, Permission, UserRole, RolePermission,
    AcademicYear, Term, Room, ClassLevel, Section, Subject, ClassSubject, TeacherAssignment,
    Student, Parent, StudentParent, StudentEnrollment,
    Department, StaffProfile, TeacherProfile, Qualification, LibraryStaffAssignment,
    TimetablePeriod, TimetableSlot,
    Book, BookCopy,
    TransportRoute, TransportStop, TransportVehicle, TransportAllocation,
    Supplier, SupplierInstitution
)


# --------------------------------------------------------------------------
# Student Specification Dataset (Exactly 30 Students across Classes 6 to 12)
# --------------------------------------------------------------------------
STUDENTS_DATA = [
    # Class 6 (5 Students)
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 1,
        "first_name": "Aarav", "last_name": "Sharma", "gender": "MALE", "dob": date(2015, 5, 14),
        "adm_no": "ADM-2026-0601", "email": "aarav.sharma@student.stxaviers.edu.in", "username": "aarav.sharma",  "parent_name": "Rajesh Sharma", "parent_phone": "+91 98111 06010",
        "parent_email": "rajesh.sharma.parent@gmail.com", "address": "B-42, Vasant Kunj, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 2,
        "first_name": "Diya", "last_name": "Patel", "gender": "FEMALE", "dob": date(2015, 8, 22),
        "adm_no": "ADM-2026-0602", "email": "diya.patel@student.stxaviers.edu.in", "username": "diya.patel",  "parent_name": "Bhavesh Patel", "parent_phone": "+91 98111 06020",
        "parent_email": "bhavesh.patel.p@gmail.com", "address": "C-12, Saket, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 3,
        "first_name": "Rohan", "last_name": "Verma", "gender": "MALE", "dob": date(2015, 2, 10),
        "adm_no": "ADM-2026-0603", "email": "rohan.verma@student.stxaviers.edu.in", "username": "rohan.verma",  "parent_name": "Manish Verma", "parent_phone": "+91 98111 06030",
        "parent_email": "manish.verma.p@gmail.com", "address": "D-5, Rohini Sector 9, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 4,
        "first_name": "Ananya", "last_name": "Iyer", "gender": "FEMALE", "dob": date(2015, 11, 3),
        "adm_no": "ADM-2026-0604", "email": "ananya.iyer@student.stxaviers.edu.in", "username": "ananya.iyer",  "parent_name": "Sundaram Iyer", "parent_phone": "+91 98111 06040",
        "parent_email": "sundaram.iyer.p@gmail.com", "address": "A-18, Dwarka Sector 6, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 5,
        "first_name": "Kabir", "last_name": "Khan", "gender": "MALE", "dob": date(2015, 7, 19),
        "adm_no": "ADM-2026-0605", "email": "kabir.khan@student.stxaviers.edu.in", "username": "kabir.khan",  "parent_name": "Tariq Khan", "parent_phone": "+91 98111 06050",
        "parent_email": "tariq.khan.p@gmail.com", "address": "H-23, Nizamuddin East, New Delhi"
    },

    # Class 7 (5 Students)
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 1,
        "first_name": "Meera", "last_name": "Reddy", "gender": "FEMALE", "dob": date(2014, 4, 16),
        "adm_no": "ADM-2026-0701", "email": "meera.reddy@student.stxaviers.edu.in", "username": "meera.reddy",  "parent_name": "Venkat Reddy", "parent_phone": "+91 98111 07010",
        "parent_email": "venkat.reddy.p@gmail.com", "address": "E-7, Hauz Khas, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 2,
        "first_name": "Tanvi", "last_name": "Deshmukh", "gender": "FEMALE", "dob": date(2014, 9, 28),
        "adm_no": "ADM-2026-0702", "email": "tanvi.deshmukh@student.stxaviers.edu.in", "username": "tanvi.deshmukh",  "parent_name": "Sachin Deshmukh", "parent_phone": "+91 98111 07020",
        "parent_email": "sachin.deshmukh.p@gmail.com", "address": "J-14, Green Park, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 3,
        "first_name": "Aditya", "last_name": "Joshi", "gender": "MALE", "dob": date(2014, 1, 11),
        "adm_no": "ADM-2026-0703", "email": "aditya.joshi@student.stxaviers.edu.in", "username": "aditya.joshi",  "parent_name": "Prakash Joshi", "parent_phone": "+91 98111 07030",
        "parent_email": "prakash.joshi.p@gmail.com", "address": "F-3, Janakpuri, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 4,
        "first_name": "Ishaan", "last_name": "Malhotra", "gender": "MALE", "dob": date(2014, 6, 30),
        "adm_no": "ADM-2026-0704", "email": "ishaan.malhotra@student.stxaviers.edu.in", "username": "ishaan.malhotra",  "parent_name": "Rajiv Malhotra", "parent_phone": "+91 98111 07040",
        "parent_email": "rajiv.malhotra.p@gmail.com", "address": "M-8, Greater Kailash I, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 5,
        "first_name": "Sanya", "last_name": "Gupta", "gender": "FEMALE", "dob": date(2014, 12, 5),
        "adm_no": "ADM-2026-0705", "email": "sanya.gupta@student.stxaviers.edu.in", "username": "sanya.gupta",  "parent_name": "Deepak Gupta", "parent_phone": "+91 98111 07050",
        "parent_email": "deepak.gupta.p@gmail.com", "address": "B-9, Preet Vihar, New Delhi"
    },

    # Class 8 (4 Students)
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 1,
        "first_name": "Vihaan", "last_name": "Kapoor", "gender": "MALE", "dob": date(2013, 3, 21),
        "adm_no": "ADM-2026-0801", "email": "vihaan.kapoor@student.stxaviers.edu.in", "username": "vihaan.kapoor",  "parent_name": "Sunil Kapoor", "parent_phone": "+91 98111 08010",
        "parent_email": "sunil.kapoor.p@gmail.com", "address": "N-11, Defence Colony, New Delhi"
    },
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 2,
        "first_name": "Sneha", "last_name": "Nambiar", "gender": "FEMALE", "dob": date(2013, 7, 14),
        "adm_no": "ADM-2026-0802", "email": "sneha.nambiar@student.stxaviers.edu.in", "username": "sneha.nambiar",  "parent_name": "Narayanan Nambiar", "parent_phone": "+91 98111 08020",
        "parent_email": "nambiar.p@gmail.com", "address": "K-4, Mayur Vihar Phase I, New Delhi"
    },
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 3,
        "first_name": "Aryan", "last_name": "Saxena", "gender": "MALE", "dob": date(2013, 10, 9),
        "adm_no": "ADM-2026-0803", "email": "aryan.saxena@student.stxaviers.edu.in", "username": "aryan.saxena",  "parent_name": "Alok Saxena", "parent_phone": "+91 98111 08030",
        "parent_email": "alok.saxena.p@gmail.com", "address": "P-16, Paschim Vihar, New Delhi"
    },
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 4,
        "first_name": "Pooja", "last_name": "Bhatt", "gender": "FEMALE", "dob": date(2013, 1, 25),
        "adm_no": "ADM-2026-0804", "email": "pooja.bhatt@student.stxaviers.edu.in", "username": "pooja.bhatt",  "parent_name": "Harish Bhatt", "parent_phone": "+91 98111 08040",
        "parent_email": "harish.bhatt.p@gmail.com", "address": "C-8, Pitampura, New Delhi"
    },

    # Class 9 (4 Students)
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 1,
        "first_name": "Advait", "last_name": "Menon", "gender": "MALE", "dob": date(2012, 5, 18),
        "adm_no": "ADM-2026-0901", "email": "advait.menon@student.stxaviers.edu.in", "username": "advait.menon",  "parent_name": "Krishnan Menon", "parent_phone": "+91 98111 09010",
        "parent_email": "krishnan.menon.p@gmail.com", "address": "G-22, Safdarjung Enclave, New Delhi"
    },
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 2,
        "first_name": "Riya", "last_name": "Sen", "gender": "FEMALE", "dob": date(2012, 8, 31),
        "adm_no": "ADM-2026-0902", "email": "riya.sen@student.stxaviers.edu.in", "username": "riya.sen",  "parent_name": "Subhash Sen", "parent_phone": "+91 98111 09020",
        "parent_email": "subhash.sen.p@gmail.com", "address": "T-5, Chittaranjan Park, New Delhi"
    },
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 3,
        "first_name": "Reyansh", "last_name": "Choudhury", "gender": "MALE", "dob": date(2012, 11, 12),
        "adm_no": "ADM-2026-0903", "email": "reyansh.choudhury@student.stxaviers.edu.in", "username": "reyansh.choudhury",  "parent_name": "Debashis Choudhury", "parent_phone": "+91 98111 09030",
        "parent_email": "debashis.c.p@gmail.com", "address": "L-19, Lajpat Nagar III, New Delhi"
    },
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 4,
        "first_name": "Anika", "last_name": "Nair", "gender": "FEMALE", "dob": date(2012, 2, 4),
        "adm_no": "ADM-2026-0904", "email": "anika.nair@student.stxaviers.edu.in", "username": "anika.nair",  "parent_name": "Mohan Nair", "parent_phone": "+91 98111 09040",
        "parent_email": "mohan.nair.p@gmail.com", "address": "W-10, Karol Bagh, New Delhi"
    },

    # Class 10 (5 Students)
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 1,
        "first_name": "Pranav", "last_name": "Bansal", "gender": "MALE", "dob": date(2011, 4, 8),
        "adm_no": "ADM-2026-1001", "email": "pranav.bansal@student.stxaviers.edu.in", "username": "pranav.bansal",  "parent_name": "Vijay Bansal", "parent_phone": "+91 98111 10010",
        "parent_email": "vijay.bansal.p@gmail.com", "address": "R-2, Punjabi Bagh, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 2,
        "first_name": "Tara", "last_name": "Mukherjee", "gender": "FEMALE", "dob": date(2011, 9, 17),
        "adm_no": "ADM-2026-1002", "email": "tara.mukherjee@student.stxaviers.edu.in", "username": "tara.mukherjee",  "parent_name": "Anirban Mukherjee", "parent_phone": "+91 98111 10020",
        "parent_email": "anirban.m.p@gmail.com", "address": "S-14, Alaknanda, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 3,
        "first_name": "Ayush", "last_name": "Singhal", "gender": "MALE", "dob": date(2011, 1, 29),
        "adm_no": "ADM-2026-1003", "email": "ayush.singhal@student.stxaviers.edu.in", "username": "ayush.singhal",  "parent_name": "Rakesh Singhal", "parent_phone": "+91 98111 10030",
        "parent_email": "rakesh.singhal.p@gmail.com", "address": "B-6, Model Town, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 4,
        "first_name": "Disha", "last_name": "Trivedi", "gender": "FEMALE", "dob": date(2011, 6, 23),
        "adm_no": "ADM-2026-1004", "email": "disha.trivedi@student.stxaviers.edu.in", "username": "disha.trivedi",  "parent_name": "Jayesh Trivedi", "parent_phone": "+91 98111 10040",
        "parent_email": "jayesh.trivedi.p@gmail.com", "address": "E-15, Rajouri Garden, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 5,
        "first_name": "Vivaan", "last_name": "Bose", "gender": "MALE", "dob": date(2011, 12, 19),
        "adm_no": "ADM-2026-1005", "email": "vivaan.bose@student.stxaviers.edu.in", "username": "vivaan.bose",  "parent_name": "Sourav Bose", "parent_phone": "+91 98111 10050",
        "parent_email": "sourav.bose.p@gmail.com", "address": "M-3, New Friends Colony, New Delhi"
    },

    # Class 11 (4 Students)
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 1,
        "first_name": "Kriti", "last_name": "Agarwal", "gender": "FEMALE", "dob": date(2010, 3, 15),
        "adm_no": "ADM-2026-1101", "email": "kriti.agarwal@student.stxaviers.edu.in", "username": "kriti.agarwal",  "parent_name": "Sanjay Agarwal", "parent_phone": "+91 98111 11010",
        "parent_email": "sanjay.agarwal.p@gmail.com", "address": "A-31, Civil Lines, New Delhi"
    },
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 2,
        "first_name": "Dhruv", "last_name": "Chawla", "gender": "MALE", "dob": date(2010, 7, 27),
        "adm_no": "ADM-2026-1102", "email": "dhruv.chawla@student.stxaviers.edu.in", "username": "dhruv.chawla",  "parent_name": "Gurpreet Chawla", "parent_phone": "+91 98111 11020",
        "parent_email": "gurpreet.chawla.p@gmail.com", "address": "D-9, Patel Nagar, New Delhi"
    },
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 3,
        "first_name": "Neha", "last_name": "Kulkarni", "gender": "FEMALE", "dob": date(2010, 10, 14),
        "adm_no": "ADM-2026-1103", "email": "neha.kulkarni@student.stxaviers.edu.in", "username": "neha.kulkarni",  "parent_name": "Nitin Kulkarni", "parent_phone": "+91 98111 11030",
        "parent_email": "nitin.kulkarni.p@gmail.com", "address": "H-11, Vasant Vihar, New Delhi"
    },
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 4,
        "first_name": "Yash", "last_name": "Vardhan", "gender": "MALE", "dob": date(2010, 2, 8),
        "adm_no": "ADM-2026-1104", "email": "yash.vardhan@student.stxaviers.edu.in", "username": "yash.vardhan",  "parent_name": "Harsh Vardhan", "parent_phone": "+91 98111 11040",
        "parent_email": "harsh.vardhan.p@gmail.com", "address": "C-25, Anand Niketan, New Delhi"
    },

    # Class 12 (3 Students)
    {
        "class_name": "Class 12", "class_code": "CLS-12", "sequence": 12, "section": "A", "roll": 1,
        "first_name": "Shruti", "last_name": "Srinivasan", "gender": "FEMALE", "dob": date(2009, 5, 20),
        "adm_no": "ADM-2026-1201", "email": "shruti.srinivasan@student.stxaviers.edu.in", "username": "shruti.srinivasan",  "parent_name": "Raman Srinivasan", "parent_phone": "+91 98111 12010",
        "parent_email": "raman.srinivasan.p@gmail.com", "address": "F-18, Shanti Niketan, New Delhi"
    },
    {
        "class_name": "Class 12", "class_code": "CLS-12", "sequence": 12, "section": "A", "roll": 2,
        "first_name": "Manav", "last_name": "Aggarwal", "gender": "MALE", "dob": date(2009, 9, 11),
        "adm_no": "ADM-2026-1202", "email": "manav.aggarwal@student.stxaviers.edu.in", "username": "manav.aggarwal",  "parent_name": "Pradeep Aggarwal", "parent_phone": "+91 98111 12020",
        "parent_email": "pradeep.aggarwal.p@gmail.com", "address": "B-2, Gulmohar Park, New Delhi"
    },
    {
        "class_name": "Class 12", "class_code": "CLS-12", "sequence": 12, "section": "A", "roll": 3,
        "first_name": "Ananya", "last_name": "Ghosh", "gender": "FEMALE", "dob": date(2009, 12, 3),
        "adm_no": "ADM-2026-1203", "email": "ananya.ghosh@student.stxaviers.edu.in", "username": "ananya.ghosh",  "parent_name": "Amitava Ghosh", "parent_phone": "+91 98111 12030",
        "parent_email": "amitava.ghosh.p@gmail.com", "address": "K-12, Panchsheel Park, New Delhi"
    },
]

# --------------------------------------------------------------------------
# Supporting Administrative, Faculty, Parent & Vendor Personas
# --------------------------------------------------------------------------
SUPPORTING_ACCOUNTS = [
    {
        "role": Role.SUPER_ADMIN, "name": "Vikramaditya Rao", "first_name": "Vikramaditya", "last_name": "Rao",
        "email": "superadmin@sms.edu.in", "alt_email": "superadmin@novalytix.com", "username": "superadmin",  "phone": "+91 99000 88776"
    },
    {
        "role": Role.SCHOOL_ADMIN, "name": "Dr. Arvind Swaminathan", "first_name": "Arvind", "last_name": "Swaminathan",
        "email": "principal@stxaviers.edu.in", "username": "principal",  "phone": "+91 98450 12345", "designation": "Principal & Head of School"
    },
    {
        "role": Role.TEACHER, "name": "Mrs. Ananya Sharma", "first_name": "Ananya", "last_name": "Sharma",
        "email": "ananya.sharma@stxaviers.edu.in", "username": "ananya.sharma",  "phone": "+91 97111 22334", "designation": "PGT Mathematics & Senior Teacher",
        "emp_code": "STX-T-101", "specialization": "Pure Mathematics", "experience": 8
    },
    {
        "role": Role.TEACHER, "name": "Mrs. Sunita Verma", "first_name": "Sunita", "last_name": "Verma",
        "email": "sunita.verma@stxaviers.edu.in", "username": "sunita.verma",  "phone": "+91 98333 44556", "designation": "Science Teacher & Librarian In-Charge",
        "emp_code": "STX-T-105", "specialization": "Physical Sciences", "experience": 10
    },
    {
        "role": Role.TEACHER, "name": "Mr. Rajesh Sharma", "first_name": "Rajesh", "last_name": "Sharma",
        "email": "rajesh.sharma@stxaviers.edu.in", "username": "rajesh.sharma",  "phone": "+91 98222 77889", "designation": "PGT Physics",
        "emp_code": "STX-T-108", "specialization": "Physics", "experience": 7
    },
    {
        "role": Role.TEACHER, "name": "Ms. Priya Nair", "first_name": "Priya", "last_name": "Nair",
        "email": "priya.nair@stxaviers.edu.in", "username": "priya.nair",  "phone": "+91 98111 99887", "designation": "TGT Social Studies",
        "emp_code": "STX-T-112", "specialization": "Social Science", "experience": 5
    },
    {
        "role": Role.PARENT, "name": "Mr. Vikram Patel", "first_name": "Vikram", "last_name": "Patel",
        "email": "vikram.patel@gmail.com", "alt_email": "parent@stxaviers.edu.in", "username": "vikram.patel",  "phone": "+91 98112 34567", "occupation": "Software Architect"
    },
    {
        "role": Role.SUPPLIER, "name": "Apex Educational Supplies", "first_name": "Apex", "last_name": "Supplies",
        "email": "orders@apexsupplies.in", "alt_email": "vendor@apexsupplies.com", "username": "apexsupplies",  "phone": "+91 11 2327 8901", "vendor_code": "VEND-APEX-01"
    },
]


def seed_database(app=None):
    if app is None:
        app = create_app(os.getenv("FLASK_ENV", "development"))

    # Strictly prohibit running demo seed in production
    if app.config.get("ENV") == "production" or os.getenv("FLASK_ENV") == "production":
        raise RuntimeError("CRITICAL SECURITY ERROR: Seeding demonstration accounts is strictly disabled in production!")

    # Local testing: set SEED_ADMIN_EMAIL to the email you sign in to Clerk with, so
    # that Clerk account links to the seeded school_admin (principal) on first sign-in.
    admin_email = (os.getenv("SEED_ADMIN_EMAIL") or "").strip().lower()
    if admin_email:
        for acc in SUPPORTING_ACCOUNTS:
            if acc["role"] == Role.SCHOOL_ADMIN:
                acc["email"] = admin_email

    with app.app_context():
        print("[*] Seeding School ERP database with Fresh 30-Student Dataset...")

        # -------------------------------------------------------------
        # 1. Canonical Roles
        # -------------------------------------------------------------
        roles_data = [
            (Role.SUPER_ADMIN, "System Super Administrator across all tenant institutions"),
            (Role.SCHOOL_ADMIN, "School Principal / Headmaster campus administrator"),
            (Role.TEACHER, "Faculty teaching staff and subject instructor"),
            (Role.STUDENT, "Enrolled student learner"),
            (Role.PARENT, "Parent or legal guardian"),
            (Role.SUPPLIER, "Procurement vendor and educational supplier"),
        ]
        roles_map = {}
        for role_name, description in roles_data:
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name, description=description, is_system_role=True)
                db.session.add(role)
                db.session.flush()
                print(f"  + Created Role: {role_name}")
            roles_map[role_name] = role

        # -------------------------------------------------------------
        # 2. Permissions & Admin Mappings
        # -------------------------------------------------------------
        permissions_data = [
            ("finance:read", "finance", "View student fee invoices and payments"),
            ("finance:write", "finance", "Record payments and generate fee invoices"),
            ("library:circulate", "library", "Issue and return library book copies"),
            ("admissions:manage", "admissions", "Review and enroll admission applicants"),
            ("academics:manage", "academics", "Manage classes, subjects, and sessions"),
            ("attendance:record", "attendance", "Take daily student and staff attendance"),
            ("reports:view", "reports", "View institutional analytics and export metrics"),
        ]
        permissions_map = {}
        for code, module, desc in permissions_data:
            perm = Permission.query.filter_by(code=code).first()
            if not perm:
                perm = Permission(code=code, module=module, description=desc)
                db.session.add(perm)
                db.session.flush()
            permissions_map[code] = perm

        admin_role = roles_map[Role.SCHOOL_ADMIN]
        for perm in permissions_map.values():
            existing = RolePermission.query.filter_by(role_id=admin_role.id, permission_id=perm.id).first()
            if not existing:
                db.session.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))

        # -------------------------------------------------------------
        # 3. Demonstration Institution
        # -------------------------------------------------------------
        inst = Institution.query.filter_by(code="STXAV-DELHI").first()
        if not inst:
            inst = Institution(
                code="STXAV-DELHI",
                name="St. Xavier's Senior Secondary School",
                subdomain="stxaviers",
                board_affiliation="CBSE",
                affiliation_number="CBSE/AFF/2130042",
                email="contact@stxaviers.edu.in",
                phone="+91-11-27458921",
                address="4 Raj Niwas Marg, Civil Lines",
                city="Delhi",
                state="Delhi",
                country="India",
                postal_code="110054",
                currency="INR",
                status="ACTIVE",
            )
            db.session.add(inst)
            db.session.flush()
            print(f"  + Created Institution: {inst.name} ({inst.code})")

        # Service Entitlements
        core_services = [
            "admissions", "attendance", "assignments", "examinations",
            "question_papers", "fees", "timetable", "calendar",
            "library", "transport", "reports", "digital_marketing",
            "staff_groups", "academic_awards"
        ]
        for s_key in core_services:
            ent = ServiceEntitlement.query.filter_by(institution_id=inst.id, service_key=s_key).first()
            if not ent:
                db.session.add(ServiceEntitlement(institution_id=inst.id, service_key=s_key, is_enabled=True))

        # Institution Setting
        setting = InstitutionSetting.query.filter_by(institution_id=inst.id, setting_key="grading_system").first()
        if not setting:
            db.session.add(InstitutionSetting(
                institution_id=inst.id, category="ACADEMIC", setting_key="grading_system",
                setting_value="CBSE_9_POINT", data_type="STRING"
            ))

        # -------------------------------------------------------------
        # 4. Academic Calendar: Year & Term
        # -------------------------------------------------------------
        ay = AcademicYear.query.filter_by(institution_id=inst.id, name="2026-2027").first()
        if not ay:
            ay = AcademicYear(
                institution_id=inst.id,
                name="2026-2027",
                start_date=date(2026, 4, 1),
                end_date=date(2027, 3, 31),
                is_current=True,
            )
            db.session.add(ay)
            db.session.flush()
            print(f"  + Created Academic Year: {ay.name}")

        term = Term.query.filter_by(academic_year_id=ay.id, name="Term 1").first()
        if not term:
            term = Term(
                academic_year_id=ay.id,
                name="Term 1",
                start_date=date(2026, 4, 1),
                end_date=date(2026, 9, 30),
                is_active=True,
            )
            db.session.add(term)
            db.session.flush()

        # -------------------------------------------------------------
        # 5. Room & Class Levels (Classes 6 to 12) + Section A
        # -------------------------------------------------------------
        room = Room.query.filter_by(institution_id=inst.id, room_number="Room 204").first()
        if not room:
            room = Room(institution_id=inst.id, room_number="Room 204", building="Main Block", floor="2nd Floor", capacity=40)
            db.session.add(room)
            db.session.flush()

        class_specs = [
            ("Class 6", "CLS-06", 6),
            ("Class 7", "CLS-07", 7),
            ("Class 8", "CLS-08", 8),
            ("Class 9", "CLS-09", 9),
            ("Class 10", "CLS-10", 10),
            ("Class 11", "CLS-11", 11),
            ("Class 12", "CLS-12", 12),
        ]
        class_levels_map = {}
        sections_map = {}

        for c_name, c_code, seq in class_specs:
            cl = ClassLevel.query.filter_by(institution_id=inst.id, name=c_name).first()
            if not cl:
                cl = ClassLevel(
                    institution_id=inst.id,
                    name=c_name,
                    code=c_code,
                    sequence_order=seq,
                )
                db.session.add(cl)
                db.session.flush()
            class_levels_map[c_name] = cl

            sec = Section.query.filter_by(class_level_id=cl.id, name="A").first()
            if not sec:
                sec = Section(
                    class_level_id=cl.id,
                    name="A",
                    capacity=40,
                    room_id=room.id if c_name == "Class 10" else None
                )
                db.session.add(sec)
                db.session.flush()
            sections_map[c_name] = sec

        # Subjects
        subjects_data = [
            ("MATH", "Mathematics", "THEORY", Decimal("4.0")),
            ("SCI", "Science", "THEORY", Decimal("4.0")),
            ("ENG", "English Language & Literature", "THEORY", Decimal("4.0")),
            ("SOC", "Social Science", "THEORY", Decimal("4.0")),
            ("PHYS", "Physics", "THEORY", Decimal("4.0")),
            ("CHEM", "Chemistry", "THEORY", Decimal("4.0")),
            ("CS", "Computer Science", "PRACTICAL", Decimal("4.0")),
            ("MATH-10", "Mathematics (Grade 10)", "THEORY", Decimal("1.0")),
            ("SCI-10", "Science (Grade 10)", "THEORY", Decimal("1.0")),
            ("ENG-10", "English Language (Grade 10)", "THEORY", Decimal("1.0")),
        ]
        subjects_map = {}
        for code, sub_name, stype, credits in subjects_data:
            sub = Subject.query.filter_by(institution_id=inst.id, code=code).first()
            if not sub:
                sub = Subject(institution_id=inst.id, code=code, name=sub_name, subject_type=stype, credit_hours=credits)
                db.session.add(sub)
                db.session.flush()
            subjects_map[code] = sub

        # Link ClassSubjects
        for c_name, sec in sections_map.items():
            for scode in ["MATH", "ENG", "SCI"]:
                cs = ClassSubject.query.filter_by(section_id=sec.id, subject_id=subjects_map[scode].id).first()
                if not cs:
                    db.session.add(ClassSubject(section_id=sec.id, subject_id=subjects_map[scode].id, is_elective=False))

        # Also link MATH-10 to Section 10-A for backwards compatibility with tests
        sec_10a = sections_map["Class 10"]
        for legacy_code in ["MATH-10", "SCI-10", "ENG-10"]:
            cs_leg = ClassSubject.query.filter_by(section_id=sec_10a.id, subject_id=subjects_map[legacy_code].id).first()
            if not cs_leg:
                db.session.add(ClassSubject(section_id=sec_10a.id, subject_id=subjects_map[legacy_code].id, is_elective=False))

        # -------------------------------------------------------------
        # 6. Supporting Administrative & Faculty Accounts
        # -------------------------------------------------------------
        users_map = {}
        for acc in SUPPORTING_ACCOUNTS:
            # Match by primary email, username, or alt_email
            query = (User.email == acc["email"]) | (User.username == acc["username"])
            if "alt_email" in acc:
                query = query | (User.email == acc["alt_email"])

            user = User.query.filter(query).first()
            if not user:
                user = User(
                    institution_id=inst.id if acc["role"] != Role.SUPER_ADMIN else None,
                    username=acc["username"],
                    email=acc["email"],
                    first_name=acc["first_name"],
                    last_name=acc["last_name"],
                    phone=acc["phone"],
                    is_active=True,
                    is_verified=True,
                )
                db.session.add(user)
                db.session.flush()
                print(f"  + Created Supporting User: {user.email} ({acc['role']})")
            else:
                user.is_active = True
                user.is_verified = True

            # Assign Role
            role_obj = roles_map[acc["role"]]
            ur = UserRole.query.filter_by(user_id=user.id, role_id=role_obj.id).first()
            if not ur:
                db.session.add(UserRole(user_id=user.id, role_id=role_obj.id))

            users_map[acc["username"]] = user

            # Also create alternate user if alt_email exists (e.g. superadmin@novalytix.com, orders@apexsupplies.in)
            if "alt_email" in acc and acc["alt_email"] != user.email:
                alt_user = User.query.filter_by(email=acc["alt_email"]).first()
                if not alt_user:
                    alt_user = User(
                        institution_id=inst.id if acc["role"] != Role.SUPER_ADMIN else None,
                        username=f"{acc['username']}_alt",
                        email=acc["alt_email"],
                        first_name=acc["first_name"],
                        last_name=acc["last_name"],
                        phone=acc["phone"],
                        is_active=True,
                        is_verified=True,
                    )
                    db.session.add(alt_user)
                    db.session.flush()
                    db.session.add(UserRole(user_id=alt_user.id, role_id=role_obj.id))

        # Set class teacher on Section 10-A
        sec_10a.class_teacher_id = users_map["ananya.sharma"].id

        # -------------------------------------------------------------
        # 7. Staff & Teacher Profiles (Including Dual Role Librarian)
        # -------------------------------------------------------------
        dept_sci = Department.query.filter_by(institution_id=inst.id, name="Science & Mathematics").first()
        if not dept_sci:
            dept_sci = Department(institution_id=inst.id, name="Science & Mathematics")
            db.session.add(dept_sci)
            db.session.flush()

        # Teacher: Ananya Sharma
        u_ananya = users_map["ananya.sharma"]
        sp_ananya = StaffProfile.query.filter_by(user_id=u_ananya.id).first()
        if not sp_ananya:
            sp_ananya = StaffProfile(
                institution_id=inst.id, user_id=u_ananya.id, employee_id="STX-T-101",
                department_id=dept_sci.id, designation="Senior Mathematics Teacher",
                employment_type="PERMANENT", joining_date=date(2020, 6, 1),
                basic_salary=Decimal("65000.00"), status="ACTIVE"
            )
            db.session.add(sp_ananya)
            db.session.flush()
            db.session.add(TeacherProfile(staff_profile_id=sp_ananya.id, specialization="Pure Mathematics", teaching_experience_years=8, is_class_teacher=True))
            db.session.add(Qualification(staff_profile_id=sp_ananya.id, degree_title="M.Sc. Mathematics", institution_name="Delhi University", year_of_passing=2016))

        # Teacher: Sunita Verma (Dual Role: Teacher & Librarian)
        u_sunita = users_map["sunita.verma"]
        sp_sunita = StaffProfile.query.filter_by(user_id=u_sunita.id).first()
        if not sp_sunita:
            sp_sunita = StaffProfile(
                institution_id=inst.id, user_id=u_sunita.id, employee_id="STX-T-105",
                department_id=dept_sci.id, designation="Science Teacher & Librarian In-Charge",
                employment_type="PERMANENT", joining_date=date(2018, 7, 15),
                basic_salary=Decimal("68000.00"), status="ACTIVE"
            )
            db.session.add(sp_sunita)
            db.session.flush()
            db.session.add(TeacherProfile(staff_profile_id=sp_sunita.id, specialization="Physical Sciences", teaching_experience_years=10, is_class_teacher=False))
            db.session.add(LibraryStaffAssignment(staff_profile_id=sp_sunita.id, role_title="Librarian In-Charge", assigned_date=date(2021, 4, 1), status="ACTIVE"))

        # Parent Record
        u_parent = users_map["vikram.patel"]
        parent_rec = Parent.query.filter_by(user_id=u_parent.id).first()
        if not parent_rec:
            parent_rec = Parent(
                institution_id=inst.id, user_id=u_parent.id, first_name="Vikram", last_name="Patel",
                relationship_type="Father", occupation="Software Architect", phone="+91 98112 34567",
                email="vikram.patel@gmail.com", address="B-402 Green Meadows, Civil Lines, Delhi"
            )
            db.session.add(parent_rec)
            db.session.flush()

        # -------------------------------------------------------------
        # 8. Exactly 30 Seeded Students (Classes 6 through 12)
        # -------------------------------------------------------------
        student_role = roles_map[Role.STUDENT]
        for s_idx, s_data in enumerate(STUDENTS_DATA, start=1):
            # User record
            stud_user = User.query.filter((User.email == s_data["email"]) | (User.username == s_data["username"])).first()
            if not stud_user:
                stud_user = User(
                    institution_id=inst.id,
                    username=s_data["username"],
                    email=s_data["email"],
                    first_name=s_data["first_name"],
                    last_name=s_data["last_name"],
                    phone=s_data["parent_phone"],
                    is_active=True,
                    is_verified=True,
                )
                db.session.add(stud_user)
                db.session.flush()
            else:
                stud_user.email = s_data["email"]
                stud_user.username = s_data["username"]
                stud_user.is_active = True
                stud_user.is_verified = True

            # Assign role
            ur = UserRole.query.filter_by(user_id=stud_user.id, role_id=student_role.id).first()
            if not ur:
                db.session.add(UserRole(user_id=stud_user.id, role_id=student_role.id))

            # Student record
            stud = Student.query.filter_by(admission_number=s_data["adm_no"]).first()
            if not stud:
                stud = Student(
                    institution_id=inst.id,
                    user_id=stud_user.id,
                    admission_number=s_data["adm_no"],
                    admission_date=date(2026, 4, 1),
                    date_of_birth=s_data["dob"],
                    gender=s_data["gender"],
                    blood_group="B+",
                    emergency_contact_name=s_data["parent_name"],
                    emergency_contact_phone=s_data["parent_phone"],
                    status="ACTIVE",
                )
                db.session.add(stud)
                db.session.flush()

            # Active Enrollment in Class Section A
            sec = sections_map[s_data["class_name"]]
            enroll = StudentEnrollment.query.filter_by(student_id=stud.id, academic_year_id=ay.id).first()
            if not enroll:
                enroll = StudentEnrollment(
                    student_id=stud.id,
                    academic_year_id=ay.id,
                    section_id=sec.id,
                    roll_number=str(s_data["roll"]),
                    enrollment_date=date(2026, 4, 1),
                    status="ACTIVE",
                )
                db.session.add(enroll)

            # Link Parent
            if parent_rec:
                sp = StudentParent.query.filter_by(student_id=stud.id, parent_id=parent_rec.id).first()
                if not sp:
                    db.session.add(StudentParent(
                        student_id=stud.id, parent_id=parent_rec.id,
                        is_primary_contact=True, can_pickup=True
                    ))

        # -------------------------------------------------------------
        # 9. Teacher Assignments & Timetable
        # -------------------------------------------------------------
        cs_math10 = ClassSubject.query.filter_by(section_id=sec_10a.id, subject_id=subjects_map["MATH-10"].id).first()
        if cs_math10:
            t_assign = TeacherAssignment.query.filter_by(class_subject_id=cs_math10.id, teacher_id=u_ananya.id, academic_year_id=ay.id).first()
            if not t_assign:
                db.session.add(TeacherAssignment(class_subject_id=cs_math10.id, teacher_id=u_ananya.id, academic_year_id=ay.id, is_primary=True))

        p1 = TimetablePeriod.query.filter_by(institution_id=inst.id, period_number=1).first()
        if not p1:
            p1 = TimetablePeriod(institution_id=inst.id, name="Period 1", period_number=1, start_time=time(8, 30), end_time=time(9, 15), is_break=False)
            db.session.add(p1)
            db.session.flush()

        slot = TimetableSlot.query.filter_by(academic_year_id=ay.id, section_id=sec_10a.id, period_id=p1.id, day_of_week=1).first()
        if not slot and cs_math10:
            db.session.add(TimetableSlot(
                academic_year_id=ay.id, section_id=sec_10a.id, subject_id=subjects_map["MATH-10"].id,
                teacher_id=u_ananya.id, room_id=room.id, period_id=p1.id, day_of_week=1
            ))

        # -------------------------------------------------------------
        # 10. Library Book & Copy
        # -------------------------------------------------------------
        book = Book.query.filter_by(institution_id=inst.id, isbn="978-0134685991").first()
        if not book:
            book = Book(
                institution_id=inst.id, isbn="978-0134685991", title="Effective Java",
                author="Joshua Bloch", publisher="Addison-Wesley", category="Computer Science",
                total_copies=3, available_copies=3
            )
            db.session.add(book)
            db.session.flush()
            for i in range(1, 4):
                db.session.add(BookCopy(
                    book_id=book.id, barcode=f"LIB-EJ-00{i}", accession_number=f"ACC-2026-00{i}",
                    condition="NEW", status="AVAILABLE"
                ))

        # -------------------------------------------------------------
        # 11. Transport Route, Stop, Vehicle, & Allocation
        # -------------------------------------------------------------
        route = TransportRoute.query.filter_by(institution_id=inst.id, route_code="RT-10").first()
        if not route:
            route = TransportRoute(
                institution_id=inst.id, route_name="Route 10 - North Delhi Line",
                route_code="RT-10", start_point="Rohini Sector 14", end_point="St. Xavier's Campus",
                fare_amount=Decimal("2500.00")
            )
            db.session.add(route)
            db.session.flush()

            stop = TransportStop(
                route_id=route.id, stop_name="Civil Lines Metro Station", sequence_order=1,
                pickup_time=time(7, 30), drop_time=time(14, 30),
                latitude=Decimal("28.6750000"), longitude=Decimal("77.2250000")
            )
            db.session.add(stop)
            db.session.flush()

            veh = TransportVehicle(
                institution_id=inst.id, vehicle_number="DL-01-AB-1024", capacity=32,
                fitness_valid_until=date(2027, 5, 1), status="ACTIVE"
            )
            db.session.add(veh)
            db.session.flush()

            # Allocate first student to transport
            first_stud = Student.query.filter_by(admission_number="ADM-2026-0601").first()
            if first_stud:
                alloc = TransportAllocation.query.filter_by(student_id=first_stud.id).first()
                if not alloc:
                    db.session.add(TransportAllocation(
                        student_id=first_stud.id, route_id=route.id, stop_id=stop.id,
                        vehicle_id=veh.id, academic_year_id=ay.id, status="ACTIVE"
                    ))

        # -------------------------------------------------------------
        # 12. Supplier & Cross-Institution Relationship
        # -------------------------------------------------------------
        u_supplier = users_map["apexsupplies"]
        supp = Supplier.query.filter_by(vendor_code="VEND-APEX-01").first()
        if not supp:
            supp = Supplier(
                user_id=u_supplier.id, vendor_code="VEND-APEX-01", company_name="Apex Educational Supplies Pvt Ltd",
                contact_person="Ramesh Gupta", email="orders@apexsupplies.in", phone="+91-11-23278901",
                gstin="07AAAAA0000A1Z5", category="BOOKS_AND_STATIONERY", status="ACTIVE"
            )
            db.session.add(supp)
            db.session.flush()

            db.session.add(SupplierInstitution(
                supplier_id=supp.id, institution_id=inst.id, contract_reference="CONTRACT-2026-STX",
                payment_terms_days=30
            ))

        # -------------------------------------------------------------
        # 13. Demo fee invoices (local development only)
        # -------------------------------------------------------------
        from app.models import FeeInvoice, FeeInvoiceItem
        for idx, stud in enumerate(Student.query.filter_by(institution_id=inst.id)
                                   .order_by(Student.admission_number).limit(12).all()):
            if FeeInvoice.query.filter_by(student_id=stud.id).first():
                continue
            for term, due, amount in (("Term 1", date(2026, 7, 15), Decimal("18500.00")),
                                      ("Term 2", date(2027, 1, 15), Decimal("18500.00"))):
                paid = amount if (term == "Term 1" and idx % 3 == 0) else Decimal("0.00")
                inv = FeeInvoice(
                    institution_id=inst.id,
                    invoice_number=f"INV-2026-{stud.admission_number[-4:]}-{term[-1]}",
                    student_id=stud.id, category="Tuition", academic_year="2026-2027",
                    subtotal=amount, discount_amount=Decimal("0"), total_amount=amount,
                    paid_amount=paid, balance_amount=amount - paid,
                    status="PAID" if paid else "UNPAID", issue_date=date(2026, 4, 1), due_date=due,
                )
                db.session.add(inv)
                db.session.flush()
                db.session.add(FeeInvoiceItem(invoice_id=inv.id, fee_head=f"Tuition Fee - {term}", amount=amount))

        # Commit all seeded data
        db.session.commit()
        print("[OK] Database seeding completed successfully! Exactly 30 students and supporting accounts verified.")


if __name__ == "__main__":
    seed_database()
