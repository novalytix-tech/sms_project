// ==========================================
// SMS ERP — Professional School Library Management System
// Full-Featured Librarian Dashboard, Teacher-Based Access Control,
// Accession Registry, Circulation Desk, Fines & Stock Verification
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { libraryService } from '../../services/libraryService';
import { LibraryBook, LibraryCopy, LibraryMember, LibraryLoan, LibraryFine, LibraryReservation, LibraryInventoryAudit, LibraryStaffAssignment, LibrarySettings } from '../../types';
import { getTeacherLibraryAssignment } from '../../utils/permissions';
import { BookMarked, BookOpen, Search, Plus, ArrowRightLeft, CalendarCheck, AlertTriangle, Users, IndianRupee, ShieldCheck, RotateCcw, CheckCircle, FileText, Barcode, Settings, X, Send, Eye, TrendingUp, Download, Clock, UserCheck, AlertCircle, Package, GraduationCap } from 'lucide-react';
import './library.css';

export const LibraryManagementPage: React.FC = () => {
  const { currentUser, currentRole, addToast } = useERP();

  // Active Tab for Librarian Desk
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Local Reactive State from Library Service
  const [books, setBooks] = useState<LibraryBook[]>(() => libraryService.getAll());
  const [copies, setCopies] = useState<LibraryCopy[]>(() => libraryService.getAllCopies());
  const [members, setMembers] = useState<LibraryMember[]>(() => libraryService.getAllMembers());
  const [loans, setLoans] = useState<LibraryLoan[]>(() => libraryService.getAllLoans());
  const [fines, setFines] = useState<LibraryFine[]>(() => libraryService.getAllFines());
  const [reservations, setReservations] = useState<LibraryReservation[]>(() => libraryService.getAllReservations());
  const [audits, setAudits] = useState<LibraryInventoryAudit[]>(() => libraryService.getAllAudits());
  const [staffAssignments, setStaffAssignments] = useState<LibraryStaffAssignment[]>(() =>
    libraryService.getAllStaffAssignments()
  );
  const [settings, setSettings] = useState<LibrarySettings>(() => libraryService.getSettings());

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setBooks(libraryService.getAll());
      setCopies(libraryService.getAllCopies());
      setMembers(libraryService.getAllMembers());
      setLoans(libraryService.getAllLoans());
      setFines(libraryService.getAllFines());
      setReservations(libraryService.getAllReservations());
      setAudits(libraryService.getAllAudits());
      setStaffAssignments(libraryService.getAllStaffAssignments());
      setSettings(libraryService.getSettings());
    };

    window.addEventListener('nts_erp_storage_updated', handleStorageChange);
    return () => window.removeEventListener('nts_erp_storage_updated', handleStorageChange);
  }, []);

  // Compute Active Staff Assignment for current teacher
  const teacherAssignment = useMemo(() => {
    if (currentRole !== 'teacher') return null;
    return getTeacherLibraryAssignment(currentUser, staffAssignments);
  }, [currentRole, currentUser, staffAssignments]);

  // Operational clearance check
  const isLibrarianStaff = useMemo(() => {
    if (currentRole === 'super_admin' || currentRole === 'school_admin') return true;
    if (currentRole === 'teacher' && teacherAssignment) return true;
    return false;
  }, [currentRole, teacherAssignment]);

  // Operational KPI metrics
  const stats = useMemo(() => libraryService.getDashboardStats(), [books, copies, loans, fines, reservations, members]);

  // Search & Filter state
  const [searchCatalogue, setSearchCatalogue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals & Drawers
  const [selectedBookForCopies, setSelectedBookForCopies] = useState<LibraryBook | null>(null);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isBatchCopyModalOpen, setIsBatchCopyModalOpen] = useState(false);
  const [batchBookId, setBatchBookId] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(3);
  const [isAssignStaffModalOpen, setIsAssignStaffModalOpen] = useState(false);
  const [isPayFineModalOpen, setIsPayFineModalOpen] = useState(false);
  const [selectedFineForPay, setSelectedFineForPay] = useState<LibraryFine | null>(null);
  const [isWaiveFineModalOpen, setIsWaiveFineModalOpen] = useState(false);
  const [selectedFineForWaive, setSelectedFineForWaive] = useState<LibraryFine | null>(null);
  const [waiverReasonInput, setWaiverReasonInput] = useState('');

  // Fast Issue Form State
  const [issueMemberQuery, setIssueMemberQuery] = useState('');
  const [selectedIssueMember, setSelectedIssueMember] = useState<LibraryMember | null>(null);
  const [issueAccessionQuery, setIssueAccessionQuery] = useState('');
  const [issueSelectedBookId, setIssueSelectedBookId] = useState('');
  const [issueCustomDays, setIssueCustomDays] = useState<number>(14);

  // Receive Return Form State
  const [returnAccessionQuery, setReturnAccessionQuery] = useState('');
  const [returnSelectedLoan, setReturnSelectedLoan] = useState<LibraryLoan | null>(null);
  const [returnCondition, setReturnCondition] = useState<LibraryCopy['condition']>('good');
  const [returnRemarks, setReturnRemarks] = useState('');

  // Stock Audit Scanner State
  const [activeAuditScanSession, setActiveAuditScanSession] = useState<string>(audits[0]?.id || '');
  const [auditScanInput, setAuditScanInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{ msg: string; type: 'success' | 'warn' | 'error' } | null>(null);

  // New Book Form State
  const [newBookForm, setNewBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Science & Physics',
    subject: 'Physics',
    publisher: 'Bharati Bhawan',
    edition: '2025 Edition',
    publicationYear: 2025,
    shelfLocation: 'Aisle 3, Rack B',
    totalCopies: 4,
    purchasePrice: 450,
  });

  // New Staff Assignment Form State
  const [assignForm, setAssignForm] = useState({
    teacherId: 'teach-2',
    teacherName: 'Mr. Rajesh Kumar',
    staffId: 'STAFF-102',
    department: 'Science',
    roleTitle: 'Library In-charge' as LibraryStaffAssignment['roleTitle'],
    permissions: [
      'library.dashboard.view',
      'library.books.view',
      'library.circulation.issue',
      'library.circulation.return',
      'library.circulation.renew',
      'library.reservations.manage',
      'library.fines.view',
    ],
  });

  // Handle Member lookup for Issue Counter
  const handleMemberSelect = (memberId: string) => {
    const mem = members.find(m => m.id === memberId || m.referenceId === memberId || m.code === memberId);
    if (mem) {
      setSelectedIssueMember(mem);
      setIssueMemberQuery(mem.name);
      setIssueCustomDays(mem.memberType === 'teacher' ? settings.teacherBorrowDurationDays : settings.studentBorrowDurationDays);
    }
  };

  // Fast Issue Book Action
  const handleExecuteIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueMember) {
      addToast('error', 'Select Member', 'Please lookup and select an authorized student or faculty member.');
      return;
    }

    const res = libraryService.issueBook({
      bookId: issueSelectedBookId || (issueAccessionQuery ? '' : books[0]?.id || ''),
      accessionNumber: issueAccessionQuery.trim() || undefined,
      memberId: selectedIssueMember.id,
      dueDays: Number(issueCustomDays),
      issuedBy: currentUser.name,
      notes: `Checked out via Fast Issue Counter by ${currentUser.name}`,
    });

    if (!res.success) {
      addToast('error', 'Issue Failed', res.error);
      return;
    }

    addToast('success', 'Book Issued', `Loan ${res.loan?.loanNumber} generated for ${selectedIssueMember.name}. Due on ${res.loan?.dueDate}.`);
    setIssueAccessionQuery('');
    setIssueMemberQuery('');
    setSelectedIssueMember(null);
  };

  // Handle Return Lookup Action
  const handleReturnLookup = (query: string) => {
    setReturnAccessionQuery(query);
    const q = query.trim().toLowerCase();
    if (!q) {
      setReturnSelectedLoan(null);
      return;
    }
    const matchingLoan = loans.find(
      l =>
        (l.status === 'borrowed' || l.status === 'issued' || l.status === 'overdue') &&
        (l.accessionNumber?.toLowerCase() === q || l.loanNumber?.toLowerCase() === q)
    );
    setReturnSelectedLoan(matchingLoan || null);
  };

  // Receive Return Action
  const handleExecuteReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSelectedLoan) {
      addToast('error', 'No Loan Selected', 'Scan or select an active borrowed book loan to return.');
      return;
    }

    const res = libraryService.returnBook({
      loanId: returnSelectedLoan.id,
      receivedBy: currentUser.name,
      condition: returnCondition,
      notes: returnRemarks || `Returned at circulation counter. Checked by ${currentUser.name}.`,
    });

    if (!res.success) {
      addToast('error', 'Return Failed', res.error);
      return;
    }

    if (res.fine && res.fine.amount > 0) {
      addToast(
        'warning',
        'Book Returned with Fine',
        `Accession ${returnSelectedLoan.accessionNumber} returned. Outstanding fine of ₹${res.fine.amount} generated (${res.fine.reason}).`
      );
    } else {
      addToast('success', 'Book Returned', `Copy ${returnSelectedLoan.accessionNumber} successfully verified into library inventory.`);
    }

    setReturnAccessionQuery('');
    setReturnSelectedLoan(null);
    setReturnRemarks('');
  };

  // Renew Loan Action
  const handleRenewLoan = (loanId: string) => {
    const res = libraryService.renewLoan(loanId, currentUser.name);
    if (!res.success) {
      addToast('error', 'Renewal Failed', res.error);
      return;
    }
    addToast('success', 'Loan Renewed', `Due date extended to ${res.loan?.dueDate}. (Renewal #${res.loan?.renewalCount})`);
  };

  // Create Book Catalogue Record
  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookForm.title.trim() || !newBookForm.author.trim() || !newBookForm.isbn.trim()) {
      addToast('error', 'Missing Fields', 'Title, Author, and ISBN are mandatory.');
      return;
    }

    libraryService.createBook({
      ...newBookForm,
      totalCopies: Number(newBookForm.totalCopies),
      purchasePrice: Number(newBookForm.purchasePrice),
      publicationYear: Number(newBookForm.publicationYear),
    });

    addToast('success', 'Book Catalogued', `"${newBookForm.title}" added with ${newBookForm.totalCopies} physical copies.`);
    setIsAddBookModalOpen(false);
    setNewBookForm({
      title: '',
      author: '',
      isbn: '',
      category: 'Science & Physics',
      subject: 'Physics',
      publisher: 'Bharati Bhawan',
      edition: '2025 Edition',
      publicationYear: 2025,
      shelfLocation: 'Aisle 3, Rack B',
      totalCopies: 4,
      purchasePrice: 450,
    });
  };

  // Batch Generate Copies Action
  const handleBatchGenerateCopies = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchBookId) return;

    const res = libraryService.batchGenerateCopies(batchBookId, Number(batchQuantity));
    addToast('success', 'Copies Added', `${res.length} physical copies generated with sequential accession numbers.`);
    setIsBatchCopyModalOpen(false);
  };

  // Audit Barcode Gun Scanner Simulator
  const handleScanInAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditScanInput.trim() || !activeAuditScanSession) return;

    const res = libraryService.scanCopyInAudit(activeAuditScanSession, auditScanInput.trim(), currentUser.name);
    if (!res.success) {
      setLastScanResult({ msg: res.error || 'Scan error', type: 'error' });
      addToast('error', 'Audit Alert', res.error);
    } else if (res.isDuplicate) {
      setLastScanResult({ msg: `Accession ${res.copy?.accessionNumber} was already scanned in this session.`, type: 'warn' });
    } else {
      setLastScanResult({
        msg: `Verified: ${res.copy?.accessionNumber} — "${res.copy?.bookTitle}" (${res.copy?.condition})`,
        type: 'success',
      });
      addToast('success', 'Copy Verified', `Accession ${res.copy?.accessionNumber} verified.`);
    }
    setAuditScanInput('');
  };

  // Settle / Waive Fine Action
  const handleExecuteWaiveFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFineForWaive || !waiverReasonInput.trim()) {
      addToast('error', 'Reason Required', 'Mandatory Principal/Administrative justification required for fine waiver.');
      return;
    }

    const res = libraryService.waiveFine(selectedFineForWaive.id, {
      waiverAmount: selectedFineForWaive.balance,
      waiverReason: waiverReasonInput.trim(),
      waivedBy: currentUser.name,
    });

    if (res.success) {
      addToast('success', 'Fine Waived', `₹${selectedFineForWaive.balance} fine for ${selectedFineForWaive.memberName} was waived with audit log.`);
      setIsWaiveFineModalOpen(false);
      setSelectedFineForWaive(null);
      setWaiverReasonInput('');
    }
  };

  // Pay Fine Action
  const handleExecutePayFine = (fine: LibraryFine) => {
    const res = libraryService.payFine(fine.id, {
      paidAmount: fine.balance,
      paymentMethod: 'Cash',
      receiptNumber: `REC-LIB-${Date.now().toString().slice(-6)}`,
      collectedBy: currentUser.name,
    });

    if (res.success) {
      addToast('success', 'Payment Recorded', `₹${fine.balance} fine payment receipt generated for ${fine.memberName}.`);
      setIsPayFineModalOpen(false);
    }
  };

  // Assign Staff Member (Librarian Role Delegation)
  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    libraryService.assignTeacher({
      ...assignForm,
      assignedBy: currentUser.name,
    });

    addToast(
      'success',
      'Staff Assigned',
      `${assignForm.teacherName} assigned responsibility as ${assignForm.roleTitle} with delegated circulation permissions.`
    );
    setIsAssignStaffModalOpen(false);
  };

  // Revoke Staff Responsibility
  const handleRevokeStaff = (assignmentId: string, teacherName: string) => {
    if (window.confirm(`Revoke library responsibility from ${teacherName}?`)) {
      libraryService.revokeStaffAssignment(assignmentId, currentUser.name);
      addToast('info', 'Responsibility Revoked', `Library in-charge assignment revoked from ${teacherName}.`);
    }
  };

  // Filter catalogue books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchQ =
        !searchCatalogue ||
        b.title.toLowerCase().includes(searchCatalogue.toLowerCase()) ||
        b.author.toLowerCase().includes(searchCatalogue.toLowerCase()) ||
        b.isbn.toLowerCase().includes(searchCatalogue.toLowerCase()) ||
        b.shelfLocation.toLowerCase().includes(searchCatalogue.toLowerCase());

      const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
      return matchQ && matchCat;
    });
  }, [books, searchCatalogue, selectedCategory]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => set.add(b.category));
    return ['all', ...Array.from(set)];
  }, [books]);

  // Student loans & fines for Student Persona
  const myStudentLoans = useMemo(() => {
    if (currentRole !== 'student') return [];
    return loans.filter(l => l.borrowerId === currentUser.referenceId || (l as any).studentId === currentUser.referenceId);
  }, [currentRole, currentUser, loans]);

  const myStudentFines = useMemo(() => {
    if (currentRole !== 'student') return [];
    return fines.filter(f => f.memberCode === 'ADM-2024-001' || f.memberName.toLowerCase() === currentUser.name.toLowerCase());
  }, [currentRole, currentUser, fines]);

  // Teacher loans for Teacher Persona (Scenario A: Mrs. Ananya Sharma)
  const myTeacherLoans = useMemo(() => {
    if (currentRole !== 'teacher') return [];
    return loans.filter(
      l => l.borrowerId === currentUser.referenceId || l.borrowerName?.toLowerCase() === currentUser.name.toLowerCase()
    );
  }, [currentRole, currentUser, loans]);

  // =========================================================================
  // VIEW 1: STUDENT READER DESK (When logged in as Student)
  // =========================================================================
  if (currentRole === 'student') {
    return (
      <div className="lib-container">
        {/* Student Banner */}
        <div className="lib-student-banner">
          <div>
            <h1 className="lib-student-title">Central Campus Library & Knowledge Centre</h1>
            <p className="lib-student-sub">
              Welcome, {currentUser.name}! View your active borrowed books, reservation holds, and search the institutional catalogue.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
              Borrowing Card: LIB-MEM-STU-001
            </span>
          </div>
        </div>

        {/* Student Active Loans */}
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">
                <BookOpen size={18} color="#3B82F6" /> My Active Borrowed Books ({myStudentLoans.filter(l => l.status !== 'returned').length})
              </h2>
              <p className="lib-card-desc">Max borrow limit: {settings.studentMaxBooks} books at a time. Standard duration: {settings.studentBorrowDurationDays} days.</p>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Accession No</th>
                  <th>Book Title</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Renewals</th>
                  <th>Fine Status</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myStudentLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      You do not have any borrowed books currently checked out.
                    </td>
                  </tr>
                ) : (
                  myStudentLoans.map(l => (
                    <tr key={l.id}>
                      <td><span className="lib-accession-code">{l.accessionNumber}</span></td>
                      <td><strong>{l.bookTitle}</strong></td>
                      <td>{l.issueDate}</td>
                      <td>
                        <strong style={{ color: l.status === 'overdue' ? '#3B82F6' : '#0f172a' }}>
                          {l.dueDate}
                        </strong>
                      </td>
                      <td>{l.renewalCount || 0} of {settings.maxRenewals}</td>
                      <td>
                        {l.fineAmount && l.fineAmount > 0 ? (
                          <span className="lib-status-pill overdue">₹{l.fineAmount} pending</span>
                        ) : (
                          <span className="lib-status-pill available">No dues</span>
                        )}
                      </td>
                      <td>
                        <span className={`lib-status-pill ${l.status}`}>{l.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Catalogue Browsing */}
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">
                <BookMarked size={18} color="#0284c7" /> Browse School Book Catalogue
              </h2>
              <p className="lib-card-desc">Search curriculum reference texts, Olympiad guides, and literature available in the library stacks.</p>
            </div>
            <div className="lib-search-box">
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search title, author, subject..."
                value={searchCatalogue}
                onChange={e => setSearchCatalogue(e.target.value)}
              />
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Title & Bibliographic Details</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Shelf Location</th>
                  <th>Available Copies</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        <strong>{b.title}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>ISBN: {b.isbn} • {b.publisher}</div>
                      </div>
                    </td>
                    <td>{b.author}</td>
                    <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{b.category}</span></td>
                    <td>{b.shelfLocation}</td>
                    <td>
                      <strong style={{ color: b.availableCopies > 0 ? '#059669' : '#3B82F6' }}>
                        {b.availableCopies} of {b.totalCopies}
                      </strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="lib-row-btn primary"
                        onClick={() => {
                          libraryService.createReservation({
                            bookId: b.id,
                            memberId: 'mem-stu-1',
                            notes: `Hold requested by student ${currentUser.name}`,
                          });
                          addToast('success', 'Hold Placed', `Reservation placed for "${b.title}". You will be notified when ready.`);
                        }}
                      >
                        Request Hold
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: NORMAL TEACHER (Scenario A: Mrs. Ananya Sharma without staff assignment)
  // =========================================================================
  if (currentRole === 'teacher' && !teacherAssignment) {
    return (
      <div className="lib-container">
        {/* Normal Teacher Info Notice */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <GraduationCap size={20} color="#3B82F6" />
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Faculty Reading & Reference Portal
              </h1>
              <span style={{ background: '#e2e8f0', color: '#334155', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                Scenario A — Normal Teacher
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Logged in as <strong>{currentUser.name}</strong> (Department of Mathematics). You have active faculty borrowing privileges for up to {settings.teacherMaxBooks} reference books for {settings.teacherBorrowDurationDays} days.
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Head Librarian on Duty:</span> Mrs. Sunita Verma
          </div>
        </div>

        {/* Informational Access Banner */}
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12.5px',
            color: '#92400e',
          }}
        >
          <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>Administrative Circulation Desk Delegated:</strong> Operational library desk management (issuing books, checking in returns, physical stock verification, and fee waivers) is authorized exclusively to faculty assigned as <em>Head Librarian</em> or <em>Library In-charge</em>.
            To test librarian privileges, switch to <strong>Mrs. Sunita Verma (Scenario B)</strong> or <strong>Mr. Rajesh Kumar (Scenario C)</strong> via the topbar profile menu.
          </div>
        </div>

        {/* Teacher Borrowed Reference Books */}
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">
                <BookOpen size={18} color="#3B82F6" /> My Faculty Issued Books ({myTeacherLoans.filter(l => l.status !== 'returned').length})
              </h2>
              <p className="lib-card-desc">Academic teaching references and curriculum guides issued to your faculty card (LIB-MEM-FAC-001).</p>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Accession No</th>
                  <th>Book Title</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Renewal Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myTeacherLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No active teaching reference books currently checked out.
                    </td>
                  </tr>
                ) : (
                  myTeacherLoans.map(l => (
                    <tr key={l.id}>
                      <td><span className="lib-accession-code">{l.accessionNumber}</span></td>
                      <td><strong>{l.bookTitle}</strong></td>
                      <td>{l.issueDate}</td>
                      <td><strong>{l.dueDate}</strong></td>
                      <td>{l.renewalCount || 0} renewals</td>
                      <td><span className={`lib-status-pill ${l.status}`}>{l.status.toUpperCase()}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Catalogue View for Normal Teachers */}
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">
                <BookMarked size={18} color="#0f172a" /> School Library Catalogue
              </h2>
              <p className="lib-card-desc">Browse available textbooks, lab manuals, and research materials in the senior school library.</p>
            </div>
            <div className="lib-search-box">
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search title, author, subject..."
                value={searchCatalogue}
                onChange={e => setSearchCatalogue(e.target.value)}
              />
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Title & Subject</th>
                  <th>Author & Publisher</th>
                  <th>Shelf Location</th>
                  <th>Total Copies</th>
                  <th>Available</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        <strong>{b.title}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>ISBN: {b.isbn} • Subject: {b.subject}</div>
                      </div>
                    </td>
                    <td>{b.author} ({b.publisher})</td>
                    <td>{b.shelfLocation}</td>
                    <td>{b.totalCopies}</td>
                    <td>
                      <strong style={{ color: b.availableCopies > 0 ? '#059669' : '#3B82F6' }}>
                        {b.availableCopies} available
                      </strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="lib-row-btn"
                        onClick={() => {
                          libraryService.createReservation({
                            bookId: b.id,
                            memberId: 'mem-teach-1',
                            notes: `Teaching reference hold by ${currentUser.name}`,
                          });
                          addToast('success', 'Hold Placed', `Classroom reference hold placed for "${b.title}".`);
                        }}
                      >
                        Request for Class
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: FULL LIBRARIAN DASHBOARD & OPERATIONS
  // (Scenario B: Mrs. Sunita Verma, Scenario C: Mr. Rajesh Kumar, or School Admin)
  // =========================================================================
  return (
    <div className="lib-container">
      {/* Duty Banner */}
      <div className="lib-duty-banner">
        <div className="lib-duty-content">
          <div className="lib-duty-icon-badge">
            <BookMarked size={26} />
          </div>
          <div>
            <div className="lib-duty-title">
              {settings.libraryName}
              <span className="lib-duty-tag">
                {currentRole === 'school_admin'
                  ? 'Administrator Clearance'
                  : teacherAssignment
                  ? teacherAssignment.roleTitle
                  : 'Operations Desk'}
              </span>
            </div>
            <p className="lib-duty-subtitle">
              Duty Officer: <strong>{currentUser.name}</strong> • Branch: {settings.branchName} • Accession Prefix: {settings.accessionPrefix}
            </p>
          </div>
        </div>

        <div className="lib-duty-actions">
          <button type="button" className="lib-duty-btn" onClick={() => setActiveTab('fast-issue')}>
            <ArrowRightLeft size={14} /> Fast Issue Desk
          </button>
          <button type="button" className="lib-duty-btn primary" onClick={() => setIsAddBookModalOpen(true)}>
            <Plus size={14} /> Catalog New Title
          </button>
        </div>
      </div>

      {/* 13 Operational Tabs Navigation */}
      <div className="lib-tabs-bar">
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={14} /> Command Overview
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'catalogue' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalogue')}
        >
          <BookMarked size={14} /> Book Catalogue
          <span className="lib-tab-badge">{books.length}</span>
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'fast-issue' ? 'active' : ''}`}
          onClick={() => setActiveTab('fast-issue')}
        >
          <ArrowRightLeft size={14} /> Fast Issue Desk
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'receive-return' ? 'active' : ''}`}
          onClick={() => setActiveTab('receive-return')}
        >
          <CalendarCheck size={14} /> Receive Return
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'loans' ? 'active' : ''}`}
          onClick={() => setActiveTab('loans')}
        >
          <Clock size={14} /> Active Loans
          <span className="lib-tab-badge">{stats.issuedCopies}</span>
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          <AlertTriangle size={14} /> Overdue Watch
          {stats.overdueCount > 0 && <span className="lib-tab-badge" style={{ background: '#3B82F6' }}>{stats.overdueCount}</span>}
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          <RotateCcw size={14} /> Reservations
          <span className="lib-tab-badge">{stats.pendingReservationsCount}</span>
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={14} /> Member Directory
          <span className="lib-tab-badge">{members.length}</span>
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'fines' ? 'active' : ''}`}
          onClick={() => setActiveTab('fines')}
        >
          <IndianRupee size={14} /> Fines & Waivers
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'stock-audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock-audit')}
        >
          <Barcode size={14} /> Stock Verification
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'acquisitions' ? 'active' : ''}`}
          onClick={() => setActiveTab('acquisitions')}
        >
          <Package size={14} /> Acquisitions
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={14} /> Reports
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={14} /> Policy & Delegation
        </button>
      </div>

      {/* KPI Metric Counter Cards */}
      <div className="lib-kpi-grid">
        <div className="lib-kpi-card">
          <div className="lib-kpi-icon crimson">
            <BookMarked size={22} />
          </div>
          <div>
            <div className="lib-kpi-val">{stats.totalTitles}</div>
            <div className="lib-kpi-label">Catalogued Titles</div>
            <div className="lib-kpi-sub">{stats.totalPhysicalCopies} Physical Copies</div>
          </div>
        </div>

        <div className="lib-kpi-card">
          <div className="lib-kpi-icon emerald">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="lib-kpi-val">{stats.availableCopies}</div>
            <div className="lib-kpi-label">Available on Shelf</div>
            <div className="lib-kpi-sub">Ready for checkout</div>
          </div>
        </div>

        <div className="lib-kpi-card">
          <div className="lib-kpi-icon blue">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <div className="lib-kpi-val">{stats.issuedCopies}</div>
            <div className="lib-kpi-label">Active Loans</div>
            <div className="lib-kpi-sub">In circulation</div>
          </div>
        </div>

        <div className="lib-kpi-card">
          <div className="lib-kpi-icon amber">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="lib-kpi-val" style={{ color: stats.overdueCount > 0 ? '#3B82F6' : '#0f172a' }}>
              {stats.overdueCount}
            </div>
            <div className="lib-kpi-label">Overdue Books</div>
            <div className="lib-kpi-sub">Beyond grace period</div>
          </div>
        </div>

        <div className="lib-kpi-card">
          <div className="lib-kpi-icon crimson">
            <IndianRupee size={22} />
          </div>
          <div>
            <div className="lib-kpi-val">₹{stats.pendingFinesTotal}</div>
            <div className="lib-kpi-label">Unpaid Fines</div>
            <div className="lib-kpi-sub">Collection pending</div>
          </div>
        </div>

        <div className="lib-kpi-card">
          <div className="lib-kpi-icon purple">
            <Users size={22} />
          </div>
          <div>
            <div className="lib-kpi-val">{stats.activeMembersCount}</div>
            <div className="lib-kpi-label">Active Members</div>
            <div className="lib-kpi-sub">Students & Teachers</div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          TAB 1: COMMAND OVERVIEW
         =================================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Overdue alert card if overdue loans exist */}
          {stats.overdueCount > 0 && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={20} color="#3B82F6" />
                <div>
                  <strong style={{ color: '#991b1b', fontSize: '14px' }}>Circulation Warning: {stats.overdueCount} Overdue Books</strong>
                  <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                    Books currently past due date with assessed daily fines. Automated reminder notices are recommended.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="lib-row-btn primary"
                onClick={() => setActiveTab('overdue')}
              >
                Review Overdue List
              </button>
            </div>
          )}

          {/* Quick Desk Actions Row */}
          <div className="lib-card">
            <div className="lib-card-header">
              <div>
                <h3 className="lib-card-title">Circulation Desk Shortcuts</h3>
                <p className="lib-card-desc">Rapid operations counter for everyday library workflows.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('fast-issue')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', color: '#2563eb' }}>
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Issue Book</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Barcode / Member Card</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('receive-return')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '8px', color: '#059669' }}>
                  <CalendarCheck size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Return Book</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Condition & Fine Check</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsAddBookModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', color: '#3B82F6' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Add Book Title</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ISBN & Classification</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stock-audit')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ background: '#faf5ff', padding: '10px', borderRadius: '8px', color: '#9333ea' }}>
                  <Barcode size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Stock Audit</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Shelf Scanner Session</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Circulation Transactions Table */}
          <div className="lib-card">
            <div className="lib-card-header">
              <div>
                <h3 className="lib-card-title">Recent Circulation Desk Activity</h3>
                <p className="lib-card-desc">Real-time ledger of checkouts, returns, and renewals across the school.</p>
              </div>
              <button type="button" className="lib-row-btn" onClick={() => setActiveTab('loans')}>
                View Full Ledger
              </button>
            </div>

            <div className="lib-table-wrapper">
              <table className="lib-table">
                <thead>
                  <tr>
                    <th>Loan No</th>
                    <th>Accession</th>
                    <th>Book Title</th>
                    <th>Borrower</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.slice(0, 6).map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.loanNumber}</strong></td>
                      <td><span className="lib-accession-code">{l.accessionNumber}</span></td>
                      <td>{l.bookTitle}</td>
                      <td>
                        <strong>{l.borrowerName}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {(l.borrowerType || 'student').toUpperCase()} • {l.borrowerCode || ''}
                        </div>
                      </td>
                      <td>{l.issueDate}</td>
                      <td>
                        <strong style={{ color: l.status === 'overdue' ? '#3B82F6' : '#0f172a' }}>
                          {l.dueDate}
                        </strong>
                      </td>
                      <td>
                        <span className={`lib-status-pill ${l.status}`}>{l.status.toUpperCase()}</span>
                      </td>
                      <td>
                        {l.status !== 'returned' && (
                          <div className="lib-row-actions">
                            <button
                              type="button"
                              className="lib-row-btn"
                              onClick={() => {
                                setReturnAccessionQuery(l.accessionNumber || '');
                                setReturnSelectedLoan(l);
                                setActiveTab('receive-return');
                              }}
                            >
                              Receive
                            </button>
                            <button
                              type="button"
                              className="lib-row-btn"
                              onClick={() => handleRenewLoan(l.id)}
                            >
                              Renew
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 2: BOOK CATALOGUE & PHYSICAL COPIES REGISTER
         =================================================================== */}
      {activeTab === 'catalogue' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Book Catalogue & Bibliographic Database</h2>
              <p className="lib-card-desc">Master catalogued titles, physical copy holdings, and shelf locations.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="lib-duty-btn" onClick={() => setIsBatchCopyModalOpen(true)}>
                <Barcode size={14} /> Batch Generate Copies
              </button>
              <button type="button" className="lib-duty-btn primary" onClick={() => setIsAddBookModalOpen(true)}>
                <Plus size={14} /> Add New Title
              </button>
            </div>
          </div>

          <div className="lib-filter-row">
            <div className="lib-search-box">
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search title, author, ISBN, shelf location..."
                value={searchCatalogue}
                onChange={e => setSearchCatalogue(e.target.value)}
              />
            </div>

            <select
              className="lib-filter-select"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Subjects & Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Title & Bibliographic Info</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Shelf Location</th>
                  <th>Total Copies</th>
                  <th>Available</th>
                  <th>Physical Copies</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        <strong>{b.title}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          ISBN: {b.isbn} • {b.edition || '1st Ed.'} • Pub: {b.publisher}
                        </div>
                      </div>
                    </td>
                    <td>{b.author}</td>
                    <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{b.category}</span></td>
                    <td><span className="lib-accession-code">{b.shelfLocation}</span></td>
                    <td><strong>{b.totalCopies}</strong></td>
                    <td>
                      <strong style={{ color: b.availableCopies > 0 ? '#059669' : '#3B82F6' }}>
                        {b.availableCopies} available
                      </strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="lib-row-btn"
                        onClick={() => setSelectedBookForCopies(b)}
                      >
                        <Eye size={12} /> View Copies ({copies.filter(c => c.bookId === b.id).length})
                      </button>
                    </td>
                    <td>
                      <div className="lib-row-actions">
                        <button
                          type="button"
                          className="lib-row-btn primary"
                          onClick={() => {
                            setIssueSelectedBookId(b.id);
                            setActiveTab('fast-issue');
                          }}
                        >
                          Issue
                        </button>
                        <button
                          type="button"
                          className="lib-row-btn"
                          title="Generate additional copy"
                          onClick={() => {
                            libraryService.createCopy({ bookId: b.id });
                            addToast('success', 'Copy Added', `New physical copy registered for "${b.title}".`);
                          }}
                        >
                          +Copy
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 3: FAST ISSUE COUNTER (Circulation Desk)
         =================================================================== */}
      {activeTab === 'fast-issue' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">
                <ArrowRightLeft size={18} color="#3B82F6" /> Fast Issue Desk
              </h2>
              <p className="lib-card-desc">Scan patron card, verify borrowing limits, and check out books with automated due dates.</p>
            </div>
          </div>

          <form onSubmit={handleExecuteIssue}>
            <div className="lib-desk-grid">
              {/* Step 1: Member Verification */}
              <div className="lib-desk-section">
                <div className="lib-desk-title">
                  <UserCheck size={16} color="#3B82F6" /> Step 1: Member Verification
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Library Card No / Student ID / Admission No</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="lib-form-input"
                      placeholder="e.g. LIB-MEM-STU-001 or stud-1"
                      value={issueMemberQuery}
                      onChange={e => {
                        setIssueMemberQuery(e.target.value);
                        handleMemberSelect(e.target.value);
                      }}
                    />
                    <select
                      className="lib-form-select"
                      style={{ maxWidth: '180px' }}
                      onChange={e => handleMemberSelect(e.target.value)}
                      value={selectedIssueMember?.id || ''}
                    >
                      <option value="">Select Member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.memberType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Real-time Member Eligibility Card */}
                {selectedIssueMember ? (
                  <div className="lib-member-card">
                    <div className="lib-member-header">
                      <div className="lib-member-avatar">
                        {selectedIssueMember.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="lib-member-name">{selectedIssueMember.name}</div>
                        <div className="lib-member-meta">
                          {selectedIssueMember.memberType.toUpperCase()} • {selectedIssueMember.code} • {selectedIssueMember.classOrDepartment}
                        </div>
                      </div>
                      <span className={`lib-status-pill ${selectedIssueMember.status}`}>
                        {selectedIssueMember.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="lib-member-stats">
                      <div>
                        <div className="lib-member-stat-val">
                          {selectedIssueMember.currentIssuedCount} / {selectedIssueMember.maxBorrowLimit}
                        </div>
                        <div className="lib-member-stat-lbl">Active Books</div>
                      </div>
                      <div>
                        <div
                          className="lib-member-stat-val"
                          style={{ color: selectedIssueMember.outstandingFine > 0 ? '#3B82F6' : '#059669' }}
                        >
                          ₹{selectedIssueMember.outstandingFine}
                        </div>
                        <div className="lib-member-stat-lbl">Dues</div>
                      </div>
                      <div>
                        <div className="lib-member-stat-val">
                          {selectedIssueMember.currentIssuedCount < selectedIssueMember.maxBorrowLimit && selectedIssueMember.outstandingFine <= 100 ? (
                            <span style={{ color: '#059669', fontSize: '12px' }}>ELIGIBLE</span>
                          ) : (
                            <span style={{ color: '#3B82F6', fontSize: '12px' }}>BLOCKED</span>
                          )}
                        </div>
                        <div className="lib-member-stat-lbl">Status</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '12.5px' }}>
                    Scan or select a student/teacher member above to verify borrowing eligibility.
                  </div>
                )}
              </div>

              {/* Step 2: Book / Copy Identification */}
              <div className="lib-desk-section">
                <div className="lib-desk-title">
                  <Barcode size={16} color="#3B82F6" /> Step 2: Physical Copy & Checkout
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Physical Copy Accession Number / Barcode Scan</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    placeholder="e.g. LIB-2026-0002 or scan barcode"
                    value={issueAccessionQuery}
                    onChange={e => setIssueAccessionQuery(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                    Or select title from catalogue dropdown below:
                  </span>
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Select Book Title</label>
                  <select
                    className="lib-form-select"
                    value={issueSelectedBookId}
                    onChange={e => {
                      setIssueSelectedBookId(e.target.value);
                      const copy = copies.find(c => c.bookId === e.target.value && c.status === 'available');
                      if (copy) setIssueAccessionQuery(copy.accessionNumber);
                    }}
                  >
                    <option value="">-- Choose Catalogue Title --</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                        {b.title} ({b.availableCopies} available on shelf)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Borrow Duration (Days)</label>
                  <input
                    type="number"
                    className="lib-form-input"
                    value={issueCustomDays}
                    onChange={e => setIssueCustomDays(Number(e.target.value))}
                    min={1}
                    max={60}
                  />
                </div>

                <button
                  type="submit"
                  className="lib-duty-btn primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '10px' }}
                  disabled={!selectedIssueMember}
                >
                  <CheckCircle size={16} /> Confirm Issue & Print Slip
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================
          TAB 4: RECEIVE RETURN COUNTER
         =================================================================== */}
      {activeTab === 'receive-return' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">
                <CalendarCheck size={18} color="#059669" /> Receive Book Return Desk
              </h2>
              <p className="lib-card-desc">Scan returned book barcode, inspect physical wear/damage, compute overdue fines, and reconcile stock.</p>
            </div>
          </div>

          <form onSubmit={handleExecuteReturn}>
            <div className="lib-desk-grid">
              <div className="lib-desk-section">
                <div className="lib-desk-title">
                  <Barcode size={16} color="#059669" /> 1. Scan / Enter Returned Copy
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Accession Number / Barcode / Loan Number</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    placeholder="e.g. LIB-2026-0005 or LN-2026-0003"
                    value={returnAccessionQuery}
                    onChange={e => handleReturnLookup(e.target.value)}
                  />
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Or Select from Active Issued Loans</label>
                  <select
                    className="lib-form-select"
                    onChange={e => {
                      const l = loans.find(item => item.id === e.target.value);
                      if (l) {
                        setReturnSelectedLoan(l);
                        setReturnAccessionQuery(l.accessionNumber || '');
                      }
                    }}
                    value={returnSelectedLoan?.id || ''}
                  >
                    <option value="">-- Choose Active Loan --</option>
                    {loans
                      .filter(l => l.status === 'borrowed' || l.status === 'issued' || l.status === 'overdue')
                      .map(l => (
                        <option key={l.id} value={l.id}>
                          {l.accessionNumber} — {l.bookTitle} (Borrower: {l.borrowerName})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Return Loan Summary */}
                {returnSelectedLoan && (
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', marginTop: '14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{returnSelectedLoan.bookTitle}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Accession: <span className="lib-accession-code">{returnSelectedLoan.accessionNumber}</span> • Loan: {returnSelectedLoan.loanNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Borrower: <strong>{returnSelectedLoan.borrowerName}</strong> ({returnSelectedLoan.borrowerCode})
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '6px' }}>
                      Issue Date: {returnSelectedLoan.issueDate} • Due Date: <strong>{returnSelectedLoan.dueDate}</strong>
                    </div>

                    {/* Overdue calculation check */}
                    {new Date().toISOString().split('T')[0] > returnSelectedLoan.dueDate && (
                      <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#3B82F6' }}>
                        <strong>Overdue Alert:</strong> Book is overdue. Fine policy applies beyond {settings.gracePeriodDays} days grace period.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Physical Wear & Inspection */}
              <div className="lib-desk-section">
                <div className="lib-desk-title">
                  <ShieldCheck size={16} color="#059669" /> 2. Physical Inspection & Return
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Physical Copy Condition Evaluation</label>
                  <select
                    className="lib-form-select"
                    value={returnCondition}
                    onChange={e => setReturnCondition(e.target.value as LibraryCopy['condition'])}
                  >
                    <option value="good">Good Condition — Normal Wear</option>
                    <option value="fair">Fair Condition — Acceptable</option>
                    <option value="damaged">Damaged — Torn Spine / Pages (+ ₹150 Penalty)</option>
                  </select>
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Librarian Return Inspection Remarks</label>
                  <textarea
                    className="lib-form-textarea"
                    rows={3}
                    placeholder="Any observations, missing pages, or condition notes..."
                    value={returnRemarks}
                    onChange={e => setReturnRemarks(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="lib-duty-btn primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '10px' }}
                  disabled={!returnSelectedLoan}
                >
                  <CheckCircle size={16} /> Confirm Return & Reconcile Stock
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================
          TAB 5: ACTIVE LOANS & CIRCULATION LEDGER
         =================================================================== */}
      {activeTab === 'loans' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Circulation Loans Ledger</h2>
              <p className="lib-card-desc">Comprehensive history of active loans, issued copies, and renewal extensions.</p>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Accession</th>
                  <th>Book Title</th>
                  <th>Borrower Details</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Renewals</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.loanNumber || l.id}</strong></td>
                    <td><span className="lib-accession-code">{l.accessionNumber}</span></td>
                    <td><strong>{l.bookTitle}</strong></td>
                    <td>
                      <div><strong>{l.borrowerName}</strong></div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {(l.borrowerType || 'student').toUpperCase()} • {l.borrowerCode || ''} • {l.borrowerClassOrDept || ''}
                      </div>
                    </td>
                    <td>{l.issueDate}</td>
                    <td>
                      <strong style={{ color: l.status === 'overdue' ? '#3B82F6' : '#0f172a' }}>
                        {l.dueDate}
                      </strong>
                    </td>
                    <td>{l.renewalCount || 0} of {settings.maxRenewals}</td>
                    <td><span className={`lib-status-pill ${l.status}`}>{l.status.toUpperCase()}</span></td>
                    <td>
                      {l.status !== 'returned' && (
                        <div className="lib-row-actions">
                          <button
                            type="button"
                            className="lib-row-btn"
                            onClick={() => handleRenewLoan(l.id)}
                          >
                            Renew
                          </button>
                          <button
                            type="button"
                            className="lib-row-btn primary"
                            onClick={() => {
                              setReturnAccessionQuery(l.accessionNumber || '');
                              setReturnSelectedLoan(l);
                              setActiveTab('receive-return');
                            }}
                          >
                            Return
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 6: OVERDUE WATCH & REMINDERS
         =================================================================== */}
      {activeTab === 'overdue' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Overdue Register & Reminder System</h2>
              <p className="lib-card-desc">Overdue loans exceeding the {settings.gracePeriodDays}-day grace period, with auto-assessed ₹{settings.finePerDayOverdue}/day fines.</p>
            </div>
            <button
              type="button"
              className="lib-duty-btn primary"
              onClick={() => {
                addToast('success', 'Reminders Dispatched', `Automated SMS & in-app alerts sent to all patrons with overdue books.`);
              }}
            >
              <Send size={14} /> Broadcast All Overdue SMS
            </button>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Accession No</th>
                  <th>Book Title</th>
                  <th>Borrower</th>
                  <th>Class / Dept</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Assessed Fine</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.filter(l => l.status === 'overdue' || (l.status === 'borrowed' && l.dueDate < new Date().toISOString().split('T')[0])).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No overdue books currently recorded. Excellent circulation compliance!
                    </td>
                  </tr>
                ) : (
                  loans
                    .filter(l => l.status === 'overdue' || (l.status === 'borrowed' && l.dueDate < new Date().toISOString().split('T')[0]))
                    .map(l => (
                      <tr key={l.id}>
                        <td><span className="lib-accession-code">{l.accessionNumber}</span></td>
                        <td><strong>{l.bookTitle}</strong></td>
                        <td><strong>{l.borrowerName}</strong></td>
                        <td>{l.borrowerClassOrDept}</td>
                        <td style={{ color: '#3B82F6', fontWeight: 700 }}>{l.dueDate}</td>
                        <td>
                          <span className="lib-status-pill overdue">
                            {Math.max(1, Math.ceil((Date.now() - new Date(l.dueDate).getTime()) / (1000 * 60 * 60 * 24)))} days
                          </span>
                        </td>
                        <td><strong>₹{l.fineAmount || 20}</strong></td>
                        <td>
                          <button
                            type="button"
                            className="lib-row-btn"
                            onClick={() => {
                              addToast('info', 'Notice Dispatched', `Reminder SMS dispatched to ${l.borrowerName}.`);
                            }}
                          >
                            <Send size={12} /> Send Alert
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 7: RESERVATIONS & HOLDS QUEUE
         =================================================================== */}
      {activeTab === 'reservations' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Book Reservations & Hold Stacks</h2>
              <p className="lib-card-desc">Queued reservation requests. When a book is returned, copies are allocated to the next waiting member.</p>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Book Title</th>
                  <th>Member Name</th>
                  <th>Category</th>
                  <th>Queue Pos</th>
                  <th>Allocated Copy</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id}>
                    <td>{r.requestDate}</td>
                    <td><strong>{r.bookTitle}</strong></td>
                    <td>{r.memberName} ({r.memberCode})</td>
                    <td>{r.memberType.toUpperCase()}</td>
                    <td>#{r.queuePosition}</td>
                    <td>
                      {r.allocatedAccessionNo ? (
                        <span className="lib-accession-code">{r.allocatedAccessionNo}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Awaiting Return</span>
                      )}
                    </td>
                    <td><span className={`lib-status-pill ${r.status}`}>{r.status.toUpperCase()}</span></td>
                    <td>
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          className="lib-row-btn"
                          onClick={() => {
                            libraryService.cancelReservation(r.id);
                            addToast('info', 'Cancelled', 'Reservation cancelled.');
                          }}
                        >
                          Cancel Hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 8: MEMBER DIRECTORY
         =================================================================== */}
      {activeTab === 'members' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Unified Library Members Directory</h2>
              <p className="lib-card-desc">Registered students, faculty members, and staff with borrowing limits and active loans.</p>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Member Code</th>
                  <th>Name</th>
                  <th>Role / Category</th>
                  <th>Class / Department</th>
                  <th>Email & Phone</th>
                  <th>Active Loans</th>
                  <th>Outstanding Fine</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td><span className="lib-accession-code">{m.code}</span></td>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.memberType.toUpperCase()}</td>
                    <td>{m.classOrDepartment}</td>
                    <td>
                      <div>{m.email}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{m.phone}</div>
                    </td>
                    <td>
                      <strong>{m.currentIssuedCount}</strong> of {m.maxBorrowLimit}
                    </td>
                    <td>
                      <span style={{ color: m.outstandingFine > 0 ? '#3B82F6' : '#059669', fontWeight: 700 }}>
                        ₹{m.outstandingFine}
                      </span>
                    </td>
                    <td><span className={`lib-status-pill ${m.status}`}>{m.status.toUpperCase()}</span></td>
                    <td>
                      <div className="lib-row-actions">
                        <button
                          type="button"
                          className="lib-row-btn"
                          onClick={() => {
                            setSelectedIssueMember(m);
                            setIssueMemberQuery(m.name);
                            setActiveTab('fast-issue');
                          }}
                        >
                          Issue Book
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 9: FINES & AUTHORIZED WAIVERS
         =================================================================== */}
      {activeTab === 'fines' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Library Fines & Administrative Waivers</h2>
              <p className="lib-card-desc">Collection counter for overdue charges, damage penalties, and authorized waivers.</p>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Fine Ref</th>
                  <th>Member</th>
                  <th>Book Title & Accession</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fines.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.fineNumber}</strong></td>
                    <td>
                      <strong>{f.memberName}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{f.memberCode}</div>
                    </td>
                    <td>
                      <div>{f.bookTitle}</div>
                      {f.accessionNumber && <span className="lib-accession-code">{f.accessionNumber}</span>}
                    </td>
                    <td><span style={{ textTransform: 'capitalize' }}>{f.reason}</span></td>
                    <td>₹{f.amount}</td>
                    <td><strong style={{ color: f.balance > 0 ? '#DC2626' : '#059669' }}>₹{f.balance}</strong></td>
                    <td><span className={`lib-status-pill ${f.status}`}>{f.status.toUpperCase()}</span></td>
                    <td>
                      {f.status === 'pending' && (
                        <div className="lib-row-actions">
                          <button
                            type="button"
                            className="lib-row-btn primary"
                            onClick={() => handleExecutePayFine(f)}
                          >
                            Collect ₹{f.balance}
                          </button>
                          <button
                            type="button"
                            className="lib-row-btn"
                            onClick={() => {
                              setSelectedFineForWaive(f);
                              setIsWaiveFineModalOpen(true);
                            }}
                          >
                            Waive
                          </button>
                        </div>
                      )}
                      {f.status === 'waived' && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Reason: {f.waiverReason || 'Authorized waiver'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 10: PHYSICAL STOCK VERIFICATION SESSIONS
         =================================================================== */}
      {activeTab === 'stock-audit' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Physical Stock Verification & Audit Sessions</h2>
              <p className="lib-card-desc">Annual shelf inventory verification using barcode scanner input gun.</p>
            </div>
            <button
              type="button"
              className="lib-duty-btn primary"
              onClick={() => {
                const sessionName = prompt('Enter Audit Session Name:', `Q${Math.ceil((new Date().getMonth() + 1) / 3)} Physical Stock Audit ${new Date().getFullYear()}`);
                if (sessionName) {
                  const audit = libraryService.createAuditSession({ sessionName, initiatedBy: currentUser.name });
                  setActiveAuditScanSession(audit.id);
                  addToast('success', 'Audit Opened', `Session "${audit.sessionName}" created.`);
                }
              }}
            >
              <Plus size={14} /> Open New Audit Session
            </button>
          </div>

          {/* Barcode Scanner Gun Simulator */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a' }}>
              Barcode Scanner Input Terminal
            </h3>

            <form onSubmit={handleScanInAudit} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="lib-form-input"
                placeholder="Scan physical copy barcode or enter accession number (e.g. LIB-2026-0001)..."
                value={auditScanInput}
                onChange={e => setAuditScanInput(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px' }}
              />
              <button type="submit" className="lib-duty-btn primary" style={{ padding: '0 20px' }}>
                <Barcode size={16} /> Record Scan
              </button>
            </form>

            {lastScanResult && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  background: lastScanResult.type === 'success' ? '#ecfdf5' : lastScanResult.type === 'warn' ? '#fffbeb' : '#fef2f2',
                  color: lastScanResult.type === 'success' ? '#047857' : lastScanResult.type === 'warn' ? '#b45309' : '#b91c1c',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                {lastScanResult.msg}
              </div>
            )}
          </div>

          {/* Active Audits Table */}
          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Audit Session Name</th>
                  <th>Start Date</th>
                  <th>Verified Copies</th>
                  <th>Total Registered</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.sessionName}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Initiated by {a.verifiedBy}</div>
                    </td>
                    <td>{a.startDate}</td>
                    <td><strong style={{ color: '#059669' }}>{a.verifiedCopiesCount}</strong></td>
                    <td>{a.totalRegisteredCopies}</td>
                    <td>
                      <div style={{ width: '120px', background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, (a.verifiedCopiesCount / (a.totalRegisteredCopies || 1)) * 100)}%`,
                            background: '#059669',
                            height: '100%',
                          }}
                        />
                      </div>
                    </td>
                    <td><span className={`lib-status-pill ${a.status}`}>{a.status.toUpperCase()}</span></td>
                    <td>
                      {a.status === 'in_progress' && (
                        <button
                          type="button"
                          className="lib-row-btn primary"
                          onClick={() => {
                            if (window.confirm('Finalize and lock this audit session?')) {
                              libraryService.finalizeAuditSession(a.id);
                              addToast('success', 'Audit Finalized', `Session "${a.sessionName}" finalized.`);
                            }
                          }}
                        >
                          Finalize Session
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 11: ACQUISITIONS & ACCESSION BATCHING
         =================================================================== */}
      {activeTab === 'acquisitions' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Library Acquisitions & Accession Generator</h2>
              <p className="lib-card-desc">Batch accession assignment for newly delivered textbook bundles.</p>
            </div>
            <button type="button" className="lib-duty-btn primary" onClick={() => setIsBatchCopyModalOpen(true)}>
              <Plus size={14} /> Batch Ingest Copies
            </button>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0' }}>Institutional Accession Prefix Rules</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 14px 0' }}>
              Standard format: <code>{settings.accessionPrefix}-[SEQ_NUMBER]</code>. Every individual physical copy is assigned a permanent, non-reusable accession number.
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>Current Highest Accession: <strong>{settings.accessionPrefix}-{String(copies.length).padStart(4, '0')}</strong></div>
              <div>Next Available Accession: <strong style={{ color: '#059669' }}>{settings.accessionPrefix}-{String(copies.length + 1).padStart(4, '0')}</strong></div>
            </div>
          </div>

          <div className="lib-table-wrapper">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Accession No</th>
                  <th>Barcode</th>
                  <th>Book Title</th>
                  <th>Acquisition Date</th>
                  <th>Condition</th>
                  <th>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {copies.slice(-10).reverse().map(c => (
                  <tr key={c.id}>
                    <td><span className="lib-accession-code">{c.accessionNumber}</span></td>
                    <td><code>{c.barcode}</code></td>
                    <td><strong>{c.bookTitle}</strong></td>
                    <td>{c.acquisitionDate}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{c.condition}</span></td>
                    <td><span className={`lib-status-pill ${c.status}`}>{c.status.toUpperCase()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 12: CIRCULATION REPORTS & ANALYTICS
         =================================================================== */}
      {activeTab === 'reports' && (
        <div className="lib-card">
          <div className="lib-card-header">
            <div>
              <h2 className="lib-card-title">Circulation Analytics & Intelligence</h2>
              <p className="lib-card-desc">Most borrowed titles, subject distribution, and collection health.</p>
            </div>
            <button
              type="button"
              className="lib-duty-btn"
              onClick={() => addToast('info', 'Report Exported', 'Circulation ledger exported as CSV report.')}
            >
              <Download size={14} /> Export Report
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 12px 0' }}>Most Borrowed Titles</h3>
              <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '12.5px', color: '#1e293b' }}>
                <li style={{ padding: '6px 0' }}><strong>Concepts of Physics (Vol 1 & 2)</strong> — 34 checkouts</li>
                <li style={{ padding: '6px 0' }}><strong>Clean Code: Agile Software Craftsmanship</strong> — 28 checkouts</li>
                <li style={{ padding: '6px 0' }}><strong>Wings of Fire: An Autobiography</strong> — 22 checkouts</li>
                <li style={{ padding: '6px 0' }}><strong>Secondary School Mathematics for Class 10</strong> — 19 checkouts</li>
                <li style={{ padding: '6px 0' }}><strong>Oxford Student Atlas for India</strong> — 15 checkouts</li>
              </ol>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 12px 0' }}>Category Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Science & Physics</span>
                  <strong>{copies.filter(c => c.bookTitle.includes('Physics')).length} copies</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Computer Science</span>
                  <strong>{copies.filter(c => c.bookTitle.includes('Code') || c.bookTitle.includes('Algorithms')).length} copies</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Mathematics</span>
                  <strong>{copies.filter(c => c.bookTitle.includes('Mathematics')).length} copies</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biographies</span>
                  <strong>{copies.filter(c => c.bookTitle.includes('Wings')).length} copies</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 13: INSTITUTIONAL POLICY & TEACHER DELEGATION
         =================================================================== */}
      {activeTab === 'settings' && (
        <div>
          {/* Institutional Circulation Policy Rules */}
          <div className="lib-card">
            <div className="lib-card-header">
              <div>
                <h2 className="lib-card-title">Circulation & Borrowing Policy Parameters</h2>
                <p className="lib-card-desc">School-wide rules governing student/teacher loan durations, grace periods, and fine rates.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="lib-form-group">
                <label className="lib-form-label">Student Borrow Duration (Days)</label>
                <input
                  type="number"
                  className="lib-form-input"
                  value={settings.studentBorrowDurationDays}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSettings(prev => ({ ...prev, studentBorrowDurationDays: val }));
                    libraryService.updateSettings({ studentBorrowDurationDays: val });
                  }}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Teacher Borrow Duration (Days)</label>
                <input
                  type="number"
                  className="lib-form-input"
                  value={settings.teacherBorrowDurationDays}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSettings(prev => ({ ...prev, teacherBorrowDurationDays: val }));
                    libraryService.updateSettings({ teacherBorrowDurationDays: val });
                  }}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Daily Overdue Fine (₹/Day)</label>
                <input
                  type="number"
                  className="lib-form-input"
                  value={settings.finePerDayOverdue}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSettings(prev => ({ ...prev, finePerDayOverdue: val }));
                    libraryService.updateSettings({ finePerDayOverdue: val });
                  }}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Grace Period (Days)</label>
                <input
                  type="number"
                  className="lib-form-input"
                  value={settings.gracePeriodDays}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSettings(prev => ({ ...prev, gracePeriodDays: val }));
                    libraryService.updateSettings({ gracePeriodDays: val });
                  }}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Student Max Books Allowed</label>
                <input
                  type="number"
                  className="lib-form-input"
                  value={settings.studentMaxBooks}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSettings(prev => ({ ...prev, studentMaxBooks: val }));
                    libraryService.updateSettings({ studentMaxBooks: val });
                  }}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Teacher Max Books Allowed</label>
                <input
                  type="number"
                  className="lib-form-input"
                  value={settings.teacherMaxBooks}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSettings(prev => ({ ...prev, teacherMaxBooks: val }));
                    libraryService.updateSettings({ teacherMaxBooks: val });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Teacher Staff Delegation Table (Librarian Under Teacher Role) */}
          <div className="lib-card">
            <div className="lib-card-header">
              <div>
                <h2 className="lib-card-title">
                  <ShieldCheck size={18} color="#3B82F6" /> Teacher Staff Assignments (Librarian Delegations)
                </h2>
                <p className="lib-card-desc">
                  Appointed faculty teachers managing library operations without requiring a separate login role.
                </p>
              </div>
              {currentRole === 'school_admin' && (
                <button type="button" className="lib-duty-btn primary" onClick={() => setIsAssignStaffModalOpen(true)}>
                  <Plus size={14} /> Assign Teacher to Library
                </button>
              )}
            </div>

            <div className="lib-table-wrapper">
              <table className="lib-table">
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Staff ID</th>
                    <th>Department</th>
                    <th>Appointed Role Title</th>
                    <th>Delegated Permissions</th>
                    <th>Assigned Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAssignments.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.teacherName}</strong></td>
                      <td><span className="lib-accession-code">{a.staffId}</span></td>
                      <td>{a.department}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: a.roleTitle === 'Head Librarian' ? '#3B82F6' : '#2563eb' }}>
                          {a.roleTitle}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {a.permissions.includes('*') ? 'All Permissions (*)' : `${a.permissions.length} granular permissions`}
                        </span>
                      </td>
                      <td>{a.assignedDate}</td>
                      <td><span className={`lib-status-pill ${a.status === 'active' ? 'available' : 'maintenance'}`}>{a.status.toUpperCase()}</span></td>
                      <td>
                        {currentRole === 'school_admin' && a.status === 'active' && (
                          <button
                            type="button"
                            className="lib-row-btn"
                            onClick={() => handleRevokeStaff(a.id, a.teacherName)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          SLIDING DRAWER: PHYSICAL COPIES OF A BOOK
         =================================================================== */}
      {selectedBookForCopies && (
        <div className="lib-drawer-overlay" onClick={() => setSelectedBookForCopies(null)}>
          <div className="lib-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="lib-drawer-header">
              <div>
                <h3 className="lib-drawer-title">{selectedBookForCopies.title}</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  ISBN: {selectedBookForCopies.isbn} • {selectedBookForCopies.author}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookForCopies(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="lib-drawer-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                  Physical Copies ({copies.filter(c => c.bookId === selectedBookForCopies.id).length})
                </span>
                <button
                  type="button"
                  className="lib-row-btn primary"
                  onClick={() => {
                    libraryService.createCopy({ bookId: selectedBookForCopies.id });
                    addToast('success', 'Copy Added', `New copy registered for "${selectedBookForCopies.title}".`);
                  }}
                >
                  + Add New Copy
                </button>
              </div>

              <div className="lib-table-wrapper">
                <table className="lib-table">
                  <thead>
                    <tr>
                      <th>Accession</th>
                      <th>Barcode</th>
                      <th>Condition</th>
                      <th>Status</th>
                      <th>Shelf Rack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copies
                      .filter(c => c.bookId === selectedBookForCopies.id)
                      .map(c => (
                        <tr key={c.id}>
                          <td><span className="lib-accession-code">{c.accessionNumber}</span></td>
                          <td><code>{c.barcode}</code></td>
                          <td>
                            <select
                              value={c.condition}
                              onChange={e => {
                                libraryService.updateCopyStatus(c.id, c.status, e.target.value as LibraryCopy['condition']);
                                addToast('info', 'Condition Updated', `Copy ${c.accessionNumber} marked as ${e.target.value}.`);
                              }}
                              className="lib-filter-select"
                              style={{ padding: '2px 6px', fontSize: '11px' }}
                            >
                              <option value="good">Good</option>
                              <option value="fair">Fair</option>
                              <option value="damaged">Damaged</option>
                            </select>
                          </td>
                          <td><span className={`lib-status-pill ${c.status}`}>{c.status.toUpperCase()}</span></td>
                          <td>{c.shelfLocation || selectedBookForCopies.shelfLocation}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: ADD NEW BOOK CATALOGUE RECORD
         =================================================================== */}
      {isAddBookModalOpen && (
        <div className="lib-drawer-overlay" onClick={() => setIsAddBookModalOpen(false)}>
          <div
            className="lib-card"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '90%', margin: 'auto' }}
          >
            <div className="lib-card-header">
              <h3 className="lib-card-title">Catalog New Book Title</h3>
              <button
                type="button"
                onClick={() => setIsAddBookModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBook}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="lib-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="lib-form-label">Book Title *</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    required
                    value={newBookForm.title}
                    onChange={e => setNewBookForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Author / Editor *</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    required
                    value={newBookForm.author}
                    onChange={e => setNewBookForm(prev => ({ ...prev, author: e.target.value }))}
                  />
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">ISBN-13 *</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    required
                    value={newBookForm.isbn}
                    onChange={e => setNewBookForm(prev => ({ ...prev, isbn: e.target.value }))}
                  />
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Subject Category</label>
                  <select
                    className="lib-form-select"
                    value={newBookForm.category}
                    onChange={e => setNewBookForm(prev => ({ ...prev, category: e.target.value, subject: e.target.value }))}
                  >
                    <option value="Science & Physics">Science & Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Biography & Inspiration">Biography & Inspiration</option>
                    <option value="Geography & Reference">Geography & Reference</option>
                    <option value="English Literature">English Literature</option>
                    <option value="General Reference">General Reference</option>
                  </select>
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Publisher</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    value={newBookForm.publisher}
                    onChange={e => setNewBookForm(prev => ({ ...prev, publisher: e.target.value }))}
                  />
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Shelf Location / Rack</label>
                  <input
                    type="text"
                    className="lib-form-input"
                    value={newBookForm.shelfLocation}
                    onChange={e => setNewBookForm(prev => ({ ...prev, shelfLocation: e.target.value }))}
                  />
                </div>

                <div className="lib-form-group">
                  <label className="lib-form-label">Initial Physical Copies Count</label>
                  <input
                    type="number"
                    className="lib-form-input"
                    min={1}
                    max={50}
                    value={newBookForm.totalCopies}
                    onChange={e => setNewBookForm(prev => ({ ...prev, totalCopies: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="lib-duty-btn" onClick={() => setIsAddBookModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="lib-duty-btn primary">
                  Save & Generate Accessions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: BATCH GENERATE PHYSICAL COPIES
         =================================================================== */}
      {isBatchCopyModalOpen && (
        <div className="lib-drawer-overlay" onClick={() => setIsBatchCopyModalOpen(false)}>
          <div
            className="lib-card"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '90%', margin: 'auto' }}
          >
            <div className="lib-card-header">
              <h3 className="lib-card-title">Batch Generate Physical Copies</h3>
              <button
                type="button"
                onClick={() => setIsBatchCopyModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBatchGenerateCopies}>
              <div className="lib-form-group">
                <label className="lib-form-label">Select Book Title</label>
                <select
                  className="lib-form-select"
                  required
                  value={batchBookId}
                  onChange={e => setBatchBookId(e.target.value)}
                >
                  <option value="">-- Choose Catalogue Title --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Currently: {b.totalCopies} copies)
                    </option>
                  ))}
                </select>
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Number of Copies to Ingest</label>
                <input
                  type="number"
                  className="lib-form-input"
                  min={1}
                  max={30}
                  value={batchQuantity}
                  onChange={e => setBatchQuantity(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="lib-duty-btn" onClick={() => setIsBatchCopyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="lib-duty-btn primary">
                  Generate Copies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: AUTHORIZED FINE WAIVER
         =================================================================== */}
      {isWaiveFineModalOpen && selectedFineForWaive && (
        <div className="lib-drawer-overlay" onClick={() => setIsWaiveFineModalOpen(false)}>
          <div
            className="lib-card"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '460px', width: '90%', margin: 'auto' }}
          >
            <div className="lib-card-header">
              <h3 className="lib-card-title">Authorize Fine Waiver</h3>
              <button
                type="button"
                onClick={() => setIsWaiveFineModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteWaiveFine}>
              <div style={{ marginBottom: '14px', fontSize: '13px' }}>
                <div>Borrower: <strong>{selectedFineForWaive.memberName}</strong></div>
                <div>Amount to Waive: <strong style={{ color: '#3B82F6' }}>₹{selectedFineForWaive.balance}</strong></div>
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Administrative Exemption Reason *</label>
                <textarea
                  className="lib-form-textarea"
                  required
                  rows={3}
                  placeholder="e.g. Student represented school in National Olympiad - Principal approval ref #442..."
                  value={waiverReasonInput}
                  onChange={e => setWaiverReasonInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="lib-duty-btn" onClick={() => setIsWaiveFineModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="lib-duty-btn primary">
                  Confirm Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: ASSIGN TEACHER TO LIBRARY (School Admin Only)
         =================================================================== */}
      {isAssignStaffModalOpen && (
        <div className="lib-drawer-overlay" onClick={() => setIsAssignStaffModalOpen(false)}>
          <div
            className="lib-card"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '90%', margin: 'auto' }}
          >
            <div className="lib-card-header">
              <h3 className="lib-card-title">Assign Teacher Library Responsibility</h3>
              <button
                type="button"
                onClick={() => setIsAssignStaffModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTeacher}>
              <div className="lib-form-group">
                <label className="lib-form-label">Select Faculty Member</label>
                <select
                  className="lib-form-select"
                  value={assignForm.teacherId}
                  onChange={e => {
                    const id = e.target.value;
                    if (id === 'teach-2') {
                      setAssignForm(prev => ({
                        ...prev,
                        teacherId: 'teach-2',
                        teacherName: 'Mr. Rajesh Kumar',
                        staffId: 'STAFF-102',
                        department: 'Science',
                        roleTitle: 'Library In-charge',
                      }));
                    } else if (id === 'teach-5') {
                      setAssignForm(prev => ({
                        ...prev,
                        teacherId: 'teach-5',
                        teacherName: 'Mrs. Sunita Verma',
                        staffId: 'STAFF-105',
                        department: 'Social Science / Library',
                        roleTitle: 'Head Librarian',
                      }));
                    } else if (id === 'teach-1') {
                      setAssignForm(prev => ({
                        ...prev,
                        teacherId: 'teach-1',
                        teacherName: 'Mrs. Ananya Sharma',
                        staffId: 'STAFF-101',
                        department: 'Mathematics',
                        roleTitle: 'Library In-charge',
                      }));
                    }
                  }}
                >
                  <option value="teach-5">Mrs. Sunita Verma (STAFF-105)</option>
                  <option value="teach-2">Mr. Rajesh Kumar (STAFF-102)</option>
                  <option value="teach-1">Mrs. Ananya Sharma (STAFF-101)</option>
                </select>
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Library Duty Role Title</label>
                <select
                  className="lib-form-select"
                  value={assignForm.roleTitle}
                  onChange={e => setAssignForm(prev => ({ ...prev, roleTitle: e.target.value as any }))}
                >
                  <option value="Head Librarian">Head Librarian (Universal Full Access)</option>
                  <option value="Library In-charge">Library In-charge (Circulation & Desk)</option>
                  <option value="Assistant Librarian">Assistant Librarian</option>
                  <option value="Stock Auditor">Stock Auditor (Verification Only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="lib-duty-btn" onClick={() => setIsAssignStaffModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="lib-duty-btn primary">
                  Assign Responsibility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
