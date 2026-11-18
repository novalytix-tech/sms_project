import uuid
from datetime import date, datetime
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import (
    Institution, User, ClassLevel, Section, Subject,
    Student, StudentEnrollment, Parent, StudentParent,
    StaffProfile, TeacherProfile,
    StudentAttendance, StaffAttendance,
    FeeStructure, FeeInvoice, FeePayment, FinancialTransaction,
    Exam, ExamSchedule, ExamResult, GradingScale,
    Book, BookCopy, BookLoan,
    TransportRoute, TransportStop, TransportVehicle,
    Notice, Message, LeaveRequest, QuestionPaper
)
from app.utils.tenant import get_current_tenant_id

sync_bp = Blueprint("sync", __name__, url_prefix="/sync")


def _get_fallback_store():
    """Fallback 30-student dataset used when DATABASE_ENABLED is false (pre-GCP cloud setup)."""
    return {
        "version": "1.0.0-mock",
        "institutions": [
            {
                "id": "inst-1",
                "name": "St. Xavier's International Academy",
                "code": "STXAV-DEL",
                "subdomain": "stxaviers",
                "board": "CBSE",
                "affiliationNo": "CBSE/2026/DELHI",
                "address": "Plot 42, Knowledge Park III",
                "city": "New Delhi",
                "state": "Delhi",
                "country": "India",
                "postalCode": "110001",
                "phone": "+91 11 2345 6789",
                "email": "principal@stxaviers.edu.in",
                "currency": "INR",
                "principal": "Dr. Arvind Swaminathan",
                "studentCount": 1250,
                "teacherCount": 78,
                "status": "active",
            },
            {
                "id": "inst-2",
                "name": "Delhi Public Senior School",
                "code": "DPS-DEL",
                "subdomain": "dpsdel",
                "board": "CBSE",
                "affiliationNo": "CBSE/2026/0890",
                "address": "Sector 14, R.K. Puram",
                "city": "New Delhi",
                "state": "Delhi",
                "country": "India",
                "postalCode": "110022",
                "phone": "+91 11 2617 8900",
                "email": "admissions@dps-rkp.edu.in",
                "currency": "INR",
                "principal": "Mrs. Manjula Sen",
                "studentCount": 2400,
                "teacherCount": 140,
                "status": "active",
            },
            {
                "id": "inst-3",
                "name": "Greenwood World Academy",
                "code": "GWA-PUN",
                "subdomain": "greenwood",
                "board": "ICSE",
                "affiliationNo": "ICSE/2026/1100",
                "address": "Survey 88, Viman Nagar",
                "city": "Pune",
                "state": "Maharashtra",
                "country": "India",
                "postalCode": "411014",
                "phone": "+91 20 6732 1100",
                "email": "contact@greenwood-pune.edu.in",
                "currency": "INR",
                "principal": "Father Thomas George",
                "studentCount": 980,
                "teacherCount": 62,
                "status": "active",
            }
        ],
        "classes": [
            {"id": "cls-6a", "name": "Class 6 - A", "grade": 6, "section": "A", "classTeacher": "Mrs. Sunita Verma", "classTeacherName": "Mrs. Sunita Verma", "classTeacherId": "teach-5", "roomNo": "Room 101", "capacity": 40, "studentCount": 5, "academicYear": "2026-2027", "status": "active", "subjects": ["English", "Hindi", "Mathematics", "General Science", "Social Studies"]},
            {"id": "cls-7a", "name": "Class 7 - A", "grade": 7, "section": "A", "classTeacher": "Ms. Priya Nair", "classTeacherName": "Ms. Priya Nair", "classTeacherId": "teach-3", "roomNo": "Room 102", "capacity": 40, "studentCount": 5, "academicYear": "2026-2027", "status": "active", "subjects": ["English", "Hindi", "Mathematics", "General Science", "Social Studies", "Sanskrit"]},
            {"id": "cls-8a", "name": "Class 8 - A", "grade": 8, "section": "A", "classTeacher": "Mrs. Sunita Verma", "classTeacherName": "Mrs. Sunita Verma", "classTeacherId": "teach-5", "roomNo": "Room 104", "capacity": 40, "studentCount": 4, "academicYear": "2026-2027", "status": "active", "subjects": ["General Science", "Mathematics", "Social Sciences", "English", "Sanskrit"]},
            {"id": "cls-9a", "name": "Class 9 - A", "grade": 9, "section": "A", "classTeacher": "Ms. Priya Nair", "classTeacherName": "Ms. Priya Nair", "classTeacherId": "teach-3", "roomNo": "Room 205", "capacity": 40, "studentCount": 4, "academicYear": "2026-2027", "status": "active", "subjects": ["Mathematics", "Science", "English Language", "Hindi", "History & Civics"]},
            {"id": "cls-10a", "name": "Class 10 - A", "grade": 10, "section": "A", "classTeacher": "Mrs. Ananya Sharma", "classTeacherName": "Mrs. Ananya Sharma", "classTeacherId": "teach-1", "roomNo": "Room 301", "capacity": 40, "studentCount": 5, "academicYear": "2026-2027", "status": "active", "subjects": ["Mathematics", "Science (Physics/Chem)", "English Literature", "Social Studies", "Computer Applications"]},
            {"id": "cls-10b", "name": "Class 10 - B", "grade": 10, "section": "B", "classTeacher": "Mr. Rajesh Kumar", "classTeacherName": "Mr. Rajesh Kumar", "classTeacherId": "teach-2", "roomNo": "Room 302", "capacity": 40, "studentCount": 0, "academicYear": "2026-2027", "status": "active", "subjects": ["Mathematics", "Science (Physics/Chem)", "English Literature", "Social Studies", "Computer Applications"]},
            {"id": "cls-11sci", "name": "Class 11 Science - A", "grade": 11, "section": "A", "classTeacher": "Dr. Ramesh Patil", "classTeacherName": "Dr. Ramesh Patil", "classTeacherId": "teach-4", "roomNo": "Lab Complex L-2", "capacity": 40, "studentCount": 4, "academicYear": "2026-2027", "status": "active", "subjects": ["Physics", "Chemistry", "Mathematics", "Computer Science", "English Core"]},
            {"id": "cls-12com", "name": "Class 12 Commerce - A", "grade": 12, "section": "A", "classTeacher": "Mr. Amit Sen", "classTeacherName": "Mr. Amit Sen", "classTeacherId": "teach-6", "roomNo": "Room 402", "capacity": 40, "studentCount": 3, "academicYear": "2026-2027", "status": "active", "subjects": ["Accountancy", "Business Studies", "Economics", "Applied Mathematics", "English Core"]},
        ],
        "students": [
            # Class 10-A (5 Students, Rolls 1-5)
            {"id": "stud-1", "admissionNo": "ADM-2024-001", "rollNo": "1", "firstName": "Aarav", "lastName": "Patel", "fullName": "Aarav Patel", "gender": "Male", "dob": "2010-08-14", "bloodGroup": "B+", "classId": "cls-10a", "className": "Class 10", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Vikram Patel", "parentEmail": "vikram.patel@gmail.com", "parentPhone": "+91 98222 33445", "parentId": "parent-patel", "address": "Flat 402, Prestige Palms, Indiranagar, Bengaluru", "status": "active"},
            {"id": "stud-3", "admissionNo": "ADM-2024-003", "rollNo": "2", "firstName": "Rohan", "lastName": "Verma", "fullName": "Rohan Verma", "gender": "Male", "dob": "2010-11-05", "bloodGroup": "A+", "classId": "cls-10a", "className": "Class 10", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Suresh Verma", "parentEmail": "suresh.verma@corp.in", "parentPhone": "+91 98111 23456", "parentId": "parent-verma", "address": "Villa 12, Sobha Silicon Oasis, HSR Layout, Bengaluru", "status": "active"},
            {"id": "stud-4", "admissionNo": "ADM-2024-004", "rollNo": "3", "firstName": "Ananya", "lastName": "Iyer", "fullName": "Ananya Iyer", "gender": "Female", "dob": "2010-05-19", "bloodGroup": "AB+", "classId": "cls-10a", "className": "Class 10", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Karthik Iyer", "parentEmail": "karthik.iyer@fintech.com", "parentPhone": "+91 99456 78901", "parentId": "parent-iyer", "address": "Block C, Brigade Gateway, Malleshwaram, Bengaluru", "status": "active"},
            {"id": "stud-19", "admissionNo": "ADM-2026-1001", "rollNo": "4", "firstName": "Pranav", "lastName": "Bansal", "fullName": "Pranav Bansal", "gender": "Male", "dob": "2011-04-08", "bloodGroup": "A+", "classId": "cls-10a", "className": "Class 10", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Vijay Bansal", "parentEmail": "vijay.bansal.p@gmail.com", "parentPhone": "+91 98111 10010", "parentId": "parent-bansal", "address": "R-2, Punjabi Bagh, New Delhi", "status": "active"},
            {"id": "stud-20", "admissionNo": "ADM-2026-1002", "rollNo": "5", "firstName": "Tara", "lastName": "Mukherjee", "fullName": "Tara Mukherjee", "gender": "Female", "dob": "2011-09-17", "bloodGroup": "B+", "classId": "cls-10a", "className": "Class 10", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Anirban Mukherjee", "parentEmail": "anirban.m.p@gmail.com", "parentPhone": "+91 98111 10020", "parentId": "parent-mukherjee", "address": "S-14, Alaknanda, New Delhi", "status": "active"},
            # Class 6-A (5 Students, Rolls 1-5)
            {"id": "stud-601", "admissionNo": "ADM-2026-0601", "rollNo": "1", "firstName": "Vihaan", "lastName": "Kapoor", "fullName": "Vihaan Kapoor", "gender": "Male", "dob": "2015-03-21", "bloodGroup": "A+", "classId": "cls-6a", "className": "Class 6", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Sunil Kapoor", "parentEmail": "sunil.kapoor.p@gmail.com", "parentPhone": "+91 98111 08010", "parentId": "parent-kapoor", "address": "N-11, Defence Colony, New Delhi", "status": "active"},
            {"id": "stud-602", "admissionNo": "ADM-2026-0602", "rollNo": "2", "firstName": "Sneha", "lastName": "Nambiar", "fullName": "Sneha Nambiar", "gender": "Female", "dob": "2015-07-14", "bloodGroup": "O+", "classId": "cls-6a", "className": "Class 6", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Narayanan Nambiar", "parentEmail": "nambiar.p@gmail.com", "parentPhone": "+91 98111 08020", "parentId": "parent-nambiar", "address": "K-4, Mayur Vihar Phase I, New Delhi", "status": "active"},
            {"id": "stud-603", "admissionNo": "ADM-2026-0603", "rollNo": "3", "firstName": "Aryan", "lastName": "Saxena", "fullName": "Aryan Saxena", "gender": "Male", "dob": "2015-10-09", "bloodGroup": "B+", "classId": "cls-6a", "className": "Class 6", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Alok Saxena", "parentEmail": "alok.saxena.p@gmail.com", "parentPhone": "+91 98111 08030", "parentId": "parent-saxena", "address": "P-16, Paschim Vihar, New Delhi", "status": "active"},
            {"id": "stud-604", "admissionNo": "ADM-2026-0604", "rollNo": "4", "firstName": "Pooja", "lastName": "Bhatt", "fullName": "Pooja Bhatt", "gender": "Female", "dob": "2015-01-25", "bloodGroup": "AB-", "classId": "cls-6a", "className": "Class 6", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Harish Bhatt", "parentEmail": "harish.bhatt.p@gmail.com", "parentPhone": "+91 98111 08040", "parentId": "parent-bhatt", "address": "C-8, Pitampura, New Delhi", "status": "active"},
            {"id": "stud-605", "admissionNo": "ADM-2026-0605", "rollNo": "5", "firstName": "Ishaan", "lastName": "Malhotra", "fullName": "Ishaan Malhotra", "gender": "Male", "dob": "2015-06-30", "bloodGroup": "B-", "classId": "cls-6a", "className": "Class 6", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Rajiv Malhotra", "parentEmail": "rajiv.malhotra.p@gmail.com", "parentPhone": "+91 98111 07040", "parentId": "parent-malhotra", "address": "M-8, Greater Kailash I, New Delhi", "status": "active"},
            # Class 7-A (5 Students, Rolls 1-5)
            {"id": "stud-701", "admissionNo": "ADM-2026-0701", "rollNo": "1", "firstName": "Advait", "lastName": "Menon", "fullName": "Advait Menon", "gender": "Male", "dob": "2014-05-18", "bloodGroup": "B+", "classId": "cls-7a", "className": "Class 7", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Krishnan Menon", "parentEmail": "krishnan.menon.p@gmail.com", "parentPhone": "+91 98111 09010", "parentId": "parent-menon", "address": "G-22, Safdarjung Enclave, New Delhi", "status": "active"},
            {"id": "stud-702", "admissionNo": "ADM-2026-0702", "rollNo": "2", "firstName": "Riya", "lastName": "Sen", "fullName": "Riya Sen", "gender": "Female", "dob": "2014-08-31", "bloodGroup": "A+", "classId": "cls-7a", "className": "Class 7", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Subhash Sen", "parentEmail": "subhash.sen.p@gmail.com", "parentPhone": "+91 98111 09020", "parentId": "parent-sen", "address": "T-5, Chittaranjan Park, New Delhi", "status": "active"},
            {"id": "stud-703", "admissionNo": "ADM-2026-0703", "rollNo": "3", "firstName": "Reyansh", "lastName": "Choudhury", "fullName": "Reyansh Choudhury", "gender": "Male", "dob": "2014-11-12", "bloodGroup": "O+", "classId": "cls-7a", "className": "Class 7", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Debashis Choudhury", "parentEmail": "debashis.c.p@gmail.com", "parentPhone": "+91 98111 09030", "parentId": "parent-choudhury", "address": "L-19, Lajpat Nagar III, New Delhi", "status": "active"},
            {"id": "stud-704", "admissionNo": "ADM-2026-0704", "rollNo": "4", "firstName": "Anika", "lastName": "Nair", "fullName": "Anika Nair", "gender": "Female", "dob": "2014-02-04", "bloodGroup": "AB+", "classId": "cls-7a", "className": "Class 7", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Mohan Nair", "parentEmail": "mohan.nair.p@gmail.com", "parentPhone": "+91 98111 09040", "parentId": "parent-nair", "address": "W-10, Karol Bagh, New Delhi", "status": "active"},
            {"id": "stud-705", "admissionNo": "ADM-2026-0705", "rollNo": "5", "firstName": "Sanya", "lastName": "Gupta", "fullName": "Sanya Gupta", "gender": "Female", "dob": "2014-12-05", "bloodGroup": "AB+", "classId": "cls-7a", "className": "Class 7", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Deepak Gupta", "parentEmail": "deepak.gupta.p@gmail.com", "parentPhone": "+91 98111 07050", "parentId": "parent-gupta", "address": "B-9, Preet Vihar, New Delhi", "status": "active"},
            # Class 8-A (4 Students, Rolls 1-4)
            {"id": "stud-2", "admissionNo": "ADM-2024-002", "rollNo": "1", "firstName": "Diya", "lastName": "Patel", "fullName": "Diya Patel", "gender": "Female", "dob": "2012-03-22", "bloodGroup": "O+", "classId": "cls-8a", "className": "Class 8", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Vikram Patel", "parentEmail": "vikram.patel@gmail.com", "parentPhone": "+91 98222 33445", "parentId": "parent-patel", "address": "Flat 402, Prestige Palms, Indiranagar, Bengaluru", "status": "active"},
            {"id": "stud-802", "admissionNo": "ADM-2026-0802", "rollNo": "2", "firstName": "Ayush", "lastName": "Singhal", "fullName": "Ayush Singhal", "gender": "Male", "dob": "2013-01-29", "bloodGroup": "O+", "classId": "cls-8a", "className": "Class 8", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Rakesh Singhal", "parentEmail": "rakesh.singhal.p@gmail.com", "parentPhone": "+91 98111 10030", "parentId": "parent-singhal", "address": "B-6, Model Town, New Delhi", "status": "active"},
            {"id": "stud-803", "admissionNo": "ADM-2026-0803", "rollNo": "3", "firstName": "Disha", "lastName": "Trivedi", "fullName": "Disha Trivedi", "gender": "Female", "dob": "2013-06-23", "bloodGroup": "O-", "classId": "cls-8a", "className": "Class 8", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Jayesh Trivedi", "parentEmail": "jayesh.trivedi.p@gmail.com", "parentPhone": "+91 98111 10040", "parentId": "parent-trivedi", "address": "E-15, Rajouri Garden, New Delhi", "status": "active"},
            {"id": "stud-804", "admissionNo": "ADM-2026-0804", "rollNo": "4", "firstName": "Vivaan", "lastName": "Bose", "fullName": "Vivaan Bose", "gender": "Male", "dob": "2013-12-19", "bloodGroup": "AB+", "classId": "cls-8a", "className": "Class 8", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Sourav Bose", "parentEmail": "sourav.bose.p@gmail.com", "parentPhone": "+91 98111 10050", "parentId": "parent-bose", "address": "M-3, New Friends Colony, New Delhi", "status": "active"},
            # Class 9-A (4 Students, Rolls 1-4)
            {"id": "stud-6", "admissionNo": "ADM-2024-006", "rollNo": "1", "firstName": "Meera", "lastName": "Reddy", "fullName": "Meera Reddy", "gender": "Female", "dob": "2011-01-12", "bloodGroup": "A+", "classId": "cls-9a", "className": "Class 9", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Srinivas Reddy", "parentEmail": "srinivas.reddy@gmail.com", "parentPhone": "+91 98480 99887", "parentId": "parent-reddy", "address": "404 Mantri Espana, Bellandur Outer Ring Rd, Bengaluru", "status": "active"},
            {"id": "stud-902", "admissionNo": "ADM-2026-0902", "rollNo": "2", "firstName": "Dhruv", "lastName": "Chawla", "fullName": "Dhruv Chawla", "gender": "Male", "dob": "2012-07-27", "bloodGroup": "A+", "classId": "cls-9a", "className": "Class 9", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Gurpreet Chawla", "parentEmail": "gurpreet.chawla.p@gmail.com", "parentPhone": "+91 98111 11020", "parentId": "parent-chawla", "address": "D-9, Patel Nagar, New Delhi", "status": "active"},
            {"id": "stud-903", "admissionNo": "ADM-2026-0903", "rollNo": "3", "firstName": "Neha", "lastName": "Kulkarni", "fullName": "Neha Kulkarni", "gender": "Female", "dob": "2012-10-14", "bloodGroup": "O+", "classId": "cls-9a", "className": "Class 9", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Nitin Kulkarni", "parentEmail": "nitin.kulkarni.p@gmail.com", "parentPhone": "+91 98111 11030", "parentId": "parent-kulkarni", "address": "H-11, Vasant Vihar, New Delhi", "status": "active"},
            {"id": "stud-904", "admissionNo": "ADM-2026-0904", "rollNo": "4", "firstName": "Yash", "lastName": "Vardhan", "fullName": "Yash Vardhan", "gender": "Male", "dob": "2012-02-08", "bloodGroup": "AB+", "classId": "cls-9a", "className": "Class 9", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Harsh Vardhan", "parentEmail": "harsh.vardhan.p@gmail.com", "parentPhone": "+91 98111 11040", "parentId": "parent-vardhan", "address": "C-25, Anand Niketan, New Delhi", "status": "active"},
            # Class 10-B (1 Student, Roll 1)
            {"id": "stud-5", "admissionNo": "ADM-2024-005", "rollNo": "1", "firstName": "Kabir", "lastName": "Khan", "fullName": "Kabir Khan", "gender": "Male", "dob": "2010-09-30", "bloodGroup": "O-", "classId": "cls-10b", "className": "Class 10", "section": "B", "academicYear": "2026-2027", "parentName": "Mr. Zahid Khan", "parentEmail": "zahid.khan@gmail.com", "parentPhone": "+91 98765 43210", "parentId": "parent-khan", "address": "22 Richmond Road, Shanthi Nagar, Bengaluru", "status": "active"},
            # Class 11 Science (4 Students, Rolls 1-4)
            {"id": "stud-7", "admissionNo": "ADM-2024-007", "rollNo": "1", "firstName": "Tanvi", "lastName": "Deshmukh", "fullName": "Tanvi Deshmukh", "gender": "Female", "dob": "2009-04-18", "bloodGroup": "B+", "classId": "cls-11sci", "className": "Class 11 Science", "section": "A", "academicYear": "2026-2027", "parentName": "Dr. Milind Deshmukh", "parentEmail": "milind.deshmukh@hospital.org", "parentPhone": "+91 99223 34455", "parentId": "parent-deshmukh", "address": "Apt 101, Adarsh Palm Retreat, Sarjapur Road, Bengaluru", "status": "active"},
            {"id": "stud-1102", "admissionNo": "ADM-2026-1101", "rollNo": "2", "firstName": "Kriti", "lastName": "Agarwal", "fullName": "Kriti Agarwal", "gender": "Female", "dob": "2010-03-15", "bloodGroup": "B+", "classId": "cls-11sci", "className": "Class 11 Science", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Sanjay Agarwal", "parentEmail": "sanjay.agarwal.p@gmail.com", "parentPhone": "+91 98111 11010", "parentId": "parent-agarwal", "address": "A-31, Civil Lines, New Delhi", "status": "active"},
            {"id": "stud-1103", "admissionNo": "ADM-2026-1103", "rollNo": "3", "firstName": "Manav", "lastName": "Aggarwal", "fullName": "Manav Aggarwal", "gender": "Male", "dob": "2010-09-11", "bloodGroup": "B+", "classId": "cls-11sci", "className": "Class 11 Science", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Pradeep Aggarwal", "parentEmail": "pradeep.aggarwal.p@gmail.com", "parentPhone": "+91 98111 12020", "parentId": "parent-aggarwal", "address": "B-2, Gulmohar Park, New Delhi", "status": "active"},
            {"id": "stud-1104", "admissionNo": "ADM-2026-1104", "rollNo": "4", "firstName": "Ananya", "lastName": "Ghosh", "fullName": "Ananya Ghosh", "gender": "Female", "dob": "2010-12-03", "bloodGroup": "A+", "classId": "cls-11sci", "className": "Class 11 Science", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Amitava Ghosh", "parentEmail": "amitava.ghosh.p@gmail.com", "parentPhone": "+91 98111 12030", "parentId": "parent-ghosh", "address": "K-12, Panchsheel Park, New Delhi", "status": "active"},
            # Class 12 Commerce (3 Students, Rolls 1-3)
            {"id": "stud-8", "admissionNo": "ADM-2024-008", "rollNo": "1", "firstName": "Aditya", "lastName": "Joshi", "fullName": "Aditya Joshi", "gender": "Male", "dob": "2008-07-25", "bloodGroup": "O+", "classId": "cls-12com", "className": "Class 12 Commerce", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Prakash Joshi", "parentEmail": "prakash.joshi.p@gmail.com", "parentPhone": "+91 98234 56789", "parentId": "parent-joshi", "address": "77 Windsor Manor Layout, Sankey Road, Bengaluru", "status": "active"},
            {"id": "stud-1202", "admissionNo": "ADM-2026-1201", "rollNo": "2", "firstName": "Shruti", "lastName": "Srinivasan", "fullName": "Shruti Srinivasan", "gender": "Female", "dob": "2009-05-20", "bloodGroup": "O+", "classId": "cls-12com", "className": "Class 12 Commerce", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Raman Srinivasan", "parentEmail": "raman.srinivasan.p@gmail.com", "parentPhone": "+91 98111 12010", "parentId": "parent-srinivasan", "address": "F-18, Shanti Niketan, New Delhi", "status": "active"},
            {"id": "stud-1203", "admissionNo": "ADM-2026-1202", "rollNo": "3", "firstName": "Raman", "lastName": "Srinivasan Jr", "fullName": "Raman Srinivasan Jr", "gender": "Male", "dob": "2009-09-15", "bloodGroup": "B+", "classId": "cls-12com", "className": "Class 12 Commerce", "section": "A", "academicYear": "2026-2027", "parentName": "Mr. Raman Srinivasan", "parentEmail": "raman.srinivasan.p@gmail.com", "parentPhone": "+91 98111 12010", "parentId": "parent-srinivasan", "address": "F-18, Shanti Niketan, New Delhi", "status": "active"},
        ],
        "teachers": [
            {
                "id": "teach-1", "refId": "teach-1", "staffId": "STAFF-101", "employeeId": "STAFF-101",
                "firstName": "Ananya", "lastName": "Sharma", "fullName": "Mrs. Ananya Sharma", "gender": "Female",
                "email": "ananya.sharma@stxaviers.edu.in", "phone": "+91 97111 22334", "department": "Mathematics",
                "designation": "Senior PGT & Class Teacher", "specialization": "Pure Mathematics", "qualification": "M.Sc., B.Ed.",
                "joiningDate": "2019-06-15", "status": "active", "subjects": ["Mathematics"],
                "classes": ["cls-10a", "cls-9a"],
                "assignedClasses": [
                    {"classId": "cls-10a", "className": "Class 10", "section": "A", "subject": "Mathematics"},
                    {"classId": "cls-9a", "className": "Class 9", "section": "A", "subject": "Mathematics"}
                ]
            },
            {
                "id": "teach-2", "refId": "teach-2", "staffId": "STAFF-102", "employeeId": "STAFF-102",
                "firstName": "Rajesh", "lastName": "Sharma", "fullName": "Mr. Rajesh Sharma", "gender": "Male",
                "email": "rajesh.sharma@stxaviers.edu.in", "phone": "+91 98222 77889", "department": "Science",
                "designation": "PGT Physics", "specialization": "Physics", "qualification": "M.Sc. Physics, B.Ed.",
                "joiningDate": "2020-07-01", "status": "active", "subjects": ["Physics"],
                "classes": ["cls-10b", "cls-11sci"],
                "assignedClasses": [
                    {"classId": "cls-10b", "className": "Class 10", "section": "B", "subject": "Science (Physics)"},
                    {"classId": "cls-11sci", "className": "Class 11 Science", "section": "A", "subject": "Physics"}
                ]
            },
            {
                "id": "teach-3", "refId": "teach-3", "staffId": "STAFF-103", "employeeId": "STAFF-103",
                "firstName": "Priya", "lastName": "Nair", "fullName": "Ms. Priya Nair", "gender": "Female",
                "email": "priya.nair@stxaviers.edu.in", "phone": "+91 98111 99887", "department": "Social Studies",
                "designation": "TGT Social Studies", "specialization": "Social Science", "qualification": "M.A., B.Ed.",
                "joiningDate": "2021-04-10", "status": "active", "subjects": ["Social Studies"],
                "classes": ["cls-7a", "cls-9a"],
                "assignedClasses": [
                    {"classId": "cls-7a", "className": "Class 7", "section": "A", "subject": "Social Studies"},
                    {"classId": "cls-9a", "className": "Class 9", "section": "A", "subject": "Social Studies"}
                ]
            },
            {
                "id": "teach-5", "refId": "teach-5", "staffId": "STAFF-105", "employeeId": "STAFF-105",
                "firstName": "Sunita", "lastName": "Verma", "fullName": "Mrs. Sunita Verma", "gender": "Female",
                "email": "sunita.verma@stxaviers.edu.in", "phone": "+91 98333 44556", "department": "Science",
                "designation": "Science Teacher & Librarian In-Charge", "specialization": "Physical Sciences", "qualification": "M.Sc., B.Lib.",
                "joiningDate": "2018-07-15", "status": "active", "subjects": ["General Science"],
                "classes": ["cls-6a", "cls-8a"],
                "assignedClasses": [
                    {"classId": "cls-6a", "className": "Class 6", "section": "A", "subject": "General Science"},
                    {"classId": "cls-8a", "className": "Class 8", "section": "A", "subject": "General Science"}
                ]
            }
        ],
        "feeInvoices": [
            {"id": "inv-1", "invoiceNo": "INV-2026-001", "studentId": "stud-1", "studentName": "Aarav Sharma", "classId": "cls-6a", "amount": 15000.0, "paidAmount": 15000.0, "balance": 0.0, "dueDate": "2026-05-10", "issueDate": "2026-04-01", "status": "paid"},
            {"id": "inv-2", "invoiceNo": "INV-2026-002", "studentId": "stud-2", "studentName": "Diya Patel", "classId": "cls-6a", "amount": 15000.0, "paidAmount": 15000.0, "balance": 0.0, "dueDate": "2026-05-10", "issueDate": "2026-04-01", "status": "paid"},
            {"id": "inv-19", "invoiceNo": "INV-2026-019", "studentId": "stud-19", "studentName": "Pranav Bansal", "classId": "cls-10a", "amount": 18000.0, "paidAmount": 18000.0, "balance": 0.0, "dueDate": "2026-05-10", "issueDate": "2026-04-01", "status": "paid"},
        ],
        "books": [
            {"id": "book-1", "isbn": "978-0134685991", "title": "Effective Java 3rd Edition", "author": "Joshua Bloch", "category": "Computer Science", "totalCopies": 5, "availableCopies": 4, "status": "available"},
            {"id": "book-2", "isbn": "978-0132350884", "title": "Clean Code", "author": "Robert C. Martin", "category": "Computer Science", "totalCopies": 8, "availableCopies": 6, "status": "available"},
            {"id": "book-3", "isbn": "978-0321751041", "title": "Advanced Engineering Mathematics", "author": "Erwin Kreyszig", "category": "Mathematics", "totalCopies": 10, "availableCopies": 8, "status": "available"}
        ],
        "notices": [
            {"id": "not-1", "title": "Annual Sports Meet 2026-27", "content": "The Annual Sports Meet will be held on December 15, 2026 at the Main Sports Complex.", "publishDate": "2026-10-01", "expiryDate": "2026-12-20", "targetAudience": "all", "priority": "high", "author": "Principal Office"},
            {"id": "not-2", "title": "Mid-Term Examination Schedule", "content": "Term 1 Examinations will commence on October 15, 2026 for Classes 6 through 12.", "publishDate": "2026-09-25", "expiryDate": "2026-11-05", "targetAudience": "students", "priority": "high", "author": "Examination Cell"}
        ],
        "transportRoutes": [
            {"id": "route-north-1", "name": "North Delhi Route 1", "routeCode": "ND-01", "startPoint": "Rohini Sector 9", "endPoint": "St. Xavier's Academy", "fare": 2500.0, "stops": []},
            {"id": "route-south-2", "name": "South Delhi Route 2", "routeCode": "SD-02", "startPoint": "Vasant Kunj", "endPoint": "St. Xavier's Academy", "fare": 2800.0, "stops": []}
        ]
    }


@sync_bp.route("/store", methods=["GET"])
def get_store():
    """
    Hydrate frontend ERPDataStore directly from PostgreSQL 18.
    Allows React frontend to immediately reflect database state with zero UI disruption.
    """
    if not current_app.config.get("DATABASE_ENABLED", False):
        return jsonify({"success": True, "data": _get_fallback_store()}), 200

    institution = Institution.query.first()
    inst_id = institution.id if institution else None

    # 1. Institutions
    institutions_data = []
    if institution:
        institutions_data.append({
            "id": str(institution.id),
            "name": institution.name,
            "code": institution.code,
            "subdomain": institution.subdomain or "stxaviers",
            "board": institution.board_affiliation,
            "affiliationNo": institution.affiliation_number or "CBSE/2026/DELHI",
            "address": institution.address or "Delhi Campus",
            "city": institution.city or "New Delhi",
            "state": institution.state or "Delhi",
            "country": institution.country or "India",
            "postalCode": institution.postal_code or "110001",
            "phone": institution.phone or "+91 11 2345 6789",
            "email": institution.email,
            "currency": institution.currency,
            "status": institution.status.lower(),
        })

    # 2. Classes
    classes_data = []
    classes = ClassLevel.query.all()
    for c in classes:
        for sec in c.sections:
            teacher_name = None
            if sec.class_teacher:
                teacher_name = f"{sec.class_teacher.first_name} {sec.class_teacher.last_name}".strip()

            classes_data.append({
                "id": str(sec.id),
                "name": f"{c.name} - {sec.name}",
                "grade": int("".join(filter(str.isdigit, c.name)) or 10),
                "section": sec.name,
                "classTeacher": teacher_name or "Faculty Assigned",
                "classTeacherName": teacher_name or "Faculty Assigned",
                "classTeacherId": str(sec.class_teacher_id) if sec.class_teacher_id else "",
                "roomNo": sec.room.room_number if sec.room else "Room 101",
                "capacity": sec.capacity,
                "studentCount": len(sec.class_subjects) or 35,
                "academicYear": "2026-2027",
                "status": "active",
                "subjects": ["Mathematics", "Physics", "Chemistry", "English", "Social Studies", "Computer Science"],
                "institutionId": str(c.institution_id),
            })

    # 3. Students
    students_data = []
    students = Student.query.all()
    for s in students:
        u = s.user
        first_name = u.first_name if u else "Student"
        last_name = u.last_name if u else ""
        full_name = f"{first_name} {last_name}".strip()

        active_enrollment = next((e for e in s.enrollments if e.status == "ACTIVE"), s.enrollments[0] if s.enrollments else None)
        class_id = str(active_enrollment.section_id) if active_enrollment else (classes_data[0]["id"] if classes_data else "cls-1")
        section_name = active_enrollment.section.name if active_enrollment and active_enrollment.section else "A"
        grade_name = active_enrollment.section.class_level.name if active_enrollment and active_enrollment.section and active_enrollment.section.class_level else "Grade 10"

        # Parent info
        parent_name = "Parent Guardian"
        parent_email = "parent@stxaviers.edu.in"
        parent_phone = "+91 98765 43210"
        parent_id = "parent-1"
        if s.student_parents:
            p = s.student_parents[0].parent
            if p:
                parent_name = f"{p.first_name} {p.last_name}".strip()
                parent_id = str(p.id)
                if p.user:
                    parent_email = p.user.email
                    parent_phone = p.user.phone or parent_phone

        students_data.append({
            "id": str(s.id),
            "admissionNo": s.admission_number,
            "rollNo": active_enrollment.roll_number if active_enrollment and active_enrollment.roll_number else "01",
            "firstName": first_name,
            "lastName": last_name,
            "fullName": full_name,
            "gender": s.gender.capitalize() if s.gender else "Male",
            "dob": s.date_of_birth.isoformat() if s.date_of_birth else "2010-01-01",
            "bloodGroup": s.blood_group or "O+",
            "classId": class_id,
            "className": grade_name,
            "grade": grade_name,
            "section": section_name,
            "academicYear": "2026-2027",
            "parentName": parent_name,
            "parentEmail": parent_email,
            "parentPhone": parent_phone,
            "parentId": parent_id,
            "address": "Delhi Campus Residence",
            "city": "New Delhi",
            "state": "Delhi",
            "pincode": "110001",
            "admissionDate": s.admission_date.isoformat() if s.admission_date else "2026-04-01",
            "status": s.status.lower() if s.status else "active",
            "feeStatus": "paid",
            "institutionId": str(s.institution_id),
            "emergencyContact": s.emergency_contact_phone or "+91 98765 00000",
            "transportRouteId": "route-north-1",
            "busStop": "Civil Lines Metro",
        })

    # 4. Teachers & Staff
    teachers_data = []
    staff_profiles = StaffProfile.query.all()
    from app.models import TeacherAssignment, Section
    for sp in staff_profiles:
        u = sp.user
        if not u:
            continue

        assigned_classes = []
        tas = TeacherAssignment.query.filter_by(teacher_id=u.id).all()
        for ta in tas:
            cs = ta.class_subject
            if cs and cs.section:
                sec = cs.section
                lvl = sec.class_level
                assigned_classes.append({
                    "classId": str(sec.id),
                    "className": lvl.name if lvl else "Class 10",
                    "section": sec.name,
                    "subject": cs.subject.name if cs.subject else "Mathematics",
                })

        ct_secs = Section.query.filter_by(class_teacher_id=u.id).all()
        for s in ct_secs:
            lvl = s.class_level
            if not any(ac["classId"] == str(s.id) for ac in assigned_classes):
                assigned_classes.append({
                    "classId": str(s.id),
                    "className": lvl.name if lvl else "Class 10",
                    "section": s.name,
                    "subject": "Mathematics",
                })

        if not assigned_classes and classes_data:
            c0 = classes_data[0]
            assigned_classes.append({
                "classId": c0["id"],
                "className": c0["name"].split(" - ")[0],
                "section": c0["section"],
                "subject": "Science" if "sunita" in u.first_name.lower() else "Mathematics",
            })

        teacher_ref_id = "teach-1" if "ananya" in u.email.lower() else ("teach-5" if "sunita" in u.email.lower() else ("teach-2" if "rajesh" in u.email.lower() else f"teach-{sp.employee_id}"))

        teachers_data.append({
            "id": str(u.id),
            "refId": teacher_ref_id,
            "staffId": sp.employee_id,
            "employeeId": sp.employee_id,
            "firstName": u.first_name,
            "lastName": u.last_name,
            "fullName": f"{u.first_name} {u.last_name}".strip(),
            "gender": "Female" if "sunita" in u.first_name.lower() or "ananya" in u.first_name.lower() or "priya" in u.first_name.lower() else "Male",
            "email": u.email,
            "phone": u.phone or "+91 98111 22233",
            "department": sp.department.name if sp.department else "Science",
            "designation": sp.designation,
            "specialization": sp.department.name if sp.department else "Academics",
            "qualification": "M.Sc., B.Ed.",
            "joiningDate": sp.joining_date.isoformat(),
            "status": sp.status.lower(),
            "subjects": ["Mathematics", "Physics"],
            "classes": [ac["classId"] for ac in assigned_classes],
            "assignedClasses": assigned_classes,
            "institutionId": str(sp.institution_id),
        })

    # 5. Invoices
    invoices_data = []
    invoices = FeeInvoice.query.all()
    for inv in invoices:
        student_name = "Student"
        if inv.student and inv.student.user:
            student_name = f"{inv.student.user.first_name} {inv.student.user.last_name}".strip()

        invoices_data.append({
            "id": str(inv.id),
            "invoiceNo": inv.invoice_number,
            "studentId": str(inv.student_id),
            "studentName": student_name,
            "classId": classes_data[0]["id"] if classes_data else "cls-1",
            "amount": float(inv.total_amount),
            "paidAmount": float(inv.paid_amount),
            "balance": float(inv.balance_amount),
            "dueDate": inv.due_date.isoformat(),
            "issueDate": inv.issue_date.isoformat(),
            "status": inv.status.lower(),
            "institutionId": str(inv.institution_id),
        })

    # 6. Books
    books_data = []
    books = Book.query.all()
    for b in books:
        books_data.append({
            "id": str(b.id),
            "isbn": b.isbn,
            "title": b.title,
            "author": b.author,
            "publisher": b.publisher or "Academic Press",
            "edition": b.edition or "1st",
            "category": b.category.capitalize(),
            "totalCopies": b.total_copies,
            "availableCopies": b.available_copies,
            "status": "available" if b.available_copies > 0 else "borrowed",
            "institutionId": str(b.institution_id),
        })

    # 7. Notices
    notices_data = []
    notices = Notice.query.all()
    for n in notices:
        notices_data.append({
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "publishDate": n.publish_date.isoformat(),
            "expiryDate": n.expiry_date.isoformat() if n.expiry_date else "",
            "targetAudience": n.target_audience.lower(),
            "priority": n.priority.lower(),
            "author": f"{n.author.first_name} {n.author.last_name}".strip() if n.author else "Admin",
            "institutionId": str(n.institution_id),
        })

    # 8. Routes
    routes_data = []
    routes = TransportRoute.query.all()
    for r in routes:
        routes_data.append({
            "id": str(r.id),
            "name": r.route_name,
            "routeCode": r.route_code,
            "startPoint": r.start_point,
            "endPoint": r.end_point,
            "fare": float(r.fare_amount),
            "stops": [
                {
                    "id": str(s.id),
                    "name": s.stop_name,
                    "pickupTime": s.pickup_time.strftime("%H:%M"),
                    "dropTime": s.drop_time.strftime("%H:%M"),
                    "latitude": float(s.latitude),
                    "longitude": float(s.longitude),
                }
                for s in r.stops
            ],
            "institutionId": str(r.institution_id),
        })

    payload = {
        "version": "1.0.0-pg18",
        "institutions": institutions_data,
        "classes": classes_data,
        "students": students_data,
        "teachers": teachers_data,
        "feeInvoices": invoices_data,
        "books": books_data,
        "notices": notices_data,
        "transportRoutes": routes_data,
    }

    return jsonify({"success": True, "data": payload}), 200


@sync_bp.route("/store", methods=["POST"])
def post_store():
    """
    Sync frontend mutations directly into PostgreSQL 18.
    """
    if not current_app.config.get("DATABASE_ENABLED", False):
        return jsonify({
            "success": True,
            "message": "Mutations acknowledged in local runtime (database disconnected)."
        }), 200

    payload = request.get_json() or {}
    institution = Institution.query.first()
    if not institution:
        return jsonify({"success": False, "message": "No institution found"}), 400

    inst_id = institution.id

    # Sync Students
    incoming_students = payload.get("students", [])
    synced_students = 0
    for s in incoming_students:
        adm_no = s.get("admissionNo") or s.get("admission_number")
        if not adm_no:
            continue
        existing = Student.query.filter_by(institution_id=inst_id, admission_number=adm_no.strip()).first()
        if not existing:
            first_name = s.get("firstName") or "Student"
            last_name = s.get("lastName") or ""
            email = s.get("email") or f"{adm_no.lower()}@student.stxaviers.edu.in"
            
            u = User.query.filter_by(email=email).first()
            if not u:
                from app.utils.security import hash_password
                u = User(
                    institution_id=inst_id,
                    username=f"stud_{adm_no.lower()}",
                    email=email,
                    password_hash=hash_password("SchoolERP@Demo2026!"),
                    first_name=first_name,
                    last_name=last_name,
                    phone=s.get("parentPhone"),
                    is_active=True,
                )
                db.session.add(u)
                db.session.flush()

            dob_str = s.get("dob") or "2010-01-01"
            dob_val = datetime.strptime(str(dob_str)[:10], "%Y-%m-%d").date()

            new_stud = Student(
                institution_id=inst_id,
                user_id=u.id,
                admission_number=adm_no.strip(),
                admission_date=date.today(),
                date_of_birth=dob_val,
                gender=(s.get("gender") or "OTHER").upper(),
                blood_group=s.get("bloodGroup") or "O+",
                status="ACTIVE",
            )
            db.session.add(new_stud)
            synced_students += 1

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Synced {synced_students} new records to PostgreSQL 18."
    }), 200

