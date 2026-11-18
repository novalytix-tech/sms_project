// ==========================================
// Student Admission & Enrollment Service
// Upgraded Complete School Admission Management System
// Developed by NTS Novalytix
// ==========================================

import { AdmissionApplication, AdmissionStage, AdmissionDocument, AdmissionChecklist, Student, PaymentMethodType, AdmissionEnquiry, AdmissionFollowUp, AdmissionAssessment, AdmissionOffer, ClassAdmissionCapacity, AdmissionAuditLog, LostReason } from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';
import { classService } from './classService';

import { INITIAL_CLASS_CAPACITIES } from '../data/admissionSeedData';
import { todayISO } from '../utils/date';

export const STANDARD_ADMISSION_DOCUMENTS: Array<{ id: string; title: string; required: boolean; category?: string }> = [
  { id: 'doc-birth', title: 'Birth Certificate / Proof of Date of Birth', required: true, category: 'Identity' },
  { id: 'doc-tc', title: 'Previous School Transfer Certificate (TC)', required: true, category: 'Transfer' },
  { id: 'doc-report', title: 'Previous Grade Academic Marksheet / Report Card', required: true, category: 'Academic' },
  { id: 'doc-address', title: 'Address / Residence Proof (Aadhaar / Utility Bill)', required: true, category: 'Address' },
  { id: 'doc-guardian', title: 'Parent / Guardian Photo ID & Contact Card', required: true, category: 'Identity' },
  { id: 'doc-photo', title: 'Student Passport Photographs (4 Copies)', required: true, category: 'Identity' },
  { id: 'doc-caste', title: 'Caste / Category Certificate (if applicable)', required: false, category: 'Category' },
  { id: 'doc-medical', title: 'Medical Fitness & Blood Group Certificate', required: false, category: 'Medical' },
];

export const admissionService = {
  // =========================================================
  // APPLICATION RETRIEVAL & LOOKUPS
  // =========================================================
  getAll: (): AdmissionApplication[] => {
    return ERPStorage.get().admissions || [];
  },

  getById: (id: string): AdmissionApplication | undefined => {
    return (ERPStorage.get().admissions || []).find(a => a.id === id);
  },

  getByApplicationNo: (appNo: string): AdmissionApplication | undefined => {
    return (ERPStorage.get().admissions || []).find(
      a => a.applicationNo.toLowerCase() === appNo.toLowerCase().trim()
    );
  },

  /**
   * Detect duplicate applicant vs sibling application
   */
  detectDuplicate: (
    data: {
      firstName: string;
      lastName: string;
      dob: string;
      parentPhone: string;
      parentEmail?: string;
    }
  ): { isDuplicate: boolean; isSibling: boolean; matchedApplication?: AdmissionApplication; message?: string } => {
    const apps = admissionService.getAll();
    const students = studentService.getAll();

    const cleanFirst = data.firstName.trim().toLowerCase();
    const cleanLast = data.lastName.trim().toLowerCase();
    const cleanPhone = (data.parentPhone || '').replace(/\D/g, '');

    // 1. Exact match: Same student name + same date of birth
    const exactAppMatch = apps.find(a => 
      a.firstName.trim().toLowerCase() === cleanFirst &&
      a.lastName.trim().toLowerCase() === cleanLast &&
      a.dob === data.dob
    );
    if (exactAppMatch) {
      return {
        isDuplicate: true,
        isSibling: false,
        matchedApplication: exactAppMatch,
        message: `An admission record already exists for ${data.firstName} ${data.lastName} (DOB: ${data.dob}) under reference ${exactAppMatch.applicationNo} (Current Stage: ${exactAppMatch.stage}).`,
      };
    }

    const exactStudentMatch = students.find(s => 
      s.firstName.trim().toLowerCase() === cleanFirst &&
      s.lastName.trim().toLowerCase() === cleanLast &&
      s.dob === data.dob
    );
    if (exactStudentMatch) {
      return {
        isDuplicate: true,
        isSibling: false,
        message: `${data.firstName} ${data.lastName} (DOB: ${data.dob}) is already an officially enrolled student under Admission No: ${exactStudentMatch.admissionNo} in ${exactStudentMatch.className}.`,
      };
    }

    // 2. Sibling match: Same parent contact phone or email, but distinct child name or DOB
    const siblingApp = apps.find(a => {
      const aPhone = (a.parentPhone || '').replace(/\D/g, '');
      const matchPhone = cleanPhone.length >= 7 && aPhone.includes(cleanPhone.slice(-7));
      const matchEmail = Boolean(data.parentEmail && a.parentEmail && a.parentEmail.trim().toLowerCase() === data.parentEmail.trim().toLowerCase());
      const isDifferentChild = a.firstName.trim().toLowerCase() !== cleanFirst || a.dob !== data.dob;
      return (matchPhone || matchEmail) && isDifferentChild;
    });

    const siblingStudent = students.find(s => {
      const sPhone = (s.parentPhone || '').replace(/\D/g, '');
      const matchPhone = cleanPhone.length >= 7 && sPhone.includes(cleanPhone.slice(-7));
      const matchEmail = Boolean(data.parentEmail && s.parentEmail && s.parentEmail.trim().toLowerCase() === data.parentEmail.trim().toLowerCase());
      const isDifferentChild = s.firstName.trim().toLowerCase() !== cleanFirst || s.dob !== data.dob;
      return (matchPhone || matchEmail) && isDifferentChild;
    });

    if (siblingApp || siblingStudent) {
      const sibLabel = siblingApp ? `applicant ${siblingApp.firstName} ${siblingApp.lastName} (${siblingApp.applicationNo})` : `student ${siblingStudent!.fullName} (${siblingStudent!.admissionNo})`;
      return {
        isDuplicate: false,
        isSibling: true,
        message: `Sibling link verified: Shared parent contact with existing ${sibLabel}.`,
      };
    }

    return { isDuplicate: false, isSibling: false };
  },

  /**
   * Create a new Admission Inquiry / Application (preserves full backward compatibility)
   */
  createInquiry: (
    data: Omit<
      AdmissionApplication,
      'id' | 'applicationNo' | 'stage' | 'statusHistory' | 'documents' | 'checklist' | 'isFeePaid' | 'createdAt' | 'updatedAt'
    >,
    author = 'Admissions Desk'
  ): { success: boolean; data?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    // Check for duplicate applicant
    const dupCheck = admissionService.detectDuplicate({
      firstName: data.firstName,
      lastName: data.lastName,
      dob: data.dob,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
    });

    if (dupCheck.isDuplicate) {
      return { success: false, error: dupCheck.message };
    }

    // Generate unique Application Reference: APP-2026-xxxx
    let uniqueNum = Math.floor(1000 + Math.random() * 9000);
    while (store.admissions.some(a => a.applicationNo === `APP-2026-${uniqueNum}`)) {
      uniqueNum = Math.floor(1000 + Math.random() * 9000);
    }
    const applicationNo = `APP-2026-${uniqueNum}`;

    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const dateStr = now.toISOString().split('T')[0];

    const documents: AdmissionDocument[] = STANDARD_ADMISSION_DOCUMENTS.map(doc => ({
      id: doc.id,
      title: doc.title,
      required: doc.required,
      submitted: false,
      verified: false,
    }));

    const checklist: AdmissionChecklist = {
      contactVerified: true,
      documentsVerified: false,
      interactionCompleted: false,
      principalApproved: false,
      feeCleared: false,
    };

    const initialNotes = dupCheck.isSibling
      ? `New admission inquiry registered. (${dupCheck.message})`
      : 'New admission inquiry registered.';

    const newApp: AdmissionApplication = {
      ...data,
      id: `adm-app-${Date.now()}`,
      applicationNo,
      stage: 'inquiry',
      statusHistory: [
        {
          stage: 'inquiry',
          timestamp: timestampStr,
          changedBy: author,
          notes: initialNotes,
        },
      ],
      documents,
      checklist,
      isFeePaid: false,
      admissionFeeAmount: data.admissionFeeAmount || 25000,
      feeAmountPaid: 0,
      feeOutstanding: data.admissionFeeAmount || 25000,
      createdAt: dateStr,
      updatedAt: dateStr,
      institutionId: (data as any).institutionId || 'inst-1',
    };

    store.admissions = [newApp, ...store.admissions];
    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Application',
      entityId: applicationNo,
      action: 'APPLICATION_CREATED',
      performedBy: author,
      userRole: 'Admission Staff',
      details: `New admission reference ${applicationNo} initiated for ${data.firstName} ${data.lastName}.`,
      newValue: 'inquiry',
    });

    return { success: true, data: newApp };
  },

  /**
   * Update Application Details
   */
  updateApplication: (
    id: string,
    updates: Partial<AdmissionApplication>,
    changedBy = 'Admissions Officer'
  ): { success: boolean; data?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const index = store.admissions.findIndex(a => a.id === id);
    if (index === -1) {
      return { success: false, error: 'Admission application record not found.' };
    }

    const existing = store.admissions[index];

    // Prevent modifying enrolled records in a way that breaks enrollment link
    if (existing.stage === 'enrolled' && updates.stage && updates.stage !== 'enrolled') {
      return {
        success: false,
        error: 'Cannot change stage of an enrolled student. Use student directory management.',
      };
    }

    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const dateStr = now.toISOString().split('T')[0];

    const updated: AdmissionApplication = {
      ...existing,
      ...updates,
      updatedAt: dateStr,
    };

    // If stage was updated, log status history
    if (updates.stage && updates.stage !== existing.stage) {
      updated.statusHistory = [
        ...existing.statusHistory,
        {
          stage: updates.stage,
          timestamp: timestampStr,
          changedBy,
          notes: updates.reviewRemarks || `Workflow stage updated to ${updates.stage}.`,
        },
      ];

      admissionService.logAudit({
        entityType: 'Application',
        entityId: existing.applicationNo,
        action: 'STAGE_UPDATED',
        performedBy: changedBy,
        userRole: 'Admission Staff',
        details: `Stage updated from ${existing.stage} to ${updates.stage}.`,
        previousValue: existing.stage,
        newValue: updates.stage,
      });
    }

    store.admissions[index] = updated;
    ERPStorage.set(store);

    return { success: true, data: updated };
  },

  /**
   * Transition admission stage with validations
   */
  updateStage: (
    id: string,
    newStage: AdmissionStage,
    changedBy: string,
    notes?: string,
    rejectionReason?: string
  ): { success: boolean; data?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const index = store.admissions.findIndex(a => a.id === id);
    if (index === -1) return { success: false, error: 'Application not found.' };

    const app = store.admissions[index];

    if (app.stage === 'enrolled') {
      return { success: false, error: 'Applicant is already officially enrolled and cannot change stages.' };
    }

    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const dateStr = now.toISOString().split('T')[0];

    // Checklist updates based on stage
    const nextChecklist = { ...app.checklist };
    if (newStage === 'approved') {
      nextChecklist.principalApproved = true;
    }

    const updated: AdmissionApplication = {
      ...app,
      stage: newStage,
      checklist: nextChecklist,
      reviewRemarks: notes || app.reviewRemarks,
      rejectionReason: newStage === 'rejected' ? rejectionReason || notes : app.rejectionReason,
      updatedAt: dateStr,
      statusHistory: [
        ...app.statusHistory,
        {
          stage: newStage,
          timestamp: timestampStr,
          changedBy,
          notes: notes || (newStage === 'rejected' ? `Rejected: ${rejectionReason}` : `Transitioned to ${newStage}`),
        },
      ],
    };

    store.admissions[index] = updated;
    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Application',
      entityId: app.applicationNo,
      action: newStage === 'rejected' ? 'APPLICATION_REJECTED' : 'STAGE_TRANSITION',
      performedBy: changedBy,
      userRole: 'Administrator',
      details: notes || `Application transitioned to ${newStage}.`,
      previousValue: app.stage,
      newValue: newStage,
    });

    return { success: true, data: updated };
  },

  /**
   * Verify an uploaded document requirement
   */
  verifyDocument: (
    applicationId: string,
    documentId: string,
    verified: boolean,
    notes?: string
  ): { success: boolean; data?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const app = store.admissions.find(a => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    const doc = app.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, error: 'Document requirement not found.' };

    doc.submitted = true;
    doc.verified = verified;
    doc.verificationDate = verified ? todayISO() : undefined;
    if (notes) doc.notes = notes;

    // Check if all required documents are verified
    const allRequiredVerified = app.documents.filter(d => d.required).every(d => d.verified);
    app.checklist.documentsVerified = allRequiredVerified;
    app.documentStatus = allRequiredVerified ? 'Verified' : 'Under Verification';
    app.updatedAt = todayISO();

    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Document',
      entityId: `${app.applicationNo}/${doc.title}`,
      action: verified ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_UNVERIFIED',
      performedBy: 'Document Verifier',
      userRole: 'Staff',
      details: `${doc.title} ${verified ? 'marked as verified' : 'verification revoked'}. ${notes || ''}`,
    });

    return { success: true, data: app };
  },

  /**
   * Reject a document with a reason and request re-upload
   */
  rejectDocument: (
    applicationId: string,
    documentId: string,
    rejectionReason: string,
    author = 'Document Verifier'
  ): { success: boolean; data?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const app = store.admissions.find(a => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    const doc = app.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, error: 'Document not found.' };

    doc.verified = false;
    (doc as any).status = 'Rejected';
    (doc as any).rejectionReason = rejectionReason;
    app.checklist.documentsVerified = false;
    app.documentStatus = 'Rejected';
    app.stage = 'documents_pending';
    app.updatedAt = todayISO();

    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Document',
      entityId: `${app.applicationNo}/${doc.title}`,
      action: 'DOCUMENT_REJECTED',
      performedBy: author,
      userRole: 'Document Verifier',
      details: `Document ${doc.title} rejected: ${rejectionReason}. Re-upload requested.`,
    });

    return { success: true, data: app };
  },

  /**
   * Update Checklist Items
   */
  updateChecklist: (
    applicationId: string,
    checklistUpdates: Partial<AdmissionChecklist>
  ): { success: boolean; data?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const app = store.admissions.find(a => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    app.checklist = {
      ...app.checklist,
      ...checklistUpdates,
    };
    app.updatedAt = todayISO();

    ERPStorage.set(store);
    return { success: true, data: app };
  },

  /**
   * Record Admission Fee Payment (handles full and partial payments on the application)
   */
  recordAdmissionFee: (
    applicationId: string,
    paymentMethod: PaymentMethodType = 'UPI',
    remarks?: string,
    amountToPay?: number,
    recordedBy = 'Finance Counter'
  ): { success: boolean; data?: AdmissionApplication; invoiceNo?: string; receiptNo?: string; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const app = store.admissions.find(a => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    const totalFee = Number(app.admissionFeeAmount) || 25000;
    const currentPaid = Number(app.feeAmountPaid) || 0;
    const payAmount = amountToPay !== undefined ? Number(amountToPay) : totalFee - currentPaid;

    if (payAmount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    if (currentPaid + payAmount > totalFee) {
      return { success: false, error: `Payment cannot exceed total admission fee of ₹${totalFee.toLocaleString('en-IN')}.` };
    }

    const academicYear = app.academicYear || '2026-2027';
    const invoiceNo = `INV-ADM/${academicYear}/${app.applicationNo.replace('APP-', '')}`;
    const receiptNo = `REC-ADM/${academicYear}/${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Admission fees are tracked on the application record only (demo admissions module).
    // Real student fee invoices live in the backend finance API (services/feeService.ts).

    const newTotalPaid = currentPaid + payAmount;
    const newOutstanding = totalFee - newTotalPaid;
    const isFullyPaid = newOutstanding === 0;

    app.feeAmountPaid = newTotalPaid;
    app.feeOutstanding = newOutstanding;
    app.isFeePaid = isFullyPaid;
    app.checklist.feeCleared = isFullyPaid;
    app.paymentStatus = isFullyPaid ? 'Paid' : 'Partially Paid';

    if (!app.feePaymentHistory) app.feePaymentHistory = [];
    app.feePaymentHistory.push({
      id: `pay-${Date.now()}`,
      receiptNo,
      amount: payAmount,
      paymentMethod,
      transactionRef: `ADM-TXN-${Date.now().toString().slice(-6)}`,
      paymentDate: dateStr,
      notes: remarks,
      recordedBy,
    });

    // Transition stage if under review or approved
    if (app.stage === 'fee_pending' && isFullyPaid) {
      app.stage = 'approved';
    }

    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);
    app.statusHistory.push({
      stage: app.stage,
      timestamp: timestampStr,
      changedBy: recordedBy,
      notes: `Admission fee of ₹${payAmount.toLocaleString('en-IN')} received (${receiptNo}). Remaining balance: ₹${newOutstanding.toLocaleString('en-IN')}.`,
    });

    app.updatedAt = dateStr;
    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Fee',
      entityId: app.applicationNo,
      action: 'FEE_PAYMENT_RECORDED',
      performedBy: recordedBy,
      userRole: 'Accounts Desk',
      details: `Received ₹${payAmount.toLocaleString('en-IN')} via ${paymentMethod} (Receipt: ${receiptNo}).`,
    });

    return { success: true, data: app, invoiceNo, receiptNo };
  },

  /**
   * Final Enrollment: Generates Official Admission Number, Checks Seat Capacity, Creates Student in studentService
   */
  enrollApplicant: (
    applicationId: string,
    options: {
      rollNo?: string;
      section?: string;
      busRouteId?: string;
      busStop?: string;
      enrolledBy?: string;
      allowUnverifiedDocsOverride?: boolean;
      allowFeePendingEnrollment?: boolean;
      allowCapacityOverride?: boolean;
    }
  ): { success: boolean; student?: Student; application?: AdmissionApplication; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissions) store.admissions = [];

    const app = store.admissions.find(a => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    if (app.stage === 'enrolled' || app.assignedAdmissionNo) {
      return { success: false, error: `Applicant is already enrolled under admission number ${app.assignedAdmissionNo}.` };
    }

    if (app.stage === 'rejected' || app.stage === 'withdrawn') {
      return { success: false, error: 'Cannot enroll an applicant whose status is Rejected or Withdrawn.' };
    }

    // 1. Validate mandatory document verification before enrollment
    const unverifiedRequired = (app.documents || []).filter(d => d.required && !d.verified);
    if (unverifiedRequired.length > 0 && !options.allowUnverifiedDocsOverride) {
      return {
        success: false,
        error: `Cannot complete enrollment: ${unverifiedRequired.length} mandatory document(s) pending verification (${unverifiedRequired.map(d => d.title).join(', ')}).`,
      };
    }

    // 2. Validate admission fee clearance before enrollment
    if (!app.isFeePaid && !options.allowFeePendingEnrollment) {
      return {
        success: false,
        error: 'Cannot complete enrollment: Admission and registration fee has not been cleared.',
      };
    }

    // 3. Validate seat capacity for target class
    const capacity = admissionService.checkCapacity(app.targetClassId);
    if (capacity.isFull && !options.allowCapacityOverride) {
      return {
        success: false,
        error: `Cannot complete enrollment: ${app.targetClassName} has reached maximum capacity (${capacity.totalSeats} seats filled). Principal override required to exceed capacity.`,
      };
    }

    // Generate unique official admission number: ADM-2026-xxx
    let seq = Math.floor(100 + Math.random() * 900);
    while (studentService.getByAdmissionNo(`ADM-2026-${seq}`)) {
      seq = Math.floor(100 + Math.random() * 900);
    }
    const admissionNo = `ADM-2026-${seq}`;

    // Target Class Details
    const classes = classService.getAll();
    const targetClass = classes.find(c => c.id === app.targetClassId) || classes[0];
    const section = options.section || app.targetSection || targetClass?.section || 'A';
    const rollNo = options.rollNo || `${targetClass?.name.replace('Class ', '') || '10'}${section}-${Math.floor(10 + Math.random() * 89)}`;

    const dateStr = todayISO();
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Call studentService.create
    const createRes = studentService.create({
      admissionNo,
      firstName: app.firstName,
      lastName: app.lastName,
      fullName: `${app.firstName.trim()} ${app.lastName.trim()}`,
      gender: app.gender,
      dob: app.dob,
      bloodGroup: app.bloodGroup || 'O+',
      classId: targetClass?.id || 'cls-10a',
      className: targetClass?.name || 'Class 10',
      section,
      rollNo,
      academicYear: app.academicYear || '2026-2027',
      admissionDate: dateStr,
      parentName: app.parentName,
      parentPhone: app.parentPhone,
      parentEmail: app.parentEmail,
      address: `${app.address}, ${app.city}, ${app.state} - ${app.pincode}`,
      transportRouteId: options.busRouteId || '',
      busStop: options.busStop || '',
      status: 'active',
      avatar: app.firstName.charAt(0),
    });

    if (!createRes.success || !createRes.data) {
      return { success: false, error: createRes.error || 'Failed to create student record in directory.' };
    }

    // Update application stage to 'enrolled'
    app.stage = 'enrolled';
    app.enrolledStudentId = createRes.data.id;
    app.assignedAdmissionNo = admissionNo;
    app.enrolledDate = dateStr;
    app.updatedAt = dateStr;
    app.checklist.principalApproved = true;

    app.statusHistory.push({
      stage: 'enrolled',
      timestamp: timestampStr,
      changedBy: options.enrolledBy || 'School Admin',
      notes: `Officially enrolled! Assigned admission number: ${admissionNo}, Roll No: ${rollNo}, Class: ${targetClass.name} (${section}).`,
    });

    // Update Class Admission Capacity
    admissionService.incrementClassAdmission(targetClass.id);

    // If converted from enquiry, mark enquiry as confirmed
    if (app.linkedEnquiryId) {
      admissionService.updateEnquiry(app.linkedEnquiryId, {
        status: 'Converted',
        remarks: `Enrolment finalized as ${admissionNo}.`,
      });
    }

    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Enrollment',
      entityId: `${app.applicationNo} / ${admissionNo}`,
      action: 'OFFICIAL_ENROLLMENT_COMPLETED',
      performedBy: options.enrolledBy || 'School Admin',
      userRole: 'Administrator',
      details: `${createRes.data.fullName} enrolled into ${targetClass.name} (${section}) with Admission No ${admissionNo}.`,
      newValue: 'enrolled',
    });

    return { success: true, student: createRes.data, application: app };
  },

  /**
   * Summary stage counts for KPI metrics (Preserves exact backward compatibility)
   */
  getStageSummary: (): Record<AdmissionStage, number> => {
    const apps = admissionService.getAll();
    const summary: Record<AdmissionStage, number> = {
      inquiry: 0,
      application_started: 0,
      application_submitted: 0,
      documents_pending: 0,
      under_review: 0,
      approved: 0,
      fee_pending: 0,
      enrolled: 0,
      rejected: 0,
      withdrawn: 0,
    };

    apps.forEach(a => {
      if (summary[a.stage] !== undefined) {
        summary[a.stage]++;
      }
    });

    return summary;
  },

  // =========================================================
  // ENQUIRY MANAGEMENT MODULE
  // =========================================================
  getAllEnquiries: (filters?: {
    search?: string;
    status?: string;
    source?: string;
    classId?: string;
    session?: string;
    counsellor?: string;
  }): AdmissionEnquiry[] => {
    const store = ERPStorage.get();
    let enquiries: AdmissionEnquiry[] = store.admissionEnquiries || [];

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        enquiries = enquiries.filter(
          e =>
            e.enquiryNo.toLowerCase().includes(q) ||
            e.studentName.toLowerCase().includes(q) ||
            e.parentName.toLowerCase().includes(q) ||
            e.mobileNumber.includes(q)
        );
      }
      if (filters.status && filters.status !== 'all') {
        enquiries = enquiries.filter(e => e.status === filters.status);
      }
      if (filters.source && filters.source !== 'all') {
        enquiries = enquiries.filter(e => e.source === filters.source);
      }
      if (filters.classId && filters.classId !== 'all') {
        enquiries = enquiries.filter(e => e.interestedClassId === filters.classId);
      }
      if (filters.session && filters.session !== 'all') {
        enquiries = enquiries.filter(e => e.academicSession === filters.session);
      }
      if (filters.counsellor && filters.counsellor !== 'all') {
        enquiries = enquiries.filter(e => e.assignedCounsellor === filters.counsellor);
      }
    }

    return enquiries;
  },

  getEnquiryById: (id: string): AdmissionEnquiry | undefined => {
    const store = ERPStorage.get();
    return (store.admissionEnquiries || []).find(e => e.id === id);
  },

  /**
   * Create an Admission Enquiry with duplicate detection
   */
  createEnquiry: (
    data: Omit<AdmissionEnquiry, 'id' | 'enquiryNo' | 'createdAt' | 'updatedAt'>,
    author = 'Admissions Counsellor'
  ): { success: boolean; data?: AdmissionEnquiry; warning?: string; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissionEnquiries) store.admissionEnquiries = [];

    // Duplicate detection by phone number or student name + dob
    const cleanPhone = (data.mobileNumber || '').replace(/\D/g, '');
    const cleanName = data.studentName.toLowerCase().trim();

    const existingMatch = store.admissionEnquiries.find(e => {
      const ePhone = (e.mobileNumber || '').replace(/\D/g, '');
      const matchPhone = cleanPhone.length >= 7 && ePhone.includes(cleanPhone.slice(-7));
      const matchName = e.studentName.toLowerCase().trim() === cleanName && e.dob === data.dob;
      return matchPhone || matchName;
    });

    let warningMessage: string | undefined;
    if (existingMatch) {
      if (existingMatch.studentName.toLowerCase().trim() === cleanName && existingMatch.dob === data.dob) {
        return {
          success: false,
          error: `An enquiry record already exists for ${data.studentName} under ${existingMatch.enquiryNo} (Status: ${existingMatch.status}).`,
        };
      } else {
        warningMessage = `Sibling / family link detected: Phone matches existing enquiry ${existingMatch.enquiryNo} (${existingMatch.studentName}).`;
      }
    }

    let uniqueSeq = Math.floor(100 + Math.random() * 900);
    while (store.admissionEnquiries.some(e => e.enquiryNo === `ENQ-2026-0${uniqueSeq}`)) {
      uniqueSeq = Math.floor(100 + Math.random() * 900);
    }
    const enquiryNo = `ENQ-2026-0${uniqueSeq}`;
    const dateStr = todayISO();

    const newEnquiry: AdmissionEnquiry = {
      ...data,
      id: `enq-${Date.now()}`,
      enquiryNo,
      status: data.status || 'New',
      academicSession: data.academicSession || '2026-2027',
      institutionId: data.institutionId || 'inst-1',
      createdAt: dateStr,
      updatedAt: dateStr,
    };

    store.admissionEnquiries = [newEnquiry, ...store.admissionEnquiries];
    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Enquiry',
      entityId: enquiryNo,
      action: 'ENQUIRY_REGISTERED',
      performedBy: author,
      userRole: 'Admission Counsellor',
      details: `New enquiry registered for ${data.studentName} (${data.interestedClassName}) via ${data.source}.`,
      newValue: newEnquiry.status,
    });

    return { success: true, data: newEnquiry, warning: warningMessage };
  },

  updateEnquiry: (
    id: string,
    updates: Partial<AdmissionEnquiry>,
    author = 'Admission Counsellor'
  ): { success: boolean; data?: AdmissionEnquiry; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissionEnquiries) store.admissionEnquiries = [];

    const index = store.admissionEnquiries.findIndex(e => e.id === id);
    if (index === -1) return { success: false, error: 'Enquiry record not found.' };

    const existing = store.admissionEnquiries[index];
    const dateStr = todayISO();

    const updated: AdmissionEnquiry = {
      ...existing,
      ...updates,
      updatedAt: dateStr,
    };

    store.admissionEnquiries[index] = updated;
    ERPStorage.set(store);

    if (updates.status && updates.status !== existing.status) {
      admissionService.logAudit({
        entityType: 'Enquiry',
        entityId: existing.enquiryNo,
        action: 'ENQUIRY_STATUS_CHANGED',
        performedBy: author,
        userRole: 'Admission Counsellor',
        details: `Status transitioned from ${existing.status} to ${updates.status}.`,
        previousValue: existing.status,
        newValue: updates.status,
      });
    }

    return { success: true, data: updated };
  },

  markEnquiryLost: (
    id: string,
    reason: LostReason | string,
    author = 'Admission Counsellor'
  ): { success: boolean; data?: AdmissionEnquiry; error?: string } => {
    return admissionService.updateEnquiry(
      id,
      {
        status: 'Lost',
        lostReason: reason,
      },
      author
    );
  },

  /**
   * Converts an Enquiry into an official Application Form, preserving original source, ID and history
   */
  convertEnquiryToApplication: (
    enquiryId: string,
    initialData?: Partial<AdmissionApplication>,
    author = 'Admission Desk'
  ): { success: boolean; application?: AdmissionApplication; error?: string } => {
    const enquiry = admissionService.getEnquiryById(enquiryId);
    if (!enquiry) return { success: false, error: 'Enquiry not found.' };

    const nameParts = enquiry.studentName.trim().split(' ');
    const firstName = nameParts[0] || 'Applicant';
    const lastName = nameParts.slice(1).join(' ') || 'Student';

    // Call createInquiry to instantiate application
    const appRes = admissionService.createInquiry(
      {
        firstName,
        lastName,
        gender: enquiry.gender,
        dob: enquiry.dob,
        targetClassId: enquiry.interestedClassId,
        targetClassName: enquiry.interestedClassName,
        targetSection: 'A',
        source: enquiry.source as any,
        academicYear: enquiry.academicSession,
        parentName: enquiry.parentName,
        parentRelation: enquiry.relationship,
        parentPhone: enquiry.mobileNumber,
        parentEmail: enquiry.email,
        address: enquiry.residentialAddress,
        city: 'Kanpur',
        state: 'Uttar Pradesh',
        pincode: '208001',
        previousSchool: enquiry.previousSchool || '',
        admissionFeeAmount: 25000,
        linkedEnquiryId: enquiry.id,
        linkedEnquiryNo: enquiry.enquiryNo,
        assignedCounsellor: enquiry.assignedCounsellor,
        ...initialData,
      },
      author
    );

    if (!appRes.success || !appRes.data) {
      return { success: false, error: appRes.error || 'Failed to convert enquiry to application.' };
    }

    // Update enquiry status to 'Converted'
    admissionService.updateEnquiry(enquiryId, {
      status: 'Converted',
      convertedApplicationId: appRes.data.id,
      convertedApplicationNo: appRes.data.applicationNo,
    });

    admissionService.logAudit({
      entityType: 'Enquiry',
      entityId: enquiry.enquiryNo,
      action: 'ENQUIRY_CONVERTED_TO_APP',
      performedBy: author,
      userRole: 'Admission Counsellor',
      details: `Enquiry ${enquiry.enquiryNo} converted into official Application ${appRes.data.applicationNo}.`,
    });

    return { success: true, application: appRes.data };
  },

  // =========================================================
  // FOLLOW-UP & PARENT COMMUNICATION
  // =========================================================
  getAllFollowUps: (): AdmissionFollowUp[] => {
    const store = ERPStorage.get();
    return store.admissionFollowUps || [];
  },

  createFollowUp: (data: Omit<AdmissionFollowUp, 'id' | 'createdAt'>): AdmissionFollowUp => {
    const store = ERPStorage.get();
    if (!store.admissionFollowUps) store.admissionFollowUps = [];

    const newFollowUp: AdmissionFollowUp = {
      ...data,
      id: `fup-${Date.now()}`,
      createdAt: todayISO(),
      institutionId: data.institutionId || 'inst-1',
    };

    store.admissionFollowUps = [newFollowUp, ...store.admissionFollowUps];
    ERPStorage.set(store);

    if (data.enquiryId) {
      admissionService.updateEnquiry(data.enquiryId, {
        nextFollowUpDate: data.followUpDate,
        status: data.communicationMethod === 'Campus Visit' ? 'Visit Scheduled' : 'Follow-up Required',
      });
    }

    return newFollowUp;
  },

  updateFollowUp: (id: string, updates: Partial<AdmissionFollowUp>): AdmissionFollowUp | undefined => {
    const store = ERPStorage.get();
    if (!store.admissionFollowUps) store.admissionFollowUps = [];

    const index = store.admissionFollowUps.findIndex(f => f.id === id);
    if (index === -1) return undefined;

    const updated = {
      ...store.admissionFollowUps[index],
      ...updates,
    };

    store.admissionFollowUps[index] = updated;
    ERPStorage.set(store);
    return updated;
  },

  getFollowUpBuckets: (todayStr?: string): {
    today: AdmissionFollowUp[];
    overdue: AdmissionFollowUp[];
    upcoming: AdmissionFollowUp[];
    completed: AdmissionFollowUp[];
  } => {
    const all = admissionService.getAllFollowUps();
    const today = todayStr || todayISO();

    const todayItems: AdmissionFollowUp[] = [];
    const overdueItems: AdmissionFollowUp[] = [];
    const upcomingItems: AdmissionFollowUp[] = [];
    const completedItems: AdmissionFollowUp[] = [];

    all.forEach(f => {
      if (f.status === 'Completed') {
        completedItems.push(f);
      } else if (f.followUpDate === today) {
        todayItems.push(f);
      } else if (f.followUpDate < today) {
        overdueItems.push(f);
      } else {
        upcomingItems.push(f);
      }
    });

    return {
      today: todayItems,
      overdue: overdueItems,
      upcoming: upcomingItems,
      completed: completedItems,
    };
  },

  // =========================================================
  // ASSESSMENT & INTERACTION
  // =========================================================
  getAllAssessments: (): AdmissionAssessment[] => {
    const store = ERPStorage.get();
    return store.admissionAssessments || [];
  },

  recordAssessment: (
    data: Omit<AdmissionAssessment, 'id'>,
    author = 'Academic Evaluator'
  ): AdmissionAssessment => {
    const store = ERPStorage.get();
    if (!store.admissionAssessments) store.admissionAssessments = [];

    const newAssessment: AdmissionAssessment = {
      ...data,
      id: `asm-${Date.now()}`,
    };

    store.admissionAssessments = [newAssessment, ...store.admissionAssessments];

    // Update applicant checklist
    const app = store.admissions?.find(a => a.id === data.applicationId);
    if (app) {
      app.checklist.interactionCompleted = true;
      app.assessment = newAssessment;
      if (data.result === 'Passed' || data.result === 'Shortlisted') {
        app.stage = 'approved';
      }
    }

    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Assessment',
      entityId: data.applicationId,
      action: 'ASSESSMENT_RECORDED',
      performedBy: author,
      userRole: 'Academic Evaluator',
      details: `${data.assessmentType} evaluated for ${data.candidateName}. Result: ${data.result}. Marks: ${data.marksObtained || 0}/${data.maxMarks || 100}.`,
    });

    return newAssessment;
  },

  // =========================================================
  // ADMISSION OFFERS & SEAT CAPACITY
  // =========================================================
  getAllOffers: (): AdmissionOffer[] => {
    const store = ERPStorage.get();
    return store.admissionOffers || [];
  },

  generateOffer: (
    data: Omit<AdmissionOffer, 'id' | 'status'>,
    author = 'Dr. Arvind Swaminathan (Principal)'
  ): { success: boolean; offer?: AdmissionOffer; error?: string } => {
    const store = ERPStorage.get();
    if (!store.admissionOffers) store.admissionOffers = [];

    const newOffer: AdmissionOffer = {
      ...data,
      id: `off-${Date.now()}`,
      status: 'Issued',
    };

    store.admissionOffers = [newOffer, ...store.admissionOffers];

    // Update application stage to approved / offered
    const app = store.admissions?.find(a => a.id === data.applicationId);
    if (app) {
      app.stage = 'approved';
      app.checklist.principalApproved = true;
      app.offer = newOffer;
      app.updatedAt = todayISO();
    }

    ERPStorage.set(store);

    admissionService.logAudit({
      entityType: 'Offer',
      entityId: data.applicationId,
      action: 'ADMISSION_OFFER_ISSUED',
      performedBy: author,
      userRole: 'Principal',
      details: `Admission offer letter released for ${data.approvedClassName} (${data.offeredSection}). Valid till ${data.expiryDate}.`,
    });

    return { success: true, offer: newOffer };
  },

  getClassCapacities: (sessionId = '2026-2027'): ClassAdmissionCapacity[] => {
    const store = ERPStorage.get();
    let capacities: ClassAdmissionCapacity[] = store.admissionCapacitySettings || INITIAL_CLASS_CAPACITIES;

    // Recalculate confirmed admissions dynamically from active enrollments & applications
    const enrolledApps = (store.admissions || []).filter(a => a.stage === 'enrolled');

    return capacities.map(cap => {
      const confirmedInClass = enrolledApps.filter(a => a.targetClassId === cap.classId).length;
      const totalConfirmed = Math.max(cap.confirmedAdmissions, confirmedInClass);
      const available = Math.max(0, cap.totalApprovedSeats - totalConfirmed);

      return {
        ...cap,
        confirmedAdmissions: totalConfirmed,
        availableSeats: available,
      };
    });
  },

  checkCapacity: (classId: string, sessionId = '2026-2027'): {
    allowed: boolean;
    availableSeats: number;
    totalSeats: number;
    confirmed: number;
    isNearCapacity: boolean;
    isFull: boolean;
  } => {
    const capacities = admissionService.getClassCapacities(sessionId);
    const cap = capacities.find(c => c.classId === classId) || {
      classId,
      className: 'Selected Class',
      academicSession: sessionId,
      totalApprovedSeats: 80,
      reservedSeats: 5,
      confirmedAdmissions: 0,
      availableSeats: 80,
      waitlistedApplicants: 0,
    };

    const isFull = cap.availableSeats <= 0;
    const isNearCapacity = cap.availableSeats <= 5 && !isFull;

    return {
      allowed: !isFull,
      availableSeats: cap.availableSeats,
      totalSeats: cap.totalApprovedSeats,
      confirmed: cap.confirmedAdmissions,
      isNearCapacity,
      isFull,
    };
  },

  incrementClassAdmission: (classId: string): void => {
    const store = ERPStorage.get();
    if (!store.admissionCapacitySettings) store.admissionCapacitySettings = INITIAL_CLASS_CAPACITIES;

    const target = store.admissionCapacitySettings.find(c => c.classId === classId);
    if (target) {
      target.confirmedAdmissions += 1;
      target.availableSeats = Math.max(0, target.totalApprovedSeats - target.confirmedAdmissions);
      ERPStorage.set(store);
    }
  },

  // =========================================================
  // AUDIT LOGGING MODULE
  // =========================================================
  getAuditLogs: (entityId?: string): AdmissionAuditLog[] => {
    const store = ERPStorage.get();
    const logs: AdmissionAuditLog[] = store.admissionAuditLogs || [];
    if (entityId) {
      return logs.filter(l => l.entityId.includes(entityId));
    }
    return logs;
  },

  logAudit: (log: Omit<AdmissionAuditLog, 'id' | 'timestamp'>): void => {
    const store = ERPStorage.get();
    if (!store.admissionAuditLogs) store.admissionAuditLogs = [];

    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);

    const newLog: AdmissionAuditLog = {
      ...log,
      id: `aud-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp,
    };

    store.admissionAuditLogs = [newLog, ...store.admissionAuditLogs];
    ERPStorage.set(store);
  },
};
