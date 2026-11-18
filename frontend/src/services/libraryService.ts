// ==========================================
// Comprehensive Library Management Service
// Physical Copies, Barcode Accessions, Unified Members,
// Circulation Desk, Fines, Reservations, Stock Verification & Teacher Delegation
// Developed by NTS Novalytix
// ==========================================

import {
  LibraryBook,
  LibraryCopy,
  LibraryMember,
  LibraryLoan,
  LibraryReservation,
  LibraryFine,
  LibraryInventoryAudit,
  LibraryStaffAssignment,
  LibrarySettings,
} from '../types';
import { ERPStorage } from './storage';

const DEFAULT_SETTINGS: LibrarySettings = {
  institutionId: 'inst-1',
  libraryName: "St. Xavier's Central Knowledge & Learning Resource Centre",
  branchName: 'Main Senior Secondary Campus',
  studentBorrowDurationDays: 14,
  teacherBorrowDurationDays: 30,
  staffBorrowDurationDays: 14,
  studentMaxBooks: 3,
  teacherMaxBooks: 8,
  staffMaxBooks: 4,
  maxRenewals: 2,
  finePerDayOverdue: 5,
  gracePeriodDays: 2,
  lostBookPenaltyMultiplier: 1.5,
  reservationHoldHours: 48,
  accessionPrefix: 'LIB-2026',
  allowTeacherSelfCheckout: false,
  notificationUpcomingDueDays: 2,
};

function notifyStorageChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nts_erp_storage_updated'));
  }
}

export const libraryService = {
  // ==========================================
  // 1. Settings & Institutional Policy
  // ==========================================
  getSettings(): LibrarySettings {
    const store = ERPStorage.get();
    return (store as any).librarySettings || DEFAULT_SETTINGS;
  },

  updateSettings(updates: Partial<LibrarySettings>): LibrarySettings {
    const store = ERPStorage.get();
    const current = (store as any).librarySettings || DEFAULT_SETTINGS;
    const updated = { ...current, ...updates };
    (store as any).librarySettings = updated;
    ERPStorage.set(store);
    notifyStorageChange();
    return updated;
  },

  // ==========================================
  // 2. Book Catalogue
  // ==========================================
  getAll(): LibraryBook[] {
    return ERPStorage.get().books || [];
  },

  getById(id: string): LibraryBook | undefined {
    return ERPStorage.get().books?.find(b => b.id === id);
  },

  createBook(data: Partial<LibraryBook> & { title: string; author: string; isbn: string; totalCopies?: number }): LibraryBook {
    const store = ERPStorage.get();
    const bookId = `bk-${Date.now()}`;
    const totalCopies = data.totalCopies || 1;

    const newBook: LibraryBook = {
      id: bookId,
      institutionId: 'inst-1',
      title: data.title,
      subtitle: data.subtitle,
      author: data.author,
      isbn: data.isbn,
      category: data.category || 'General Reference',
      subject: data.subject || data.category || 'General',
      publisher: data.publisher || 'School Press',
      edition: data.edition || '1st Edition',
      publicationYear: data.publicationYear || 2026,
      language: data.language || 'English',
      description: data.description || '',
      shelfLocation: data.shelfLocation || 'Aisle 1, Rack A',
      rackNumber: data.rackNumber,
      rowNumber: data.rowNumber,
      totalCopies: totalCopies,
      availableCopies: totalCopies,
      issuedCopies: 0,
      damagedCopies: 0,
      lostCopies: 0,
      reservedCopies: 0,
      purchasePrice: data.purchasePrice || 450,
      status: 'available',
      issuedRecords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.books = [newBook, ...(store.books || [])];

    // Automatically create initial physical copies with Accession Numbers
    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const settings = this.getSettings();
    const prefix = settings.accessionPrefix || 'LIB-2026';
    const existingSeq = copies.length;

    for (let i = 1; i <= totalCopies; i++) {
      const copyNum = existingSeq + i;
      const accessionNumber = `${prefix}-${String(copyNum).padStart(4, '0')}`;
      const barcode = `890${String(Date.now()).slice(-6)}${String(i).padStart(3, '0')}`;
      copies.push({
        id: `copy-${bookId}-${i}`,
        bookId,
        bookTitle: newBook.title,
        isbn: newBook.isbn,
        accessionNumber,
        barcode,
        copyNumber: i,
        condition: 'good',
        status: 'available',
        shelfLocation: newBook.shelfLocation,
        acquisitionDate: new Date().toISOString().split('T')[0],
        purchasePrice: newBook.purchasePrice,
        institutionId: 'inst-1',
      });
    }

    (store as any).libraryCopies = copies;
    ERPStorage.set(store);
    notifyStorageChange();
    return newBook;
  },

  updateBook(id: string, updates: Partial<LibraryBook>): LibraryBook {
    const store = ERPStorage.get();
    const idx = (store.books || []).findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Book not found in catalogue');

    const updated = {
      ...store.books[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    store.books[idx] = updated;

    // Update title in copies if changed
    if (updates.title) {
      const copies: LibraryCopy[] = (store as any).libraryCopies || [];
      copies.forEach(c => {
        if (c.bookId === id) c.bookTitle = updates.title!;
      });
      (store as any).libraryCopies = copies;
    }

    ERPStorage.set(store);
    notifyStorageChange();
    return updated;
  },

  deleteBook(id: string): boolean {
    const store = ERPStorage.get();
    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const hasIssuedCopies = copies.some(c => c.bookId === id && c.status === 'issued');
    if (hasIssuedCopies) {
      throw new Error('Cannot delete catalogue record: One or more physical copies are currently checked out.');
    }

    store.books = (store.books || []).filter(b => b.id !== id);
    (store as any).libraryCopies = copies.filter(c => c.bookId !== id);
    ERPStorage.set(store);
    notifyStorageChange();
    return true;
  },

  // ==========================================
  // 3. Physical Copies & Accession Numbers
  // ==========================================
  getAllCopies(): LibraryCopy[] {
    return (ERPStorage.get() as any).libraryCopies || [];
  },

  getCopiesForBook(bookId: string): LibraryCopy[] {
    return this.getAllCopies().filter(c => c.bookId === bookId);
  },

  createCopy(data: {
    bookId: string;
    condition?: LibraryCopy['condition'];
    shelfLocation?: string;
    purchasePrice?: number;
  }): LibraryCopy {
    const store = ERPStorage.get();
    const book = (store.books || []).find(b => b.id === data.bookId);
    if (!book) throw new Error('Parent book record not found');

    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const bookCopies = copies.filter(c => c.bookId === data.bookId);
    const settings = this.getSettings();
    const prefix = settings.accessionPrefix || 'LIB-2026';
    const accessionNumber = `${prefix}-${String(copies.length + 1).padStart(4, '0')}`;
    const barcode = `890${String(Date.now()).slice(-6)}${String(bookCopies.length + 1).padStart(3, '0')}`;

    const newCopy: LibraryCopy = {
      id: `copy-${data.bookId}-${bookCopies.length + 1}-${Date.now().toString().slice(-4)}`,
      bookId: data.bookId,
      bookTitle: book.title,
      isbn: book.isbn,
      accessionNumber,
      barcode,
      copyNumber: bookCopies.length + 1,
      condition: data.condition || 'good',
      status: 'available',
      shelfLocation: data.shelfLocation || book.shelfLocation,
      acquisitionDate: new Date().toISOString().split('T')[0],
      purchasePrice: data.purchasePrice || book.purchasePrice,
      institutionId: 'inst-1',
    };

    copies.push(newCopy);
    (store as any).libraryCopies = copies;

    // Recalculate book stock
    this.recalculateBookStock(book.id, store);
    ERPStorage.set(store);
    notifyStorageChange();
    return newCopy;
  },

  batchGenerateCopies(bookId: string, count: number, condition: LibraryCopy['condition'] = 'good', shelfLocation?: string): LibraryCopy[] {
    const store = ERPStorage.get();
    const book = (store.books || []).find(b => b.id === bookId);
    if (!book) throw new Error('Parent book record not found');

    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const bookCopies = copies.filter(c => c.bookId === bookId);
    const settings = this.getSettings();
    const prefix = settings.accessionPrefix || 'LIB-2026';
    const newCopies: LibraryCopy[] = [];

    for (let i = 1; i <= count; i++) {
      const copyNum = bookCopies.length + i;
      const accessionNumber = `${prefix}-${String(copies.length + i).padStart(4, '0')}`;
      const barcode = `890${String(Date.now()).slice(-6)}${String(copyNum).padStart(3, '0')}`;

      const copy: LibraryCopy = {
        id: `copy-${bookId}-${copyNum}-${Date.now().toString().slice(-4)}`,
        bookId,
        bookTitle: book.title,
        isbn: book.isbn,
        accessionNumber,
        barcode,
        copyNumber: copyNum,
        condition,
        status: 'available',
        shelfLocation: shelfLocation || book.shelfLocation,
        acquisitionDate: new Date().toISOString().split('T')[0],
        purchasePrice: book.purchasePrice,
        institutionId: 'inst-1',
      };
      copies.push(copy);
      newCopies.push(copy);
    }

    (store as any).libraryCopies = copies;
    this.recalculateBookStock(book.id, store);
    ERPStorage.set(store);
    notifyStorageChange();
    return newCopies;
  },

  updateCopyStatus(copyId: string, status: LibraryCopy['status'], condition: LibraryCopy['condition']): LibraryCopy {
    const store = ERPStorage.get();
    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const copy = copies.find(c => c.id === copyId);
    if (!copy) throw new Error('Physical copy not found');

    copy.status = status;
    copy.condition = condition;

    (store as any).libraryCopies = copies;
    this.recalculateBookStock(copy.bookId, store);
    ERPStorage.set(store);
    notifyStorageChange();
    return copy;
  },

  recalculateBookStock(bookId: string, store: any) {
    const book = (store.books || []).find((b: any) => b.id === bookId);
    if (!book) return;

    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const bookCopies = copies.filter(c => c.bookId === bookId);

    book.totalCopies = bookCopies.length;
    book.availableCopies = bookCopies.filter(c => c.status === 'available').length;
    book.issuedCopies = bookCopies.filter(c => c.status === 'issued').length;
    book.damagedCopies = bookCopies.filter(c => c.status === 'damaged').length;
    book.lostCopies = bookCopies.filter(c => c.status === 'lost').length;
    book.reservedCopies = bookCopies.filter(c => c.status === 'reserved').length;
    book.status = book.availableCopies <= 0 ? 'out_of_stock' : book.availableCopies <= 2 ? 'low_stock' : 'available';
  },

  // ==========================================
  // 4. Unified Library Members Directory
  // ==========================================
  getAllMembers(): LibraryMember[] {
    return (ERPStorage.get() as any).libraryMembers || [];
  },

  getMemberById(idOrRef: string): LibraryMember | undefined {
    const members = this.getAllMembers();
    return members.find(
      m => m.id === idOrRef || m.referenceId === idOrRef || m.code.toLowerCase() === idOrRef.toLowerCase()
    );
  },

  registerMember(data: Partial<LibraryMember> & { name: string; code: string; memberType: 'student' | 'teacher' | 'staff' }): LibraryMember {
    const store = ERPStorage.get();
    const members: LibraryMember[] = (store as any).libraryMembers || [];
    const settings = this.getSettings();

    const maxLimit =
      data.maxBorrowLimit ||
      (data.memberType === 'teacher'
        ? settings.teacherMaxBooks
        : data.memberType === 'staff'
        ? settings.staffMaxBooks
        : settings.studentMaxBooks);

    const newMember: LibraryMember = {
      id: `mem-${Date.now()}`,
      institutionId: 'inst-1',
      memberType: data.memberType,
      referenceId: data.referenceId || `ref-${Date.now()}`,
      name: data.name,
      code: data.code,
      classOrDepartment: data.classOrDepartment || (data.memberType === 'student' ? 'Class 10 (A)' : 'Faculty'),
      email: data.email || `${data.code.toLowerCase()}@school.edu.in`,
      phone: data.phone || '+91 98000 00000',
      status: 'active',
      maxBorrowLimit: maxLimit,
      currentIssuedCount: 0,
      membershipStartDate: new Date().toISOString().split('T')[0],
      membershipExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalBorrowedCount: 0,
      outstandingFine: 0,
    };

    members.unshift(newMember);
    (store as any).libraryMembers = members;
    ERPStorage.set(store);
    notifyStorageChange();
    return newMember;
  },

  updateMemberStatus(memberId: string, status: LibraryMember['status']): LibraryMember {
    const store = ERPStorage.get();
    const members: LibraryMember[] = (store as any).libraryMembers || [];
    const member = members.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found');

    member.status = status;
    (store as any).libraryMembers = members;
    ERPStorage.set(store);
    notifyStorageChange();
    return member;
  },

  // ==========================================
  // 5. Circulation Desk: Issue, Return & Renew
  // ==========================================
  getAllLoans(): LibraryLoan[] {
    return (ERPStorage.get() as any).libraryLoans || [];
  },

  getActiveLoans(): LibraryLoan[] {
    return this.getAllLoans().filter(l => l.status === 'borrowed' || l.status === 'issued' || l.status === 'overdue');
  },

  getOverdueLoans(): LibraryLoan[] {
    const loans = this.getAllLoans();
    const today = new Date().toISOString().split('T')[0];
    return loans.filter(l => (l.status === 'borrowed' || l.status === 'issued' || l.status === 'overdue') && l.dueDate < today);
  },

  getLoansForStudent(studentId: string): Array<LibraryLoan & { bookTitle: string; bookId: string }> {
    return this.getAllLoans()
      .filter(l => l.borrowerId === studentId || (l as any).studentId === studentId)
      .map(l => ({ ...l, bookTitle: l.bookTitle || 'Book', bookId: l.bookId || '' }));
  },

  getLoansForMember(memberIdOrRef: string): LibraryLoan[] {
    return this.getAllLoans().filter(
      l => l.memberId === memberIdOrRef || l.borrowerId === memberIdOrRef || (l as any).studentId === memberIdOrRef
    );
  },

  issueBook(params: {
    bookId: string;
    copyId?: string;
    accessionNumber?: string;
    memberId: string;
    dueDays?: number;
    dueDate?: string;
    issuedBy: string;
    notes?: string;
  }): { success: boolean; loan?: LibraryLoan; error?: string } {
    try {
      const store = ERPStorage.get();
      const settings = this.getSettings();
      const member = this.getMemberById(params.memberId);
      if (!member) {
        return { success: false, error: 'Library member not found in directory.' };
      }

      if (member.status !== 'active') {
        return { success: false, error: `Member account is currently ${member.status}. Circulation blocked.` };
      }

      if (member.currentIssuedCount >= member.maxBorrowLimit) {
        return {
          success: false,
          error: `Borrowing limit exceeded: Member has ${member.currentIssuedCount} active loans (Limit: ${member.maxBorrowLimit}).`,
        };
      }

      if (member.outstandingFine > 100) {
        return {
          success: false,
          error: `Cannot issue book: Member has ₹${member.outstandingFine} in unpaid library fines. Clear dues first.`,
        };
      }

      const copies: LibraryCopy[] = (store as any).libraryCopies || [];
      let targetCopy: LibraryCopy | undefined;

      if (params.copyId) {
        targetCopy = copies.find(c => c.id === params.copyId);
      } else if (params.accessionNumber) {
        targetCopy = copies.find(c => c.accessionNumber.trim().toLowerCase() === params.accessionNumber!.trim().toLowerCase());
      } else {
        targetCopy = copies.find(c => c.bookId === params.bookId && c.status === 'available');
      }

      if (!targetCopy) {
        return { success: false, error: 'No matching physical copy found in inventory.' };
      }

      if (targetCopy.status !== 'available') {
        return {
          success: false,
          error: `Copy (${targetCopy.accessionNumber}) is currently ${targetCopy.status} and cannot be issued.`,
        };
      }

      // Calculate due date
      const today = new Date();
      let dueDateStr: string;

      if (params.dueDate) {
        dueDateStr = params.dueDate.includes('T') ? params.dueDate.split('T')[0] : params.dueDate;
      } else {
        const standardDays =
          params.dueDays ||
          (member.memberType === 'teacher'
            ? settings.teacherBorrowDurationDays
            : member.memberType === 'staff'
            ? settings.staffBorrowDurationDays
            : settings.studentBorrowDurationDays);
        const calcDue = new Date();
        calcDue.setDate(today.getDate() + standardDays);
        dueDateStr = calcDue.toISOString().split('T')[0];
      }

      const loans: LibraryLoan[] = (store as any).libraryLoans || [];
      const loanNumber = `LN-2026-${String(loans.length + 1).padStart(4, '0')}`;

      const newLoan: LibraryLoan = {
        id: `loan-${Date.now()}`,
        loanNumber,
        copyId: targetCopy.id,
        accessionNumber: targetCopy.accessionNumber,
        bookId: targetCopy.bookId,
        bookTitle: targetCopy.bookTitle,
        isbn: targetCopy.isbn,
        memberId: member.id,
        borrowerType: member.memberType,
        borrowerId: member.referenceId,
        borrowerName: member.name,
        borrowerCode: member.code,
        borrowerClassOrDept: member.classOrDepartment,
        studentId: member.referenceId,
        studentName: member.name,
        issueDate: today.toISOString().split('T')[0],
        dueDate: dueDateStr,
        renewalCount: 0,
        status: 'borrowed',
        fineAmount: 0,
        fineStatus: 'none',
        issuedBy: params.issuedBy,
        notes: params.notes,
        institutionId: 'inst-1',
      };

      // Update copy status
      targetCopy.status = 'issued';
      targetCopy.currentLoanId = newLoan.id;

      // Update member count
      member.currentIssuedCount += 1;
      member.totalBorrowedCount += 1;

      // Update parent book counters
      this.recalculateBookStock(targetCopy.bookId, store);

      // Add to store
      loans.unshift(newLoan);
      (store as any).libraryLoans = loans;

      // Legacy support: also update book.issuedRecords
      const legacyBook = (store.books || []).find(b => b.id === targetCopy!.bookId);
      if (legacyBook) {
        if (!legacyBook.issuedRecords) legacyBook.issuedRecords = [];
        legacyBook.issuedRecords.unshift(newLoan);
      }

      ERPStorage.set(store);
      notifyStorageChange();
      return { success: true, loan: newLoan };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error issuing book' };
    }
  },

  returnBook(params: {
    loanId: string;
    receivedBy: string;
    condition?: LibraryCopy['condition'];
    notes?: string;
  }): { success: boolean; loan?: LibraryLoan; fine?: LibraryFine; error?: string } {
    try {
      const store = ERPStorage.get();
      const settings = this.getSettings();
      const loans: LibraryLoan[] = (store as any).libraryLoans || [];
      const loan = loans.find(l => l.id === params.loanId);
      if (!loan) {
        return { success: false, error: 'Circulation loan record not found.' };
      }

      if (loan.status === 'returned') {
        return { success: false, error: 'This book loan has already been recorded as returned.' };
      }

      const returnDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(loan.dueDate);
      const actualReturnDate = new Date(returnDate);

      let overdueDays = 0;
      let fineAmount = 0;
      let fineStatus: LibraryLoan['fineStatus'] = 'none';

      if (actualReturnDate > dueDate) {
        const diffMs = actualReturnDate.getTime() - dueDate.getTime();
        const rawDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (rawDays > settings.gracePeriodDays) {
          overdueDays = rawDays;
          fineAmount = overdueDays * (settings.finePerDayOverdue || 5);
          fineStatus = 'pending';
        }
      }

      const condition = params.condition || 'good';
      let copyStatus: LibraryCopy['status'] = 'available';

      if (condition === 'damaged') {
        copyStatus = 'damaged';
        fineAmount += 150;
        fineStatus = 'pending';
      }

      // Update loan
      loan.status = 'returned';
      loan.returnDate = returnDate;
      loan.returnCondition = condition;
      loan.fineAmount = fineAmount;
      loan.fineStatus = fineStatus;
      loan.receivedBy = params.receivedBy;
      if (params.notes) loan.notes = params.notes;

      // Update copy
      const copies: LibraryCopy[] = (store as any).libraryCopies || [];
      const copy = copies.find(c => c.id === loan.copyId);
      if (copy) {
        copy.status = copyStatus;
        copy.condition = condition;
        copy.currentLoanId = undefined;
      }

      // Update member count
      const member = this.getMemberById(loan.memberId || loan.borrowerId || (loan as any).studentId);
      if (member) {
        member.currentIssuedCount = Math.max(0, member.currentIssuedCount - 1);
        if (fineAmount > 0) {
          member.outstandingFine += fineAmount;
        }
      }

      // If fine generated, record in fines collection
      let newFine: LibraryFine | undefined;
      if (fineAmount > 0) {
        const fines: LibraryFine[] = (store as any).libraryFines || [];
        const fineNumber = `FN-2026-${String(fines.length + 1).padStart(4, '0')}`;
        newFine = {
          id: `fine-${Date.now()}`,
          fineNumber,
          institutionId: 'inst-1',
          loanId: loan.id,
          memberId: member ? member.id : loan.memberId || '',
          memberName: member ? member.name : loan.borrowerName || '',
          memberType: member ? member.memberType : loan.borrowerType || 'student',
          memberCode: member ? member.code : loan.borrowerCode || '',
          bookTitle: loan.bookTitle || '',
          accessionNumber: loan.accessionNumber,
          reason: condition === 'damaged' ? 'damage' : 'overdue',
          amount: fineAmount,
          paidAmount: 0,
          waiverAmount: 0,
          balance: fineAmount,
          status: 'pending',
          notes: condition === 'damaged' ? 'Damage surcharge assessed on return' : `Overdue by ${overdueDays} days`,
        };
        fines.unshift(newFine);
        (store as any).libraryFines = fines;
      }

      // Check reservations queue for next waiting member
      if (copy && copy.status === 'available') {
        const reservations: LibraryReservation[] = (store as any).libraryReservations || [];
        const nextPending = reservations.find(r => r.bookId === copy.bookId && r.status === 'pending');
        if (nextPending) {
          nextPending.status = 'fulfilled';
          nextPending.allocatedCopyId = copy.id;
          nextPending.allocatedAccessionNo = copy.accessionNumber;
          copy.status = 'reserved';
        }
      }

      if (copy) {
        this.recalculateBookStock(copy.bookId, store);
      }

      (store as any).libraryLoans = loans;
      (store as any).libraryCopies = copies;
      ERPStorage.set(store);
      notifyStorageChange();
      return { success: true, loan, fine: newFine };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error returning book' };
    }
  },

  renewLoan(loanId: string, renewedBy: string): { success: boolean; loan?: LibraryLoan; error?: string } {
    try {
      const store = ERPStorage.get();
      const settings = this.getSettings();
      const loans: LibraryLoan[] = (store as any).libraryLoans || [];
      const loan = loans.find(l => l.id === loanId);
      if (!loan) return { success: false, error: 'Circulation record not found' };

      if (loan.status === 'returned') return { success: false, error: 'Returned loans cannot be renewed' };

      const currentRenewals = loan.renewalCount || 0;
      if (currentRenewals >= (settings.maxRenewals || 2)) {
        return { success: false, error: `Maximum renewal limit (${settings.maxRenewals}) reached for this book.` };
      }

      // Check if reservations exist for this book
      const reservations: LibraryReservation[] = (store as any).libraryReservations || [];
      const hasPendingQueue = reservations.some(r => r.bookId === loan.bookId && r.status === 'pending');
      if (hasPendingQueue) {
        return { success: false, error: 'Cannot renew: Other patrons are waiting in the reservation queue for this book.' };
      }

      const today = new Date();
      const extensionDays = settings.studentBorrowDurationDays || 14;
      const newDueDate = new Date(loan.dueDate);
      if (newDueDate < today) {
        newDueDate.setTime(today.getTime());
      }
      newDueDate.setDate(newDueDate.getDate() + extensionDays);

      loan.dueDate = newDueDate.toISOString().split('T')[0];
      loan.renewalCount = currentRenewals + 1;
      loan.status = 'borrowed';
      loan.notes = (loan.notes ? loan.notes + '; ' : '') + `Renewed by ${renewedBy} on ${today.toISOString().split('T')[0]}`;

      (store as any).libraryLoans = loans;
      ERPStorage.set(store);
      notifyStorageChange();
      return { success: true, loan };
    } catch (err: any) {
      return { success: false, error: err.message || 'Renewal failed' };
    }
  },

  // ==========================================
  // 6. Reservations & Holds
  // ==========================================
  getAllReservations(): LibraryReservation[] {
    return (ERPStorage.get() as any).libraryReservations || [];
  },

  createReservation(params: { bookId: string; memberId: string; notes?: string }): {
    success: boolean;
    reservation?: LibraryReservation;
    error?: string;
  } {
    try {
      const store = ERPStorage.get();
      const book = (store.books || []).find(b => b.id === params.bookId);
      if (!book) return { success: false, error: 'Book not found' };

      const member = this.getMemberById(params.memberId);
      if (!member) return { success: false, error: 'Member not found' };

      const reservations: LibraryReservation[] = (store as any).libraryReservations || [];
      const queuePosition = reservations.filter(r => r.bookId === params.bookId && r.status === 'pending').length + 1;

      const newReservation: LibraryReservation = {
        id: `res-${Date.now()}`,
        bookId: book.id,
        bookTitle: book.title,
        memberId: member.id,
        memberName: member.name,
        memberType: member.memberType,
        memberCode: member.code,
        requestDate: new Date().toISOString().split('T')[0],
        queuePosition,
        status: 'pending',
        notes: params.notes,
        institutionId: 'inst-1',
      };

      reservations.push(newReservation);
      (store as any).libraryReservations = reservations;
      ERPStorage.set(store);
      notifyStorageChange();
      return { success: true, reservation: newReservation };
    } catch (err: any) {
      return { success: false, error: err.message || 'Reservation failed' };
    }
  },

  cancelReservation(reservationId: string): boolean {
    const store = ERPStorage.get();
    const reservations: LibraryReservation[] = (store as any).libraryReservations || [];
    const r = reservations.find(item => item.id === reservationId);
    if (!r) return false;

    r.status = 'cancelled';
    (store as any).libraryReservations = reservations;
    ERPStorage.set(store);
    notifyStorageChange();
    return true;
  },

  // ==========================================
  // 7. Fine Management & Authorized Waivers
  // ==========================================
  getAllFines(): LibraryFine[] {
    return (ERPStorage.get() as any).libraryFines || [];
  },

  payFine(
    fineId: string,
    params: {
      paidAmount: number;
      paymentMethod: 'Cash' | 'UPI' | 'Online' | 'Net Banking';
      receiptNumber: string;
      collectedBy: string;
    }
  ): { success: boolean; fine?: LibraryFine; error?: string } {
    const store = ERPStorage.get();
    const fines: LibraryFine[] = (store as any).libraryFines || [];
    const fine = fines.find(f => f.id === fineId);
    if (!fine) return { success: false, error: 'Fine record not found' };

    fine.paidAmount += params.paidAmount;
    fine.balance = Math.max(0, fine.amount - fine.paidAmount - fine.waiverAmount);
    fine.status = fine.balance === 0 ? 'paid' : 'partially_paid';
    fine.paymentDate = new Date().toISOString().split('T')[0];
    fine.paymentMethod = params.paymentMethod;
    fine.receiptNumber = params.receiptNumber;

    // Reduce member outstanding fine
    const member = this.getMemberById(fine.memberId);
    if (member) {
      member.outstandingFine = Math.max(0, member.outstandingFine - params.paidAmount);
    }

    (store as any).libraryFines = fines;
    ERPStorage.set(store);
    notifyStorageChange();
    return { success: true, fine };
  },

  waiveFine(
    fineId: string,
    params: {
      waiverAmount: number;
      waiverReason: string;
      waivedBy: string;
    }
  ): { success: boolean; fine?: LibraryFine; error?: string } {
    const store = ERPStorage.get();
    const fines: LibraryFine[] = (store as any).libraryFines || [];
    const fine = fines.find(f => f.id === fineId);
    if (!fine) return { success: false, error: 'Fine record not found' };

    fine.waiverAmount += params.waiverAmount;
    fine.balance = Math.max(0, fine.amount - fine.paidAmount - fine.waiverAmount);
    fine.status = fine.balance === 0 ? 'waived' : 'partially_paid';
    fine.waivedBy = params.waivedBy;
    fine.waiverReason = params.waiverReason;

    // Reduce member outstanding fine
    const member = this.getMemberById(fine.memberId);
    if (member) {
      member.outstandingFine = Math.max(0, member.outstandingFine - params.waiverAmount);
    }

    (store as any).libraryFines = fines;
    ERPStorage.set(store);
    notifyStorageChange();
    return { success: true, fine };
  },

  // ==========================================
  // 8. Physical Stock Verification Audit Sessions
  // ==========================================
  getAllAudits(): LibraryInventoryAudit[] {
    return (ERPStorage.get() as any).libraryInventoryAudits || [];
  },

  createAuditSession(params: { sessionName: string; initiatedBy: string }): LibraryInventoryAudit {
    const store = ERPStorage.get();
    const audits: LibraryInventoryAudit[] = (store as any).libraryInventoryAudits || [];
    const totalCopies = this.getAllCopies().length;

    const newAudit: LibraryInventoryAudit = {
      id: `audit-${Date.now()}`,
      sessionName: params.sessionName,
      institutionId: 'inst-1',
      startDate: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      totalRegisteredCopies: totalCopies,
      verifiedCopiesCount: 0,
      missingCopiesCount: 0,
      damagedCopiesCount: 0,
      unverifiedCopiesCount: totalCopies,
      verifiedBy: params.initiatedBy,
      verifiedAccessions: [],
      remarks: 'Verification session opened.',
    };

    audits.unshift(newAudit);
    (store as any).libraryInventoryAudits = audits;
    ERPStorage.set(store);
    notifyStorageChange();
    return newAudit;
  },

  scanCopyInAudit(
    auditId: string,
    accessionOrBarcode: string,
    scannedBy: string
  ): { success: boolean; copy?: LibraryCopy; isDuplicate?: boolean; error?: string } {
    const store = ERPStorage.get();
    const audits: LibraryInventoryAudit[] = (store as any).libraryInventoryAudits || [];
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return { success: false, error: 'Audit session not found' };

    if (audit.status === 'completed') return { success: false, error: 'This audit session has been locked and closed' };

    const copies: LibraryCopy[] = (store as any).libraryCopies || [];
    const q = accessionOrBarcode.trim().toLowerCase();
    const copy = copies.find(c => c.accessionNumber.toLowerCase() === q || c.barcode.toLowerCase() === q);
    if (!copy) return { success: false, error: `Accession / Barcode "${accessionOrBarcode}" not recognized in inventory.` };

    if (audit.verifiedAccessions.includes(copy.accessionNumber)) {
      return { success: true, copy, isDuplicate: true };
    }

    audit.verifiedAccessions.push(copy.accessionNumber);
    audit.verifiedCopiesCount += 1;
    audit.unverifiedCopiesCount = Math.max(0, audit.totalRegisteredCopies - audit.verifiedCopiesCount);
    if (copy.condition === 'damaged') {
      audit.damagedCopiesCount += 1;
    }

    (store as any).libraryInventoryAudits = audits;
    ERPStorage.set(store);
    notifyStorageChange();
    return { success: true, copy, isDuplicate: false };
  },

  finalizeAuditSession(auditId: string, remarks?: string): LibraryInventoryAudit {
    const store = ERPStorage.get();
    const audits: LibraryInventoryAudit[] = (store as any).libraryInventoryAudits || [];
    const audit = audits.find(a => a.id === auditId);
    if (!audit) throw new Error('Audit session not found');

    audit.status = 'completed';
    audit.completedDate = new Date().toISOString().split('T')[0];
    audit.missingCopiesCount = Math.max(0, audit.totalRegisteredCopies - audit.verifiedCopiesCount);
    if (remarks) audit.remarks = remarks;

    (store as any).libraryInventoryAudits = audits;
    ERPStorage.set(store);
    notifyStorageChange();
    return audit;
  },

  // ==========================================
  // 9. Teacher Staff Assignments (Librarian Role Delegation)
  // ==========================================
  getAllStaffAssignments(): LibraryStaffAssignment[] {
    return (ERPStorage.get() as any).libraryStaffAssignments || [];
  },

  assignTeacher(params: {
    teacherId: string;
    teacherName: string;
    staffId: string;
    department: string;
    roleTitle: LibraryStaffAssignment['roleTitle'];
    permissions: string[];
    assignedBy: string;
  }): LibraryStaffAssignment {
    const store = ERPStorage.get();
    const assignments: LibraryStaffAssignment[] = (store as any).libraryStaffAssignments || [];

    // Revoke any previous active assignment for this teacher
    assignments.forEach(a => {
      if (a.teacherId === params.teacherId && a.status === 'active') {
        a.status = 'revoked';
        a.revokedDate = new Date().toISOString().split('T')[0];
        a.revokedBy = params.assignedBy;
      }
    });

    const newAssignment: LibraryStaffAssignment = {
      id: `assign-${Date.now()}`,
      institutionId: 'inst-1',
      teacherId: params.teacherId,
      teacherName: params.teacherName,
      staffId: params.staffId,
      department: params.department,
      roleTitle: params.roleTitle,
      permissions: params.permissions,
      assignedBy: params.assignedBy,
      assignedDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    assignments.unshift(newAssignment);
    (store as any).libraryStaffAssignments = assignments;
    ERPStorage.set(store);
    notifyStorageChange();
    return newAssignment;
  },

  revokeStaffAssignment(assignmentId: string, revokedBy: string): boolean {
    const store = ERPStorage.get();
    const assignments: LibraryStaffAssignment[] = (store as any).libraryStaffAssignments || [];
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return false;

    assignment.status = 'revoked';
    assignment.revokedDate = new Date().toISOString().split('T')[0];
    assignment.revokedBy = revokedBy;

    (store as any).libraryStaffAssignments = assignments;
    ERPStorage.set(store);
    notifyStorageChange();
    return true;
  },

  // ==========================================
  // 10. Operational Dashboard Stats
  // ==========================================
  getDashboardStats() {
    const books = this.getAll();
    const copies = this.getAllCopies();
    const loans = this.getAllLoans();
    const fines = this.getAllFines();
    const reservations = this.getAllReservations();
    const members = this.getAllMembers();

    const todayStr = new Date().toISOString().split('T')[0];

    const activeLoans = loans.filter(l => l.status === 'borrowed' || l.status === 'issued' || l.status === 'overdue');
    const overdueLoans = activeLoans.filter(l => l.dueDate < todayStr);
    const todayIssues = loans.filter(l => l.issueDate === todayStr);
    const todayReturns = loans.filter(l => l.returnDate === todayStr);

    const pendingFinesTotal = fines
      .filter(f => f.status === 'pending' || f.status === 'partially_paid')
      .reduce((sum, f) => sum + (f.balance || 0), 0);

    return {
      totalTitles: books.length,
      totalPhysicalCopies: copies.length,
      availableCopies: copies.filter(c => c.status === 'available').length,
      issuedCopies: copies.filter(c => c.status === 'issued').length,
      damagedCopies: copies.filter(c => c.status === 'damaged').length,
      overdueCount: overdueLoans.length,
      activeMembersCount: members.filter(m => m.status === 'active').length,
      pendingFinesTotal,
      pendingReservationsCount: reservations.filter(r => r.status === 'pending').length,
      todayIssuesCount: todayIssues.length,
      todayReturnsCount: todayReturns.length,
    };
  },
};
