// ==========================================
// Student Enrollment & Session Lifecycle Service
// Developed by NTS Novalytix
// ==========================================

import { StudentEnrollment, Student, User } from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';
import { classService } from './classService';
import { academicSessionService } from './academicSessionService';

export interface EnrollStudentInput {
  studentId: string;
  classId: string;
  section: string;
  sessionId?: string;
  rollNo?: string;
  remarks?: string;
  operator?: User;
}

export interface RegisterAndEnrollInput {
  student: Omit<Student, 'id'>;
  classId: string;
  section: string;
  sessionId?: string;
  rollNo?: string;
  operator?: User;
}

export const enrollmentService = {
  /**
   * Retrieves all enrollment records
   */
  getAll: (): StudentEnrollment[] => {
    return ERPStorage.get().studentEnrollments || [];
  },

  /**
   * Retrieves enrollments for a specific academic session
   */
  getBySession: (sessionId: string): StudentEnrollment[] => {
    return enrollmentService.getAll().filter(e => e.sessionId === sessionId);
  },

  /**
   * Retrieves active enrollments for a given class and section in an academic session
   */
  getActiveEnrollmentsForClass: (
    classId: string,
    sectionOrSessionId?: string,
    sessionId?: string
  ): StudentEnrollment[] => {
    let targetSection: string | undefined;
    let targetSessionId: string;

    if (sectionOrSessionId && sectionOrSessionId.startsWith('sess-')) {
      targetSessionId = sectionOrSessionId;
      targetSection = undefined;
    } else {
      targetSection = sectionOrSessionId;
      targetSessionId = sessionId || academicSessionService.getCurrentSession()?.id || 'sess-2026-27';
    }

    return enrollmentService.getAll().filter(e => {
      const matchSession = e.sessionId === targetSessionId;
      const matchClass = e.classId === classId;
      const matchSection = targetSection ? e.section.toLowerCase() === targetSection.toLowerCase().trim() : true;
      const matchActive = e.status === 'active';
      return matchSession && matchClass && matchSection && matchActive;
    });
  },

  /**
   * Retrieves all enrollments (active, withdrawn, transferred, promoted) for a class
   */
  getAllEnrollmentsForClass: (
    classId: string,
    sectionOrSessionId?: string,
    sessionId?: string
  ): StudentEnrollment[] => {
    let targetSection: string | undefined;
    let targetSessionId: string;

    if (sectionOrSessionId && sectionOrSessionId.startsWith('sess-')) {
      targetSessionId = sectionOrSessionId;
      targetSection = undefined;
    } else {
      targetSection = sectionOrSessionId;
      targetSessionId = sessionId || academicSessionService.getCurrentSession()?.id || 'sess-2026-27';
    }

    return enrollmentService.getAll().filter(e => {
      const matchSession = e.sessionId === targetSessionId;
      const matchClass = e.classId === classId;
      const matchSection = targetSection ? e.section.toLowerCase() === targetSection.toLowerCase().trim() : true;
      return matchSession && matchClass && matchSection;
    });
  },

  /**
   * Retrieves all historical and current enrollments for a specific student
   */
  getEnrollmentHistoryForStudent: (studentId: string): StudentEnrollment[] => {
    return enrollmentService.getAll().filter(e => e.studentId === studentId);
  },

  /**
   * Retrieves active enrollment for a student in a session
   */
  getActiveEnrollmentForStudent: (
    studentId: string,
    sessionId?: string
  ): StudentEnrollment | undefined => {
    const targetSessionId = sessionId || academicSessionService.getCurrentSession().id;
    return enrollmentService
      .getAll()
      .find(e => e.studentId === studentId && e.sessionId === targetSessionId && e.status === 'active');
  },

  /**
   * Calculates accurate class counts based strictly on session enrollment records
   */
  getClassCounts: (
    classId: string,
    sectionOrSessionId?: string,
    sessionId?: string
  ): {
    active: number;
    activeCount: number;
    withdrawn: number;
    transferred: number;
    promoted: number;
    retained: number;
    capacity: number;
    total: number;
  } => {
    let targetSection: string | undefined;
    let targetSessionId: string;

    if (sectionOrSessionId && sectionOrSessionId.startsWith('sess-')) {
      targetSessionId = sectionOrSessionId;
      targetSection = undefined;
    } else {
      targetSection = sectionOrSessionId;
      targetSessionId = sessionId || academicSessionService.getCurrentSession()?.id || 'sess-2026-27';
    }

    const allForClass = enrollmentService.getAllEnrollmentsForClass(classId, targetSection, targetSessionId);
    const cls = classService.getById(classId);

    const active = allForClass.filter(e => e.status === 'active').length;
    const withdrawn = allForClass.filter(e => e.status === 'withdrawn').length;
    const transferred = allForClass.filter(e => e.status === 'transferred').length;
    const promoted = allForClass.filter(e => e.status === 'promoted').length;
    const retained = allForClass.filter(e => e.status === 'retained').length;

    return {
      active,
      activeCount: active,
      withdrawn,
      transferred,
      promoted,
      retained,
      capacity: cls?.capacity || 40,
      total: allForClass.length,
    };
  },

  /**
   * Enrolls an existing student into a class/section for an academic session
   * Reuses the student's permanent ID and admission number. Does not duplicate student record.
   */
  enrollExistingStudent: (
    paramsOrStudentId: EnrollStudentInput | string,
    classIdArg?: string,
    sessionIdArg?: string,
    rollNoArg?: string | number,
    sectionArg?: string,
    operatorArg?: User
  ): { success: boolean; enrollment?: StudentEnrollment; error?: string } => {
    let params: EnrollStudentInput;
    if (typeof paramsOrStudentId === 'string') {
      const cls = classIdArg ? classService.getById(classIdArg) : undefined;
      params = {
        studentId: paramsOrStudentId,
        classId: classIdArg || '',
        section: sectionArg || cls?.section || 'A',
        sessionId: sessionIdArg,
        rollNo: rollNoArg !== undefined ? String(rollNoArg) : undefined,
        operator: operatorArg,
      };
    } else {
      params = paramsOrStudentId;
    }

    const student = studentService.getById(params.studentId);
    if (!student) {
      return { success: false, error: 'Student record not found.' };
    }

    const cls = classService.getById(params.classId);
    if (!cls) {
      return { success: false, error: 'Target class not found.' };
    }

    if (params.operator) {
      if (params.operator.role === 'teacher') {
        const teacherId = params.operator.referenceId || params.operator.id;
        if (cls.classTeacherId !== teacherId) {
          return {
            success: false,
            error: 'Permission denied: Only the assigned class teacher or school administrator can enroll students into this class.',
          };
        }
      } else if (!['school_admin', 'super_admin'].includes(params.operator.role)) {
        return {
          success: false,
          error: 'Permission denied: Insufficient permissions to enroll students.',
        };
      }
    }

    const session = params.sessionId
      ? academicSessionService.getById(params.sessionId)
      : academicSessionService.getCurrentSession();

    if (!session) {
      return { success: false, error: 'Academic session not found.' };
    }

    if (session.status === 'closed') {
      return { success: false, error: `Cannot enroll students into closed session "${session.name}".` };
    }

    const store = ERPStorage.get();
    if (!store.studentEnrollments) store.studentEnrollments = [];

    // Check if student already has an active enrollment in this session
    const existingActive = store.studentEnrollments.find(
      e => e.studentId === student.id && e.sessionId === session.id && e.status === 'active'
    );

    if (existingActive) {
      if (existingActive.classId === cls.id && existingActive.section.toLowerCase() === params.section.toLowerCase()) {
        return {
          success: false,
          error: `${student.fullName} is already actively enrolled in ${cls.name} (${params.section}) for ${session.name}.`,
        };
      } else {
        return {
          success: false,
          error: `${student.fullName} is already enrolled in ${existingActive.className} (${existingActive.section}) for ${session.name}. Use the Transfer action instead.`,
        };
      }
    }

    // Check capacity
    const currentActiveCount = store.studentEnrollments.filter(
      e => e.classId === cls.id && e.section.toLowerCase() === params.section.toLowerCase() && e.sessionId === session.id && e.status === 'active'
    ).length;

    if (cls.capacity && currentActiveCount >= cls.capacity) {
      return {
        success: false,
        error: `Enrollment capacity exceeded: ${cls.name} (${params.section}) has reached its limit of ${cls.capacity} students.`,
      };
    }

    const section = params.section.toUpperCase().trim();
    const rollNo = params.rollNo?.trim() || String(currentActiveCount + 1);

    // Validate class-wise unique roll number
    const duplicateRoll = store.studentEnrollments.find(
      e =>
        e.sessionId === session.id &&
        e.classId === cls.id &&
        e.section.toLowerCase() === section.toLowerCase() &&
        e.status === 'active' &&
        e.studentId !== student.id &&
        (e.rollNo || '').trim().toLowerCase() === rollNo.toLowerCase()
    );
    if (duplicateRoll) {
      const otherStud = store.students.find(s => s.id === duplicateRoll.studentId);
      return {
        success: false,
        error: `Roll Number "${rollNo}" is already assigned to ${otherStud?.fullName || 'another student'} in ${cls.name} (${section}). Roll numbers must be unique within each class.`,
      };
    }

    const newEnrollment: StudentEnrollment = {
      id: `enr-${session.id}-${student.id}-${Date.now().toString().slice(-4)}`,
      studentId: student.id,
      admissionNo: student.admissionNo,
      sessionId: session.id,
      academicYear: session.name,
      classId: cls.id,
      className: cls.name,
      section,
      rollNo,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'active',
      remarks: params.remarks,
      updatedAt: new Date().toISOString(),
    };

    store.studentEnrollments.push(newEnrollment);

    // Update student's current active class pointer
    const sIndex = store.students.findIndex(s => s.id === student.id);
    if (sIndex >= 0) {
      store.students[sIndex] = {
        ...store.students[sIndex],
        classId: cls.id,
        className: cls.name,
        section,
        rollNo,
        academicYear: session.name,
        status: 'active',
      };
    }

    // Recalculate class student count
    const cIndex = store.classes.findIndex(c => c.id === cls.id);
    if (cIndex >= 0) {
      store.classes[cIndex].studentCount = currentActiveCount + 1;
    }

    ERPStorage.set(store);

    return { success: true, enrollment: newEnrollment };
  },

  /**
   * Registers a new student and creates their initial enrollment
   */
  registerAndEnrollNewStudent: (
    paramsOrStudent: any,
    classIdArg?: string,
    sessionIdArg?: string,
    operatorOrTeacherIdArg?: any,
    sectionArg?: string
  ): { success: boolean; student?: Student; enrollment?: StudentEnrollment; error?: string } => {
    let params: RegisterAndEnrollInput;
    if (paramsOrStudent && paramsOrStudent.student) {
      params = paramsOrStudent;
    } else {
      const cls = classIdArg ? classService.getById(classIdArg) : undefined;
      const raw = paramsOrStudent || {};
      const nameParts = (raw.fullName || `${raw.firstName || ''} ${raw.lastName || ''}`).trim().split(' ');
      const firstName = raw.firstName || nameParts[0] || 'Student';
      const lastName = raw.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Kumar');
      const operator = typeof operatorOrTeacherIdArg === 'string'
        ? { id: operatorOrTeacherIdArg, role: 'teacher' as const, referenceId: operatorOrTeacherIdArg }
        : operatorOrTeacherIdArg;

      params = {
        student: {
          admissionNo: raw.admissionNo,
          firstName,
          lastName,
          fullName: raw.fullName || `${firstName} ${lastName}`,
          gender: raw.gender || 'male',
          dob: raw.dob || '2012-01-01',
          bloodGroup: raw.bloodGroup,
          classId: classIdArg || '',
          className: cls?.name || 'Class',
          section: sectionArg || cls?.section || 'A',
          rollNo: raw.rollNo || '1',
          academicYear: '',
          admissionDate: new Date().toISOString().split('T')[0],
          parentName: raw.guardianName || raw.parentName || 'Parent Guardian',
          parentPhone: raw.guardianPhone || raw.parentPhone || '+91 99999 99999',
          parentEmail: raw.guardianEmail || raw.parentEmail || '',
          address: raw.address || '',
          status: 'active',
        },
        classId: classIdArg || '',
        section: sectionArg || cls?.section || 'A',
        sessionId: sessionIdArg,
        rollNo: raw.rollNo,
        operator,
      };
    }

    const store = ERPStorage.get();

    // Validate duplicate admission number
    if (params.student.admissionNo) {
      const duplicateAdm = (store.students || []).some(
        s => s.admissionNo.toLowerCase() === params.student.admissionNo.toLowerCase().trim()
      );
      if (duplicateAdm) {
        return { success: false, error: `Admission number "${params.student.admissionNo}" is already in use.` };
      }
    }

    // Validate duplicate student identity risk
    const cleanFirst = params.student.firstName.trim().toLowerCase();
    const cleanLast = params.student.lastName.trim().toLowerCase();
    const cleanPhone = (params.student.parentPhone || '').replace(/\D/g, '');

    const duplicateStudent = (store.students || []).find(s => {
      const matchName = (s.firstName || '').toLowerCase() === cleanFirst && (s.lastName || '').toLowerCase() === cleanLast;
      const matchDob = s.dob === params.student.dob;
      const matchPhone = cleanPhone.length > 0 && (s.parentPhone || '').replace(/\D/g, '') === cleanPhone;
      return matchName && (matchDob || matchPhone);
    });

    if (duplicateStudent) {
      return {
        success: false,
        error: `Possible duplicate student detected: ${duplicateStudent.fullName} (${duplicateStudent.admissionNo}) already registered with matching name and parent contact.`,
      };
    }

    // Validate target class
    const cls = classService.getById(params.classId);
    if (!cls) {
      return { success: false, error: 'Target class not found.' };
    }

    if (params.operator) {
      if (params.operator.role === 'teacher') {
        const teacherId = params.operator.referenceId || params.operator.id;
        if (cls.classTeacherId !== teacherId) {
          return {
            success: false,
            error: 'Permission denied: Only the assigned class teacher or school administrator can enroll students into this class.',
          };
        }
      } else if (!['school_admin', 'super_admin'].includes(params.operator.role)) {
        return {
          success: false,
          error: 'Permission denied: Insufficient permissions to enroll students.',
        };
      }
    }

    const session = params.sessionId
      ? academicSessionService.getById(params.sessionId)
      : academicSessionService.getCurrentSession();

    if (!session) {
      return { success: false, error: 'Academic session not found.' };
    }

    // Generate unique official admission number if omitted: ADM-YYYY-xxx
    let admissionNo = params.student.admissionNo?.trim();
    if (!admissionNo) {
      let seq = Math.floor(100 + Math.random() * 900);
      while ((store.students || []).some(s => s.admissionNo === `ADM-2026-${seq}`)) {
        seq = Math.floor(100 + Math.random() * 900);
      }
      admissionNo = `ADM-2026-${seq}`;
    }

    const studentId = `stud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const section = params.section.toUpperCase().trim();
    const currentActiveCount = (store.studentEnrollments || []).filter(
      e => e.classId === cls.id && e.section.toLowerCase() === section.toLowerCase() && e.sessionId === session.id && e.status === 'active'
    ).length;
    const rollNo = params.rollNo?.trim() || String(currentActiveCount + 1);

    const duplicateRoll = (store.studentEnrollments || []).find(
      e =>
        e.sessionId === session.id &&
        e.classId === cls.id &&
        e.section.toLowerCase() === section.toLowerCase() &&
        e.status === 'active' &&
        (e.rollNo || '').trim().toLowerCase() === rollNo.toLowerCase()
    );
    if (duplicateRoll) {
      return {
        success: false,
        error: `Roll Number "${rollNo}" is already assigned to another student in ${cls.name} (${section}). Roll numbers must be unique within each class.`,
      };
    }

    const newStudent: Student = {
      ...params.student,
      id: studentId,
      admissionNo,
      fullName: `${params.student.firstName.trim()} ${params.student.lastName.trim()}`,
      classId: cls.id,
      className: cls.name,
      section,
      rollNo,
      academicYear: session.name,
      status: 'active',
    };

    store.students = [newStudent, ...(store.students || [])];

    const newEnrollment: StudentEnrollment = {
      id: `enr-${session.id}-${studentId}`,
      studentId,
      admissionNo,
      sessionId: session.id,
      academicYear: session.name,
      classId: cls.id,
      className: cls.name,
      section,
      rollNo,
      enrollmentDate: params.student.admissionDate || new Date().toISOString().split('T')[0],
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    if (!store.studentEnrollments) store.studentEnrollments = [];
    store.studentEnrollments.push(newEnrollment);

    // Update class student count
    const cIndex = store.classes.findIndex(c => c.id === cls.id);
    if (cIndex >= 0) {
      const activeCount = store.studentEnrollments.filter(
        e => e.classId === cls.id && e.section.toLowerCase() === section.toLowerCase() && e.sessionId === session.id && e.status === 'active'
      ).length;
      store.classes[cIndex].studentCount = activeCount;
    }

    ERPStorage.set(store);

    return { success: true, student: newStudent, enrollment: newEnrollment };
  },

  /**
   * Transfers a student to a different class/section within the same session
   */
  transferStudent: (
    enrollmentId: string,
    newClassId: string,
    newSection: string,
    reason: string,
    operator?: User
  ): { success: boolean; newEnrollment?: StudentEnrollment; error?: string } => {
    const store = ERPStorage.get();
    const enrollments = store.studentEnrollments || [];
    const index = enrollments.findIndex(e => e.id === enrollmentId);
    if (index === -1) {
      return { success: false, error: 'Current enrollment record not found.' };
    }

    const currentEnrollment = enrollments[index];
    if (currentEnrollment.status !== 'active') {
      return { success: false, error: `Cannot transfer student with enrollment status "${currentEnrollment.status}".` };
    }

    const newClass = classService.getById(newClassId);
    if (!newClass) {
      return { success: false, error: 'Destination class not found.' };
    }

    const cleanSection = newSection.toUpperCase().trim();
    if (currentEnrollment.classId === newClassId && currentEnrollment.section.toUpperCase() === cleanSection) {
      return { success: false, error: 'Student is already enrolled in this class and section.' };
    }

    // Mark current enrollment as transferred
    const nowIso = new Date().toISOString();
    currentEnrollment.status = 'transferred';
    currentEnrollment.remarks = `Transferred to ${newClass.name} (${cleanSection}): ${reason.trim()}`;
    currentEnrollment.updatedAt = nowIso;

    // Create new enrollment
    const newEnrollment: StudentEnrollment = {
      id: `enr-${currentEnrollment.sessionId}-${currentEnrollment.studentId}-${Date.now().toString().slice(-4)}`,
      studentId: currentEnrollment.studentId,
      admissionNo: currentEnrollment.admissionNo,
      sessionId: currentEnrollment.sessionId,
      academicYear: currentEnrollment.academicYear,
      classId: newClass.id,
      className: newClass.name,
      section: cleanSection,
      rollNo: currentEnrollment.rollNo,
      enrollmentDate: nowIso.split('T')[0],
      status: 'active',
      previousEnrollmentId: currentEnrollment.id,
      remarks: `Transferred from ${currentEnrollment.className} (${currentEnrollment.section}): ${reason.trim()}`,
      updatedAt: nowIso,
    };

    enrollments.push(newEnrollment);

    // Update student's pointer
    const student = store.students.find(s => s.id === currentEnrollment.studentId);
    if (student) {
      student.classId = newClass.id;
      student.className = newClass.name;
      student.section = cleanSection;
    }

    // Update counts on both classes
    store.classes.forEach(c => {
      c.studentCount = enrollments.filter(
        e => e.classId === c.id && e.section.toLowerCase() === c.section.toLowerCase() && e.sessionId === currentEnrollment.sessionId && e.status === 'active'
      ).length;
    });

    ERPStorage.set(store);

    return { success: true, newEnrollment };
  },

  /**
   * Withdraws a student from active enrollment
   */
  withdrawStudent: (
    enrollmentIdOrStudentId: string,
    reasonOrSessionId: string,
    operatorOrReason?: any
  ): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    const enrollments = store.studentEnrollments || [];
    const index = enrollments.findIndex(
      e => (e.id === enrollmentIdOrStudentId || e.studentId === enrollmentIdOrStudentId) && e.status === 'active'
    );
    if (index === -1) {
      return { success: false, error: 'Active enrollment not found for student.' };
    }

    const currentEnrollment = enrollments[index];
    const reasonText = typeof operatorOrReason === 'string' ? operatorOrReason : reasonOrSessionId;
    currentEnrollment.status = 'withdrawn';
    currentEnrollment.remarks = `Withdrawn on ${new Date().toISOString().split('T')[0]}: ${(reasonText || 'Administrative withdrawal').trim()}`;
    currentEnrollment.updatedAt = new Date().toISOString();

    const student = store.students.find(s => s.id === currentEnrollment.studentId);
    if (student) {
      student.status = 'inactive';
    }

    // Update class student count
    const targetClass = store.classes.find(c => c.id === currentEnrollment.classId);
    if (targetClass) {
      targetClass.studentCount = enrollments.filter(
        e => e.classId === targetClass.id && e.sessionId === currentEnrollment.sessionId && e.status === 'active'
      ).length;
    }

    ERPStorage.set(store);

    return { success: true };
  },
};
