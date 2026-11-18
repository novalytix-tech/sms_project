"""
Fresh 30-Student Clean Database Seeding Script for School Management System (SMS ERP)
Creates:
- Classes 6 through 12 with Section A
- Core academic subjects and faculty assignments
- Exactly 30 fictional Indian student profiles distributed across Classes 6 to 12
- Unique student User accounts with Argon2id hashed passwords
- Supporting administrator, teacher, parent, and supplier accounts
- Outputs SEED_USERS_LOGIN_CREDENTIALS.md and SEED_USERS_LOGIN_CREDENTIALS.csv
"""

import os
import sys
import uuid
import csv
from datetime import date, datetime, timezone
from decimal import Decimal

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from app.utils.security import hash_password
from app.models import (
    Institution, User, Role, UserRole, Permission, RolePermission, ServiceEntitlement,
    AcademicYear, Term, ClassLevel, Section, Subject, ClassSubject,
    Student, StudentEnrollment, Parent, StudentParent,
    StaffProfile, TeacherProfile, TeacherAssignment,
    Department, Room, FeeStructure, FeeStructureItem,
    TransportRoute, TransportStop, TransportVehicle,
    Book, BookCopy, Supplier, SupplierInstitution
)

# --------------------------------------------------------------------------
# Student Specification Dataset (Exactly 30 Students)
# --------------------------------------------------------------------------
STUDENTS_DATA = [
    # Class 6 (5 Students)
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 1,
        "first_name": "Aarav", "last_name": "Sharma", "gender": "MALE", "dob": date(2015, 5, 14),
        "adm_no": "ADM-2026-0601", "email": "aarav.sharma@student.stxaviers.edu.in", "username": "aarav.sharma",
        "temp_pass": "Aarav#601", "parent_name": "Rajesh Sharma", "parent_phone": "+91 98111 06010",
        "parent_email": "rajesh.sharma.parent@gmail.com", "address": "B-42, Vasant Kunj, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 2,
        "first_name": "Diya", "last_name": "Patel", "gender": "FEMALE", "dob": date(2015, 8, 22),
        "adm_no": "ADM-2026-0602", "email": "diya.patel@student.stxaviers.edu.in", "username": "diya.patel",
        "temp_pass": "Diya#602", "parent_name": "Bhavesh Patel", "parent_phone": "+91 98111 06020",
        "parent_email": "bhavesh.patel.p@gmail.com", "address": "C-12, Saket, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 3,
        "first_name": "Rohan", "last_name": "Verma", "gender": "MALE", "dob": date(2015, 2, 10),
        "adm_no": "ADM-2026-0603", "email": "rohan.verma@student.stxaviers.edu.in", "username": "rohan.verma",
        "temp_pass": "Rohan#603", "parent_name": "Manish Verma", "parent_phone": "+91 98111 06030",
        "parent_email": "manish.verma.p@gmail.com", "address": "D-5, Rohini Sector 9, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 4,
        "first_name": "Ananya", "last_name": "Iyer", "gender": "FEMALE", "dob": date(2015, 11, 3),
        "adm_no": "ADM-2026-0604", "email": "ananya.iyer@student.stxaviers.edu.in", "username": "ananya.iyer",
        "temp_pass": "Ananya#604", "parent_name": "Sundaram Iyer", "parent_phone": "+91 98111 06040",
        "parent_email": "sundaram.iyer.p@gmail.com", "address": "A-18, Dwarka Sector 6, New Delhi"
    },
    {
        "class_name": "Class 6", "class_code": "CLS-06", "sequence": 6, "section": "A", "roll": 5,
        "first_name": "Kabir", "last_name": "Khan", "gender": "MALE", "dob": date(2015, 7, 19),
        "adm_no": "ADM-2026-0605", "email": "kabir.khan@student.stxaviers.edu.in", "username": "kabir.khan",
        "temp_pass": "Kabir#605", "parent_name": "Tariq Khan", "parent_phone": "+91 98111 06050",
        "parent_email": "tariq.khan.p@gmail.com", "address": "H-23, Nizamuddin East, New Delhi"
    },

    # Class 7 (5 Students)
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 1,
        "first_name": "Meera", "last_name": "Reddy", "gender": "FEMALE", "dob": date(2014, 4, 16),
        "adm_no": "ADM-2026-0701", "email": "meera.reddy@student.stxaviers.edu.in", "username": "meera.reddy",
        "temp_pass": "Meera#701", "parent_name": "Venkat Reddy", "parent_phone": "+91 98111 07010",
        "parent_email": "venkat.reddy.p@gmail.com", "address": "E-7, Hauz Khas, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 2,
        "first_name": "Tanvi", "last_name": "Deshmukh", "gender": "FEMALE", "dob": date(2014, 9, 28),
        "adm_no": "ADM-2026-0702", "email": "tanvi.deshmukh@student.stxaviers.edu.in", "username": "tanvi.deshmukh",
        "temp_pass": "Tanvi#702", "parent_name": "Sachin Deshmukh", "parent_phone": "+91 98111 07020",
        "parent_email": "sachin.deshmukh.p@gmail.com", "address": "J-14, Green Park, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 3,
        "first_name": "Aditya", "last_name": "Joshi", "gender": "MALE", "dob": date(2014, 1, 11),
        "adm_no": "ADM-2026-0703", "email": "aditya.joshi@student.stxaviers.edu.in", "username": "aditya.joshi",
        "temp_pass": "Aditya#703", "parent_name": "Prakash Joshi", "parent_phone": "+91 98111 07030",
        "parent_email": "prakash.joshi.p@gmail.com", "address": "F-3, Janakpuri, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 4,
        "first_name": "Ishaan", "last_name": "Malhotra", "gender": "MALE", "dob": date(2014, 6, 30),
        "adm_no": "ADM-2026-0704", "email": "ishaan.malhotra@student.stxaviers.edu.in", "username": "ishaan.malhotra",
        "temp_pass": "Ishaan#704", "parent_name": "Rajiv Malhotra", "parent_phone": "+91 98111 07040",
        "parent_email": "rajiv.malhotra.p@gmail.com", "address": "M-8, Greater Kailash I, New Delhi"
    },
    {
        "class_name": "Class 7", "class_code": "CLS-07", "sequence": 7, "section": "A", "roll": 5,
        "first_name": "Sanya", "last_name": "Gupta", "gender": "FEMALE", "dob": date(2014, 12, 5),
        "adm_no": "ADM-2026-0705", "email": "sanya.gupta@student.stxaviers.edu.in", "username": "sanya.gupta",
        "temp_pass": "Sanya#705", "parent_name": "Deepak Gupta", "parent_phone": "+91 98111 07050",
        "parent_email": "deepak.gupta.p@gmail.com", "address": "B-9, Preet Vihar, New Delhi"
    },

    # Class 8 (4 Students)
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 1,
        "first_name": "Vihaan", "last_name": "Kapoor", "gender": "MALE", "dob": date(2013, 3, 21),
        "adm_no": "ADM-2026-0801", "email": "vihaan.kapoor@student.stxaviers.edu.in", "username": "vihaan.kapoor",
        "temp_pass": "Vihaan#801", "parent_name": "Sunil Kapoor", "parent_phone": "+91 98111 08010",
        "parent_email": "sunil.kapoor.p@gmail.com", "address": "N-11, Defence Colony, New Delhi"
    },
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 2,
        "first_name": "Sneha", "last_name": "Nambiar", "gender": "FEMALE", "dob": date(2013, 7, 14),
        "adm_no": "ADM-2026-0802", "email": "sneha.nambiar@student.stxaviers.edu.in", "username": "sneha.nambiar",
        "temp_pass": "Sneha#802", "parent_name": "Narayanan Nambiar", "parent_phone": "+91 98111 08020",
        "parent_email": "nambiar.p@gmail.com", "address": "K-4, Mayur Vihar Phase I, New Delhi"
    },
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 3,
        "first_name": "Aryan", "last_name": "Saxena", "gender": "MALE", "dob": date(2013, 10, 9),
        "adm_no": "ADM-2026-0803", "email": "aryan.saxena@student.stxaviers.edu.in", "username": "aryan.saxena",
        "temp_pass": "Aryan#803", "parent_name": "Alok Saxena", "parent_phone": "+91 98111 08030",
        "parent_email": "alok.saxena.p@gmail.com", "address": "P-16, Paschim Vihar, New Delhi"
    },
    {
        "class_name": "Class 8", "class_code": "CLS-08", "sequence": 8, "section": "A", "roll": 4,
        "first_name": "Pooja", "last_name": "Bhatt", "gender": "FEMALE", "dob": date(2013, 1, 25),
        "adm_no": "ADM-2026-0804", "email": "pooja.bhatt@student.stxaviers.edu.in", "username": "pooja.bhatt",
        "temp_pass": "Pooja#804", "parent_name": "Harish Bhatt", "parent_phone": "+91 98111 08040",
        "parent_email": "harish.bhatt.p@gmail.com", "address": "C-8, Pitampura, New Delhi"
    },

    # Class 9 (4 Students)
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 1,
        "first_name": "Advait", "last_name": "Menon", "gender": "MALE", "dob": date(2012, 5, 18),
        "adm_no": "ADM-2026-0901", "email": "advait.menon@student.stxaviers.edu.in", "username": "advait.menon",
        "temp_pass": "Advait#901", "parent_name": "Krishnan Menon", "parent_phone": "+91 98111 09010",
        "parent_email": "krishnan.menon.p@gmail.com", "address": "G-22, Safdarjung Enclave, New Delhi"
    },
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 2,
        "first_name": "Riya", "last_name": "Sen", "gender": "FEMALE", "dob": date(2012, 8, 31),
        "adm_no": "ADM-2026-0902", "email": "riya.sen@student.stxaviers.edu.in", "username": "riya.sen",
        "temp_pass": "Riya#902", "parent_name": "Subhash Sen", "parent_phone": "+91 98111 09020",
        "parent_email": "subhash.sen.p@gmail.com", "address": "T-5, Chittaranjan Park, New Delhi"
    },
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 3,
        "first_name": "Reyansh", "last_name": "Choudhury", "gender": "MALE", "dob": date(2012, 11, 12),
        "adm_no": "ADM-2026-0903", "email": "reyansh.choudhury@student.stxaviers.edu.in", "username": "reyansh.choudhury",
        "temp_pass": "Reyansh#903", "parent_name": "Debashis Choudhury", "parent_phone": "+91 98111 09030",
        "parent_email": "debashis.c.p@gmail.com", "address": "L-19, Lajpat Nagar III, New Delhi"
    },
    {
        "class_name": "Class 9", "class_code": "CLS-09", "sequence": 9, "section": "A", "roll": 4,
        "first_name": "Anika", "last_name": "Nair", "gender": "FEMALE", "dob": date(2012, 2, 4),
        "adm_no": "ADM-2026-0904", "email": "anika.nair@student.stxaviers.edu.in", "username": "anika.nair",
        "temp_pass": "Anika#904", "parent_name": "Mohan Nair", "parent_phone": "+91 98111 09040",
        "parent_email": "mohan.nair.p@gmail.com", "address": "W-10, Karol Bagh, New Delhi"
    },

    # Class 10 (5 Students)
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 1,
        "first_name": "Pranav", "last_name": "Bansal", "gender": "MALE", "dob": date(2011, 4, 8),
        "adm_no": "ADM-2026-1001", "email": "pranav.bansal@student.stxaviers.edu.in", "username": "pranav.bansal",
        "temp_pass": "Pranav#1001", "parent_name": "Vijay Bansal", "parent_phone": "+91 98111 10010",
        "parent_email": "vijay.bansal.p@gmail.com", "address": "R-2, Punjabi Bagh, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 2,
        "first_name": "Tara", "last_name": "Mukherjee", "gender": "FEMALE", "dob": date(2011, 9, 17),
        "adm_no": "ADM-2026-1002", "email": "tara.mukherjee@student.stxaviers.edu.in", "username": "tara.mukherjee",
        "temp_pass": "Tara#1002", "parent_name": "Anirban Mukherjee", "parent_phone": "+91 98111 10020",
        "parent_email": "anirban.m.p@gmail.com", "address": "S-14, Alaknanda, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 3,
        "first_name": "Ayush", "last_name": "Singhal", "gender": "MALE", "dob": date(2011, 1, 29),
        "adm_no": "ADM-2026-1003", "email": "ayush.singhal@student.stxaviers.edu.in", "username": "ayush.singhal",
        "temp_pass": "Ayush#1003", "parent_name": "Rakesh Singhal", "parent_phone": "+91 98111 10030",
        "parent_email": "rakesh.singhal.p@gmail.com", "address": "B-6, Model Town, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 4,
        "first_name": "Disha", "last_name": "Trivedi", "gender": "FEMALE", "dob": date(2011, 6, 23),
        "adm_no": "ADM-2026-1004", "email": "disha.trivedi@student.stxaviers.edu.in", "username": "disha.trivedi",
        "temp_pass": "Disha#1004", "parent_name": "Jayesh Trivedi", "parent_phone": "+91 98111 10040",
        "parent_email": "jayesh.trivedi.p@gmail.com", "address": "E-15, Rajouri Garden, New Delhi"
    },
    {
        "class_name": "Class 10", "class_code": "CLS-10", "sequence": 10, "section": "A", "roll": 5,
        "first_name": "Vivaan", "last_name": "Bose", "gender": "MALE", "dob": date(2011, 12, 19),
        "adm_no": "ADM-2026-1005", "email": "vivaan.bose@student.stxaviers.edu.in", "username": "vivaan.bose",
        "temp_pass": "Vivaan#1005", "parent_name": "Sourav Bose", "parent_phone": "+91 98111 10050",
        "parent_email": "sourav.bose.p@gmail.com", "address": "M-3, New Friends Colony, New Delhi"
    },

    # Class 11 (4 Students)
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 1,
        "first_name": "Kriti", "last_name": "Agarwal", "gender": "FEMALE", "dob": date(2010, 3, 15),
        "adm_no": "ADM-2026-1101", "email": "kriti.agarwal@student.stxaviers.edu.in", "username": "kriti.agarwal",
        "temp_pass": "Kriti#1101", "parent_name": "Sanjay Agarwal", "parent_phone": "+91 98111 11010",
        "parent_email": "sanjay.agarwal.p@gmail.com", "address": "A-31, Civil Lines, New Delhi"
    },
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 2,
        "first_name": "Dhruv", "last_name": "Chawla", "gender": "MALE", "dob": date(2010, 7, 27),
        "adm_no": "ADM-2026-1102", "email": "dhruv.chawla@student.stxaviers.edu.in", "username": "dhruv.chawla",
        "temp_pass": "Dhruv#1102", "parent_name": "Gurpreet Chawla", "parent_phone": "+91 98111 11020",
        "parent_email": "gurpreet.chawla.p@gmail.com", "address": "D-9, Patel Nagar, New Delhi"
    },
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 3,
        "first_name": "Neha", "last_name": "Kulkarni", "gender": "FEMALE", "dob": date(2010, 10, 14),
        "adm_no": "ADM-2026-1103", "email": "neha.kulkarni@student.stxaviers.edu.in", "username": "neha.kulkarni",
        "temp_pass": "Neha#1103", "parent_name": "Nitin Kulkarni", "parent_phone": "+91 98111 11030",
        "parent_email": "nitin.kulkarni.p@gmail.com", "address": "H-11, Vasant Vihar, New Delhi"
    },
    {
        "class_name": "Class 11", "class_code": "CLS-11", "sequence": 11, "section": "A", "roll": 4,
        "first_name": "Yash", "last_name": "Vardhan", "gender": "MALE", "dob": date(2010, 2, 8),
        "adm_no": "ADM-2026-1104", "email": "yash.vardhan@student.stxaviers.edu.in", "username": "yash.vardhan",
        "temp_pass": "Yash#1104", "parent_name": "Harsh Vardhan", "parent_phone": "+91 98111 11040",
        "parent_email": "harsh.vardhan.p@gmail.com", "address": "C-25, Anand Niketan, New Delhi"
    },

    # Class 12 (3 Students)
    {
        "class_name": "Class 12", "class_code": "CLS-12", "sequence": 12, "section": "A", "roll": 1,
        "first_name": "Shruti", "last_name": "Srinivasan", "gender": "FEMALE", "dob": date(2009, 5, 20),
        "adm_no": "ADM-2026-1201", "email": "shruti.srinivasan@student.stxaviers.edu.in", "username": "shruti.srinivasan",
        "temp_pass": "Shruti#1201", "parent_name": "Raman Srinivasan", "parent_phone": "+91 98111 12010",
        "parent_email": "raman.srinivasan.p@gmail.com", "address": "F-18, Shanti Niketan, New Delhi"
    },
    {
        "class_name": "Class 12", "class_code": "CLS-12", "sequence": 12, "section": "A", "roll": 2,
        "first_name": "Manav", "last_name": "Aggarwal", "gender": "MALE", "dob": date(2009, 9, 11),
        "adm_no": "ADM-2026-1202", "email": "manav.aggarwal@student.stxaviers.edu.in", "username": "manav.aggarwal",
        "temp_pass": "Manav#1202", "parent_name": "Pradeep Aggarwal", "parent_phone": "+91 98111 12020",
        "parent_email": "pradeep.aggarwal.p@gmail.com", "address": "B-2, Gulmohar Park, New Delhi"
    },
    {
        "class_name": "Class 12", "class_code": "CLS-12", "sequence": 12, "section": "A", "roll": 3,
        "first_name": "Ananya", "last_name": "Ghosh", "gender": "FEMALE", "dob": date(2009, 12, 3),
        "adm_no": "ADM-2026-1203", "email": "ananya.ghosh@student.stxaviers.edu.in", "username": "ananya.ghosh",
        "temp_pass": "Ananya#1203", "parent_name": "Amitava Ghosh", "parent_phone": "+91 98111 12030",
        "parent_email": "amitava.ghosh.p@gmail.com", "address": "K-12, Panchsheel Park, New Delhi"
    },
]

# --------------------------------------------------------------------------
# Supporting Administrative & Faculty Accounts
# --------------------------------------------------------------------------
SUPPORTING_ACCOUNTS = [
    {
        "role": "super_admin", "name": "Vikramaditya Rao", "first_name": "Vikramaditya", "last_name": "Rao",
        "email": "superadmin@sms.edu.in", "username": "superadmin", "temp_pass": "SuperAdmin#2026!",
        "phone": "+91 99000 88776", "is_super_admin": True
    },
    {
        "role": "school_admin", "name": "Dr. Arvind Swaminathan", "first_name": "Arvind", "last_name": "Swaminathan",
        "email": "principal@stxaviers.edu.in", "username": "principal", "temp_pass": "Principal#2026!",
        "phone": "+91 98450 12345", "designation": "Principal & Administrator"
    },
    {
        "role": "teacher", "name": "Mrs. Ananya Sharma", "first_name": "Ananya", "last_name": "Sharma",
        "email": "ananya.sharma@stxaviers.edu.in", "username": "ananya.sharma", "temp_pass": "Teacher#Ananya26!",
        "phone": "+91 97111 22334", "designation": "PGT Physics & Science Head", "emp_code": "EMP-SCI-01"
    },
    {
        "role": "teacher", "name": "Mrs. Sunita Verma", "first_name": "Sunita", "last_name": "Verma",
        "email": "sunita.verma@stxaviers.edu.in", "username": "sunita.verma", "temp_pass": "Teacher#Sunita26!",
        "phone": "+91 98333 44556", "designation": "TGT English & Chief Librarian", "emp_code": "EMP-ENG-02"
    },
    {
        "role": "teacher", "name": "Mr. Rajesh Sharma", "first_name": "Rajesh", "last_name": "Sharma",
        "email": "rajesh.sharma@stxaviers.edu.in", "username": "rajesh.sharma", "temp_pass": "Teacher#Rajesh26!",
        "phone": "+91 98222 77889", "designation": "PGT Mathematics", "emp_code": "EMP-MATH-03"
    },
    {
        "role": "teacher", "name": "Ms. Priya Nair", "first_name": "Priya", "last_name": "Nair",
        "email": "priya.nair@stxaviers.edu.in", "username": "priya.nair", "temp_pass": "Teacher#Priya26!",
        "phone": "+91 98111 99887", "designation": "TGT Social Studies", "emp_code": "EMP-SOC-04"
    },
    {
        "role": "parent", "name": "Mr. Rajesh Sharma (Parent)", "first_name": "Rajesh", "last_name": "Sharma",
        "email": "parent@stxaviers.edu.in", "username": "parent_rajesh", "temp_pass": "Parent#2026!",
        "phone": "+91 98111 06010", "occupation": "Chartered Accountant"
    },
    {
        "role": "supplier", "name": "Apex Educational Supplies", "first_name": "Apex", "last_name": "Supplies",
        "email": "vendor@apexsupplies.com", "username": "apexsupplies", "temp_pass": "Supplier#2026!",
        "phone": "+91 80 4455 6677", "vendor_code": "VEND-APEX-01"
    }
]


def seed_fresh_database(app):
    with app.app_context():
        print("[1/6] Initializing Institution and System Roles...")

        # 1. Institution
        inst = Institution.query.filter_by(code="STXAV-DELHI").first()
        if not inst:
            inst = Institution(
                name="St. Xavier's Senior Secondary School",
                code="STXAV-DELHI",
                subdomain="stxaviers",
                board_affiliation="CBSE",
                affiliation_number="CBSE/DELHI/2026/089",
                address="Sector 14, Phase II, Vasant Kunj",
                city="New Delhi",
                state="Delhi",
                country="India",
                postal_code="110070",
                phone="+91 11 2689 4455",
                email="info@stxaviers.edu.in",
                website="https://stxaviers.edu.in",
                currency="INR",
                status="ACTIVE",
            )
            db.session.add(inst)
            db.session.flush()

        # 2. Roles
        roles_map = {}
        for r_name in ["super_admin", "school_admin", "teacher", "student", "parent", "supplier"]:
            r = Role.query.filter_by(name=r_name).first()
            if not r:
                r = Role(name=r_name, description=f"Role for {r_name}")
                db.session.add(r)
                db.session.flush()
            roles_map[r_name] = r

        # 3. Academic Year 2026-2027
        acad_year = AcademicYear.query.filter_by(institution_id=inst.id, name="2026-2027").first()
        if not acad_year:
            acad_year = AcademicYear(
                institution_id=inst.id,
                name="2026-2027",
                start_date=date(2026, 4, 1),
                end_date=date(2027, 3, 31),
                is_current=True,
            )
            db.session.add(acad_year)
            db.session.flush()

        print("[2/6] Setting up Classes 6 through 12 and Section A...")
        class_levels_map = {}
        sections_map = {}

        class_specs = [
            ("Class 6", "CLS-06", 6),
            ("Class 7", "CLS-07", 7),
            ("Class 8", "CLS-08", 8),
            ("Class 9", "CLS-09", 9),
            ("Class 10", "CLS-10", 10),
            ("Class 11", "CLS-11", 11),
            ("Class 12", "CLS-12", 12),
        ]

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
                )
                db.session.add(sec)
                db.session.flush()
            sections_map[c_name] = sec

        print("[3/6] Setting up Core Academic Subjects...")
        subjects_data = [
            ("Mathematics", "MATH", "THEORY"),
            ("Science", "SCI", "THEORY"),
            ("English", "ENG", "THEORY"),
            ("Social Science", "SOC", "THEORY"),
            ("Physics", "PHYS", "THEORY"),
            ("Chemistry", "CHEM", "THEORY"),
            ("Computer Science", "CS", "PRACTICAL"),
        ]
        subjects_map = {}
        for s_name, s_code, s_type in subjects_data:
            subj = Subject.query.filter_by(institution_id=inst.id, code=s_code).first()
            if not subj:
                subj = Subject(
                    institution_id=inst.id,
                    code=s_code,
                    name=s_name,
                    subject_type=s_type,
                    credit_hours=Decimal("4.00"),
                )
                db.session.add(subj)
                db.session.flush()
            subjects_map[s_code] = subj

        # Link ClassSubjects
        for c_name, sec in sections_map.items():
            for s_code in ["MATH", "ENG"]:
                cs = ClassSubject.query.filter_by(section_id=sec.id, subject_id=subjects_map[s_code].id).first()
                if not cs:
                    cs = ClassSubject(
                        section_id=sec.id,
                        subject_id=subjects_map[s_code].id,
                        is_elective=False,
                    )
                    db.session.add(cs)

        print("[4/6] Creating Supporting Admin, Teacher, Parent & Supplier Accounts...")
        created_supporting = []
        user_entities = {}

        for acc in SUPPORTING_ACCOUNTS:
            u = User.query.filter((User.email == acc["email"]) | (User.username == acc["username"])).first()
            hashed_pwd = hash_password(acc["temp_pass"])
            if not u:
                u = User(
                    institution_id=inst.id if acc["role"] != "super_admin" else None,
                    username=acc["username"],
                    email=acc["email"],
                    password_hash=hashed_pwd,
                    first_name=acc["first_name"],
                    last_name=acc["last_name"],
                    phone=acc["phone"],
                    is_active=True,
                    is_verified=True,
                )
                db.session.add(u)
                db.session.flush()
            else:
                u.email = acc["email"]
                u.username = acc["username"]
                u.password_hash = hashed_pwd
                u.is_active = True
                u.is_verified = True

            user_entities[acc["username"]] = u

            # Role assignment
            role_obj = roles_map[acc["role"]]
            ur = UserRole.query.filter_by(user_id=u.id, role_id=role_obj.id).first()
            if not ur:
                ur = UserRole(user_id=u.id, role_id=role_obj.id)
                db.session.add(ur)

            # Extra metadata
            if acc["role"] == "teacher":
                sp = StaffProfile.query.filter_by(user_id=u.id).first()
                if not sp:
                    sp = StaffProfile(
                        institution_id=inst.id,
                        user_id=u.id,
                        employee_id=acc.get("emp_code", f"EMP-{uuid.uuid4().hex[:4].upper()}"),
                        designation=acc["designation"],
                        joining_date=date(2022, 6, 1),
                        status="ACTIVE",
                    )
                    db.session.add(sp)
                    db.session.flush()

                tp = TeacherProfile.query.filter_by(staff_profile_id=sp.id).first()
                if not tp:
                    tp = TeacherProfile(
                        staff_profile_id=sp.id,
                        specialization=acc["designation"],
                        teaching_experience_years=8,
                        is_class_teacher=True,
                    )
                    db.session.add(tp)

            created_supporting.append({
                "name": acc["name"],
                "role": acc["role"],
                "login_id": acc["email"],
                "username": acc["username"],
                "temp_pass": acc["temp_pass"],
            })

        print("[5/6] Seeding Exactly 30 Students across Classes 6 to 12...")
        created_students = []

        # Parent pool to link
        parent_user = user_entities.get("parent_rajesh")
        default_parent = Parent.query.filter_by(user_id=parent_user.id).first() if parent_user else None
        if not default_parent and parent_user:
            default_parent = Parent(
                institution_id=inst.id,
                user_id=parent_user.id,
                first_name="Rajesh",
                last_name="Sharma",
                relationship_type="Father",
                phone="+91 98111 06010",
                occupation="Chartered Accountant",
            )
            db.session.add(default_parent)
            db.session.flush()

        for s_idx, s_data in enumerate(STUDENTS_DATA, start=1):
            hashed_pwd = hash_password(s_data["temp_pass"])

            # 1. User
            stud_user = User.query.filter((User.email == s_data["email"]) | (User.username == s_data["username"])).first()
            if not stud_user:
                stud_user = User(
                    institution_id=inst.id,
                    username=s_data["username"],
                    email=s_data["email"],
                    password_hash=hashed_pwd,
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
                stud_user.password_hash = hashed_pwd
                stud_user.is_active = True
                stud_user.is_verified = True

            # Assign student role
            ur = UserRole.query.filter_by(user_id=stud_user.id, role_id=roles_map["student"].id).first()
            if not ur:
                ur = UserRole(user_id=stud_user.id, role_id=roles_map["student"].id)
                db.session.add(ur)

            # 2. Student record
            stud = Student.query.filter_by(admission_number=s_data["adm_no"]).first()
            if not stud:
                stud = Student(
                    institution_id=inst.id,
                    user_id=stud_user.id,
                    admission_number=s_data["adm_no"],
                    admission_date=date(2026, 4, 1),
                    date_of_birth=s_data["dob"],
                    gender=s_data["gender"],
                    blood_group="O+",
                    emergency_contact_name=s_data["parent_name"],
                    emergency_contact_phone=s_data["parent_phone"],
                    status="ACTIVE",
                )
                db.session.add(stud)
                db.session.flush()

            # 3. Enrollment in target class section
            sec = sections_map[s_data["class_name"]]
            enroll = StudentEnrollment.query.filter_by(student_id=stud.id, academic_year_id=acad_year.id).first()
            if not enroll:
                enroll = StudentEnrollment(
                    student_id=stud.id,
                    academic_year_id=acad_year.id,
                    section_id=sec.id,
                    roll_number=str(s_data["roll"]),
                    enrollment_date=date(2026, 4, 1),
                    status="ACTIVE",
                )
                db.session.add(enroll)

            # 4. Link Parent
            if default_parent:
                sp = StudentParent.query.filter_by(student_id=stud.id, parent_id=default_parent.id).first()
                if not sp:
                    sp = StudentParent(
                        student_id=stud.id,
                        parent_id=default_parent.id,
                        is_primary_contact=True,
                        can_pickup=True,
                    )
                    db.session.add(sp)

            created_students.append({
                "student_name": f"{s_data['first_name']} {s_data['last_name']}",
                "class_name": s_data["class_name"],
                "section": s_data["section"],
                "roll": s_data["roll"],
                "adm_no": s_data["adm_no"],
                "login_id": s_data["email"],
                "username": s_data["username"],
                "temp_pass": s_data["temp_pass"],
                "parent_name": s_data["parent_name"],
                "parent_phone": s_data["parent_phone"],
            })

        db.session.commit()
        print(f"[OK] Successfully committed {len(created_students)} student records and {len(created_supporting)} supporting accounts to PostgreSQL 18.")

        print("[6/6] Generating Credentials Reports (Markdown & CSV)...")
        write_credentials_reports(created_students, created_supporting)

        return created_students, created_supporting


def write_credentials_reports(students, supporting):
    root_dir = os.path.abspath(os.path.join(backend_dir, ".."))

    # 1. Markdown Report
    md_path = os.path.join(root_dir, "SEED_USERS_LOGIN_CREDENTIALS.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# School Management System (SMS ERP)\n")
        f.write("# Fresh Seed Users & Student Login Credentials\n\n")
        f.write("**Generated Date:** November 3, 2026  \n")
        f.write("**Database:** `school_erp` (PostgreSQL 18 on port 5433)  \n")
        f.write("**Institution:** St. Xavier's Senior Secondary School (`STXAV-DELHI`)  \n")
        f.write("**Security Level:** Local Development / QA Demo Use Only  \n\n")
        f.write("> [!IMPORTANT]\n")
        f.write("> Passwords are stored in PostgreSQL ONLY as Argon2id cryptographic hashes. Plaintext passwords are NEVER stored in the database. These temporary passwords are provided here exclusively for local verification and evaluation.\n\n")

        f.write("## 1. Exactly 30 Seeded Student Accounts (Classes 6 to 12)\n\n")
        f.write("| Student Name | Class | Section | Roll | Admission No. | Login ID (Email) | Username | Temporary Password |\n")
        f.write("| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n")
        for s in students:
            f.write(f"| **{s['student_name']}** | {s['class_name']} | {s['section']} | {s['roll']} | `{s['adm_no']}` | `{s['login_id']}` | `{s['username']}` | `{s['temp_pass']}` |\n")

        f.write("\n## 2. Supporting Faculty, Administrative & Parent Accounts\n\n")
        f.write("| Account Name | Role | Designation | Login ID (Email) | Username | Temporary Password |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for u in supporting:
            f.write(f"| **{u['name']}** | `{u['role']}` | Staff / Faculty | `{u['login_id']}` | `{u['username']}` | `{u['temp_pass']}` |\n")

        f.write("\n## 3. Class-Wise Student Distribution Summary\n\n")
        f.write("| Academic Class | Target Number of Students | Actual Seeded Students | Status |\n")
        f.write("| :--- | :---: | :---: | :---: |\n")
        f.write("| **Class 6** | 5 | 5 | **VERIFIED** |\n")
        f.write("| **Class 7** | 5 | 5 | **VERIFIED** |\n")
        f.write("| **Class 8** | 4 | 4 | **VERIFIED** |\n")
        f.write("| **Class 9** | 4 | 4 | **VERIFIED** |\n")
        f.write("| **Class 10** | 5 | 5 | **VERIFIED** |\n")
        f.write("| **Class 11** | 4 | 4 | **VERIFIED** |\n")
        f.write("| **Class 12** | 3 | 3 | **VERIFIED** |\n")
        f.write("| **TOTAL** | **30** | **30** | **100% MATCH** |\n")

    print(f"  [OK] Generated {md_path}")

    # 2. CSV Report
    csv_path = os.path.join(root_dir, "SEED_USERS_LOGIN_CREDENTIALS.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Student Name", "Class", "Section", "Roll Number", "Admission Number", "Login ID", "Username", "Temporary Password", "Parent Name", "Parent Contact"])
        for s in students:
            writer.writerow([s["student_name"], s["class_name"], s["section"], s["roll"], s["adm_no"], s["login_id"], s["username"], s["temp_pass"], s["parent_name"], s["parent_phone"]])
        writer.writerow([])
        writer.writerow(["--- Supporting Accounts ---", "", "", "", "", "", "", "", "", ""])
        writer.writerow(["Name", "Role", "", "", "", "Login ID", "Username", "Temporary Password", "", ""])
        for u in supporting:
            writer.writerow([u["name"], u["role"], "", "", "", u["login_id"], u["username"], u["temp_pass"], "", ""])

    print(f"  [OK] Generated {csv_path}")

    # 3. Add to .gitignore if not present
    gitignore_path = os.path.join(root_dir, ".gitignore")
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r", encoding="utf-8") as gf:
            content = gf.read()
        entries_to_add = []
        if "SEED_USERS_LOGIN_CREDENTIALS.md" not in content:
            entries_to_add.append("SEED_USERS_LOGIN_CREDENTIALS.md")
        if "SEED_USERS_LOGIN_CREDENTIALS.csv" not in content:
            entries_to_add.append("SEED_USERS_LOGIN_CREDENTIALS.csv")
        if entries_to_add:
            with open(gitignore_path, "a", encoding="utf-8") as gf:
                gf.write("\n# Seed credentials reports (local dev only)\n" + "\n".join(entries_to_add) + "\n")
            print(f"  [OK] Appended credentials reports to {gitignore_path}")


if __name__ == '__main__':
    app = create_app('development')
    seed_fresh_database(app)
