import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReportCardView } from './ReportCardView';
import { Student, Examination, SchoolSettings, GradingScheme } from '../../types';
import { StudentReportCardResult } from '../../services/gradingService';

const mockStudent: Student = {
  id: 'stud-test-1',
  admissionNo: 'ADM-2024-001',
  firstName: 'Aarav',
  lastName: 'Patel',
  fullName: 'Aarav Patel',
  gender: 'Male',
  dob: '2010-08-14',
  bloodGroup: 'B+',
  classId: 'cls-10a',
  className: 'Class 10',
  section: 'A',
  rollNo: '10A-01',
  academicYear: '2026-2027',
  admissionDate: '2020-04-05',
  parentName: 'Mr. Vikram Patel',
  parentPhone: '+91 98222 33445',
  parentEmail: 'vikram.patel@example.com',
  address: '42, Civil Lines, Pune, Maharashtra',
  status: 'active',
};

const mockExam: Examination = {
  id: 'exam-test-1',
  title: 'Mid-Term Summative Assessment 2026',
  examType: 'Mid-Term',
  classId: 'cls-10a',
  className: 'Class 10',
  section: 'A',
  academicYear: '2026-2027',
  startDate: '2026-09-15',
  endDate: '2026-09-24',
  status: 'completed',
  schedules: [
    {
      id: 'sch-1',
      examId: 'exam-test-1',
      subject: 'Mathematics',
      date: '2026-09-15',
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 80,
      passMarks: 28,
      roomNo: 'Exam Hall 1',
    },
    {
      id: 'sch-2',
      examId: 'exam-test-1',
      subject: 'Science',
      date: '2026-09-17',
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 80,
      passMarks: 28,
      roomNo: 'Exam Hall 1',
    },
  ],
};

const mockScheme: GradingScheme = {
  id: 'scheme-cbse-9point',
  name: 'CBSE 9-Point Grading Scale',
  description: 'Official CBSE secondary assessment scale',
  academicYear: '2026-2027',
  classScope: 'all',
  examTypeScope: 'all',
  passPercentage: 33,
  rules: [
    { grade: 'A1', minPercentage: 91, maxPercentage: 100, gradePoint: 10.0, description: 'Outstanding', isPassing: true },
    { grade: 'A2', minPercentage: 81, maxPercentage: 90, gradePoint: 9.0, description: 'Excellent', isPassing: true },
    { grade: 'B1', minPercentage: 71, maxPercentage: 80, gradePoint: 8.0, description: 'Very Good', isPassing: true },
    { grade: 'B2', minPercentage: 61, maxPercentage: 70, gradePoint: 7.0, description: 'Good', isPassing: true },
    { grade: 'C1', minPercentage: 51, maxPercentage: 60, gradePoint: 6.0, description: 'Average', isPassing: true },
    { grade: 'C2', minPercentage: 41, maxPercentage: 50, gradePoint: 5.0, description: 'Fair', isPassing: true },
    { grade: 'D', minPercentage: 33, maxPercentage: 40, gradePoint: 4.0, description: 'Pass Threshold', isPassing: true },
    { grade: 'E', minPercentage: 0, maxPercentage: 32, gradePoint: 0.0, description: 'Essential Repeat', isPassing: false },
  ],
  isDefault: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockReportData: StudentReportCardResult = {
  subjects: [
    {
      subject: 'Mathematics',
      maxMarks: 80,
      passMarks: 28,
      marksObtained: 76,
      isAbsent: false,
      grade: 'A1',
      gradePoint: 10.0,
      percentage: 95.0,
      status: 'Pass',
      remarks: 'Distinction with exemplary mathematical reasoning',
    },
    {
      subject: 'Science',
      maxMarks: 80,
      passMarks: 28,
      marksObtained: 72,
      isAbsent: false,
      grade: 'A2',
      gradePoint: 9.0,
      percentage: 90.0,
      status: 'Pass',
      remarks: 'Excellent practical concept',
    },
  ],
  totalObtained: 148,
  totalMax: 160,
  aggregatePercentage: 92.5,
  overallGrade: 'A1',
  overallGradePoint: 9.5,
  overallStatus: 'Pass',
  remarks: 'Outstanding performance',
};

const mockSettings: SchoolSettings = {
  schoolName: "St. Xavier's Senior Secondary School",
  address: '12, Cathedral Road, Civil Lines',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  phone: '+91 20 2612 3456',
  email: 'info@stxaviers.edu.in',
  website: 'www.stxaviers.edu.in',
  schoolBoard: 'Central Board of Secondary Education (CBSE)',
  affiliationNo: '2130045',
  academicYear: '2026-2027',
  principalName: 'Dr. Rajeshwar Sen, Ph.D.',
  currencyCode: 'INR',
  currencySymbol: '₹',
  dateFormat: 'DD/MM/YYYY',
  timeZone: 'Asia/Kolkata',
};

describe('ReportCardView Component', () => {
  it('renders official school credentials and student ledger dossier', () => {
    render(
      <ReportCardView
        student={mockStudent}
        exam={mockExam}
        scheme={mockScheme}
        reportData={mockReportData}
        schoolSettings={mockSettings}
      />
    );

    // School header credentials
    expect(screen.getByText("St. Xavier's Senior Secondary School")).toBeInTheDocument();
    expect(screen.getByText(/Central Board of Secondary Education \(CBSE\)/)).toBeInTheDocument();
    expect(screen.getByText('2130045')).toBeInTheDocument();

    // Student dossier
    expect(screen.getByText('AARAV PATEL')).toBeInTheDocument();
    expect(screen.getByText('ADM-2024-001')).toBeInTheDocument();
    expect(screen.getByText('10A-01')).toBeInTheDocument();
    expect(screen.getAllByText('Mr. Vikram Patel').length).toBeGreaterThanOrEqual(1);
  });

  it('renders scholastic subjects with marks, grades, and written words', () => {
    render(
      <ReportCardView
        student={mockStudent}
        exam={mockExam}
        scheme={mockScheme}
        reportData={mockReportData}
        schoolSettings={mockSettings}
      />
    );

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
    expect(screen.getByText('Seventy-Six')).toBeInTheDocument();
    expect(screen.getByText('Seventy-Two')).toBeInTheDocument();
    expect(screen.getAllByText(/148 \/ 160/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Aggregate: 92.5%/)).toBeInTheDocument();
  });

  it('renders co-scholastic domain in holistic CCE format', () => {
    render(
      <ReportCardView
        student={mockStudent}
        exam={mockExam}
        scheme={mockScheme}
        reportData={mockReportData}
        schoolSettings={mockSettings}
      />
    );

    expect(screen.getByText(/Work Education \/ ICT/)).toBeInTheDocument();
    expect(screen.getByText(/Art & Aesthetic Education/)).toBeInTheDocument();
    expect(screen.getByText(/Health & Physical Education/)).toBeInTheDocument();
    expect(screen.getByText(/Discipline & Moral Ethos/)).toBeInTheDocument();
  });

  it('renders promotional verdict and official signature blocks', () => {
    render(
      <ReportCardView
        student={mockStudent}
        exam={mockExam}
        scheme={mockScheme}
        reportData={mockReportData}
        schoolSettings={mockSettings}
        classTeacherName="Mrs. Ananya Sharma, M.Sc., B.Ed."
      />
    );

    // Promotional verdict
    expect(screen.getByText(/PROMOTED TO CLASS 11/)).toBeInTheDocument();

    // Signatures
    expect(screen.getByText('Mrs. Ananya Sharma, M.Sc., B.Ed.')).toBeInTheDocument();
    expect(screen.getByText('Dr. Rajeshwar Sen, Ph.D.')).toBeInTheDocument();
    expect(screen.getByText('Principal & Head of Institution')).toBeInTheDocument();
  });

  it('supports format toggle between holistic CCE and academic marksheet', () => {
    render(
      <ReportCardView
        student={mockStudent}
        exam={mockExam}
        scheme={mockScheme}
        reportData={mockReportData}
        schoolSettings={mockSettings}
      />
    );

    const marksheetBtn = screen.getByRole('button', { name: /Academic Marksheet/i });
    fireEvent.click(marksheetBtn);

    expect(screen.getByText('Official Academic Examination Marksheet')).toBeInTheDocument();
  });

  it('triggers onPrint handler when Print button is clicked', () => {
    const handlePrint = vi.fn();
    render(
      <ReportCardView
        student={mockStudent}
        exam={mockExam}
        scheme={mockScheme}
        reportData={mockReportData}
        schoolSettings={mockSettings}
        onPrint={handlePrint}
      />
    );

    const printBtn = screen.getByRole('button', { name: /Print Official Report Card/i });
    fireEvent.click(printBtn);

    expect(handlePrint).toHaveBeenCalledTimes(1);
  });
});
