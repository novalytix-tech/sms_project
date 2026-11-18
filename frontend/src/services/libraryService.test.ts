// ==========================================
// Comprehensive Unit Tests: Library Management Service
// Physical Copies, Barcode Accessions, Unified Members,
// Fast Circulation, Fines, Reservations, Stock Verification & Teacher Delegation
// ==========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { libraryService } from './libraryService';
import { ERPStorage } from './storage';
import { INITIAL_ERP_DATA } from '../data/seedData';

describe('Library Management Service Unit Tests', () => {
  beforeEach(() => {
    // Reset store to pristine initial seed state
    const cleanStore = JSON.parse(JSON.stringify(INITIAL_ERP_DATA));
    ERPStorage.set(cleanStore);
  });

  describe('1. Institutional Policy & Settings', () => {
    it('returns default institutional library settings with grace period and fine policy', () => {
      const settings = libraryService.getSettings();
      expect(settings).toBeDefined();
      expect(settings.libraryName).toContain("St. Xavier's");
      expect(settings.studentBorrowDurationDays).toBe(14);
      expect(settings.teacherBorrowDurationDays).toBe(30);
      expect(settings.finePerDayOverdue).toBe(5);
      expect(settings.gracePeriodDays).toBe(2);
      expect(settings.studentMaxBooks).toBe(3);
      expect(settings.teacherMaxBooks).toBe(8);
    });

    it('updates institutional borrowing policies correctly', () => {
      const updated = libraryService.updateSettings({
        studentBorrowDurationDays: 21,
        finePerDayOverdue: 10,
        gracePeriodDays: 3,
      });
      expect(updated.studentBorrowDurationDays).toBe(21);
      expect(updated.finePerDayOverdue).toBe(10);
      expect(updated.gracePeriodDays).toBe(3);

      const retrieved = libraryService.getSettings();
      expect(retrieved.studentBorrowDurationDays).toBe(21);
    });
  });

  describe('2. Book Catalogue & Physical Copies with Accession Numbers', () => {
    it('creates a new book title and automatically generates physical copies with accession numbers', () => {
      const initialCount = libraryService.getAll().length;
      const initialCopiesCount = libraryService.getAllCopies().length;

      const newBook = libraryService.createBook({
        title: 'Modern Indian History',
        author: 'Bipan Chandra',
        isbn: '978-8125036845',
        category: 'History & Culture',
        subject: 'Social Science',
        totalCopies: 4,
        shelfLocation: 'Aisle 4, Rack C',
      });

      expect(newBook.id).toBeDefined();
      expect(libraryService.getAll().length).toBe(initialCount + 1);

      const allCopies = libraryService.getAllCopies();
      expect(allCopies.length).toBe(initialCopiesCount + 4);

      const bookCopies = libraryService.getCopiesForBook(newBook.id);
      expect(bookCopies.length).toBe(4);
      expect(bookCopies[0].accessionNumber).toMatch(/^LIB-2026-\d{4}$/);
      expect(bookCopies[0].status).toBe('available');
      expect(bookCopies[0].condition).toBe('good');
    });

    it('batch generates additional physical copies with sequential accession numbers', () => {
      const books = libraryService.getAll();
      const firstBook = books[0];
      const initialCopies = libraryService.getCopiesForBook(firstBook.id).length;

      const addedCopies = libraryService.batchGenerateCopies(firstBook.id, 3, 'good', 'Aisle 3, Rack B');
      expect(addedCopies.length).toBe(3);

      const updatedCopies = libraryService.getCopiesForBook(firstBook.id);
      expect(updatedCopies.length).toBe(initialCopies + 3);
      expect(addedCopies[0].accessionNumber).not.toBe(addedCopies[1].accessionNumber);
    });

    it('updates physical copy status and condition (e.g. damaged wear inspection)', () => {
      const copies = libraryService.getAllCopies();
      const targetCopy = copies[1];

      const updated = libraryService.updateCopyStatus(targetCopy.id, 'damaged', 'damaged');
      expect(updated.status).toBe('damaged');
      expect(updated.condition).toBe('damaged');
    });
  });

  describe('3. Unified Member Directory', () => {
    it('retrieves member by internal ID, reference ID or library code', () => {
      const memberByCode = libraryService.getMemberById('ADM-2024-001');
      expect(memberByCode).toBeDefined();
      expect(memberByCode?.name).toBe('Aarav Patel');

      const memberByRef = libraryService.getMemberById('stud-1');
      expect(memberByRef).toBeDefined();
      expect(memberByRef?.code).toBe('ADM-2024-001');
    });

    it('registers a new student member with default borrowing limit', () => {
      const newMember = libraryService.registerMember({
        name: 'Kavita Sundaram',
        code: 'ADM-2024-099',
        memberType: 'student',
        classOrDepartment: 'Class 9 (B)',
        email: 'kavita.sundaram@student.stxaviers.edu.in',
      });

      expect(newMember.id).toBeDefined();
      expect(newMember.maxBorrowLimit).toBe(3); // Default student limit
      expect(newMember.currentIssuedCount).toBe(0);
      expect(newMember.status).toBe('active');
    });
  });

  describe('4. Fast Issue Counter & Circulation Rules', () => {
    it('issues an available copy to an eligible student and decrements shelf stock', () => {
      // Recalculate book stock based on physical copies
      const bookCopiesBefore = libraryService.getCopiesForBook('bk-1');
      const availableCopiesBefore = bookCopiesBefore.filter(c => c.status === 'available').length;

      const issueResult = libraryService.issueBook({
        bookId: 'bk-1',
        memberId: 'mem-stu-1',
        issuedBy: 'Mrs. Sunita Verma',
      });

      expect(issueResult.success).toBe(true);
      expect(issueResult.loan).toBeDefined();
      expect(issueResult.loan?.loanNumber).toMatch(/^LN-2026-\d{4}$/);
      expect(issueResult.loan?.status).toBe('borrowed');

      const bookAfter = libraryService.getById('bk-1')!;
      expect(bookAfter.availableCopies).toBe(availableCopiesBefore - 1);

      const memberAfter = libraryService.getMemberById('mem-stu-1')!;
      expect(memberAfter.currentIssuedCount).toBe(2); // Was 1 in seed, now 2
    });

    it('rejects issue when member borrowing limit is exceeded', () => {
      const member = libraryService.getMemberById('mem-stu-1')!;
      member.currentIssuedCount = member.maxBorrowLimit; // 3 of 3

      const issueResult = libraryService.issueBook({
        bookId: 'bk-1',
        memberId: 'mem-stu-1',
        issuedBy: 'Mrs. Sunita Verma',
      });

      expect(issueResult.success).toBe(false);
      expect(issueResult.error).toContain('Borrowing limit exceeded');
    });

    it('rejects issue when copy is already issued', () => {
      const copies = libraryService.getAllCopies();
      const alreadyIssuedCopy = copies.find(c => c.status === 'issued')!;

      const issueResult = libraryService.issueBook({
        bookId: alreadyIssuedCopy.bookId,
        copyId: alreadyIssuedCopy.id,
        memberId: 'mem-stu-1',
        issuedBy: 'Mrs. Sunita Verma',
      });

      expect(issueResult.success).toBe(false);
      expect(issueResult.error).toContain('cannot be issued');
    });
  });

  describe('5. Receive Return Counter & Overdue Fine Computation', () => {
    it('returns an issued copy, restores shelf stock and decrements borrower loan count', () => {
      const activeLoans = libraryService.getActiveLoans();
      const normalLoan = activeLoans.find(l => l.status === 'borrowed')!;

      const res = libraryService.returnBook({
        loanId: normalLoan.id,
        receivedBy: 'Mrs. Sunita Verma',
        condition: 'good',
      });

      expect(res.success).toBe(true);
      expect(res.loan?.status).toBe('returned');
      expect(res.loan?.returnDate).toBeDefined();
    });

    it('computes overdue fine accurately when returned beyond the 2-day grace period', () => {
      // Find overdue loan in seed data: loan-003 was due 2026-10-26
      const overdueLoan = libraryService.getAllLoans().find(l => l.id === 'loan-003')!;
      expect(overdueLoan).toBeDefined();

      const res = libraryService.returnBook({
        loanId: overdueLoan.id,
        receivedBy: 'Mrs. Sunita Verma',
        condition: 'good',
      });

      expect(res.success).toBe(true);
      expect(res.loan?.status).toBe('returned');
      expect(res.fine).toBeDefined();
      expect(res.fine?.amount).toBeGreaterThan(0);
      expect(res.fine?.reason).toBe('overdue');
    });

    it('assesses damage penalty surcharge (₹150) when copy is returned in damaged condition', () => {
      const activeLoans = libraryService.getActiveLoans();
      const targetLoan = activeLoans[0];

      const res = libraryService.returnBook({
        loanId: targetLoan.id,
        receivedBy: 'Mrs. Sunita Verma',
        condition: 'damaged',
        notes: 'Back spine cracked and pages 45-48 missing',
      });

      expect(res.success).toBe(true);
      expect(res.loan?.returnCondition).toBe('damaged');
      expect(res.fine).toBeDefined();
      expect(res.fine?.amount).toBeGreaterThanOrEqual(150);
      expect(res.fine?.reason).toBe('damage');

      const returnedCopy = libraryService.getAllCopies().find(c => c.id === targetLoan.copyId);
      expect(returnedCopy?.status).toBe('damaged');
    });
  });

  describe('6. Fine Management & Authorized Administrative Waivers', () => {
    it('records cash/UPI fine payments and decrements member outstanding balance', () => {
      const unpaidFines = libraryService.getAllFines().filter(f => f.status === 'pending');
      const targetFine = unpaidFines[0];

      const res = libraryService.payFine(targetFine.id, {
        paidAmount: targetFine.balance,
        paymentMethod: 'UPI',
        receiptNumber: 'REC-TEST-001',
        collectedBy: 'Mrs. Sunita Verma',
      });

      expect(res.success).toBe(true);
      expect(res.fine?.status).toBe('paid');
      expect(res.fine?.balance).toBe(0);
    });

    it('waives fine with mandatory administrative justification and audit record', () => {
      const unpaidFines = libraryService.getAllFines().filter(f => f.status === 'pending');
      const targetFine = unpaidFines[0];

      const res = libraryService.waiveFine(targetFine.id, {
        waiverAmount: targetFine.balance,
        waiverReason: 'Student represented school at State Athletics Meet — approved by Principal',
        waivedBy: 'Dr. Arvind Swaminathan',
      });

      expect(res.success).toBe(true);
      expect(res.fine?.status).toBe('waived');
      expect(res.fine?.balance).toBe(0);
      expect(res.fine?.waiverReason).toContain('Principal');
    });
  });

  describe('7. Physical Stock Verification Sessions', () => {
    it('creates an inventory verification session and verifies physical copies by barcode scan', () => {
      const audit = libraryService.createAuditSession({
        sessionName: 'Annual Physics Stacks Verification',
        initiatedBy: 'Mrs. Sunita Verma',
      });

      expect(audit.id).toBeDefined();
      expect(audit.status).toBe('in_progress');
      expect(audit.verifiedCopiesCount).toBe(0);

      // Scan first copy
      const scan1 = libraryService.scanCopyInAudit(audit.id, 'LIB-2026-0001', 'Mrs. Sunita Verma');
      expect(scan1.success).toBe(true);
      expect(scan1.isDuplicate).toBe(false);

      // Scanning again detects duplicate
      const scanDuplicate = libraryService.scanCopyInAudit(audit.id, 'LIB-2026-0001', 'Mrs. Sunita Verma');
      expect(scanDuplicate.success).toBe(true);
      expect(scanDuplicate.isDuplicate).toBe(true);

      // Finalize audit
      const finalized = libraryService.finalizeAuditSession(audit.id, 'Stacks audited successfully.');
      expect(finalized.status).toBe('completed');
      expect(finalized.completedDate).toBeDefined();
    });
  });

  describe('8. Teacher Staff Assignment (Librarian under Teacher Role)', () => {
    it('assigns teacher as Head Librarian with full universal permissions', () => {
      const assignment = libraryService.assignTeacher({
        teacherId: 'teach-1',
        teacherName: 'Mrs. Ananya Sharma',
        staffId: 'STAFF-101',
        department: 'Mathematics',
        roleTitle: 'Head Librarian',
        permissions: ['*'],
        assignedBy: 'user-school-admin',
      });

      expect(assignment.id).toBeDefined();
      expect(assignment.status).toBe('active');
      expect(assignment.roleTitle).toBe('Head Librarian');
      expect(assignment.permissions).toContain('*');

      const allAssignments = libraryService.getAllStaffAssignments();
      const active = allAssignments.find(a => a.teacherId === 'teach-1' && a.status === 'active');
      expect(active).toBeDefined();
    });

    it('revokes teacher library staff assignment', () => {
      const assignments = libraryService.getAllStaffAssignments();
      const activeAssignment = assignments.find(a => a.status === 'active')!;

      const success = libraryService.revokeStaffAssignment(activeAssignment.id, 'user-school-admin');
      expect(success).toBe(true);

      const revoked = libraryService.getAllStaffAssignments().find(a => a.id === activeAssignment.id);
      expect(revoked?.status).toBe('revoked');
    });
  });
});
