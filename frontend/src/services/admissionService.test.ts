import { describe, it, expect, beforeEach } from 'vitest';
import { admissionService } from './admissionService';
import { ERPStorage } from './storage';

describe('admissionService Admissions & Enrollment Workflows', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves admission applications and enquiries', () => {
    const apps = admissionService.getAll();
    expect(Array.isArray(apps)).toBe(true);

    const enquiries = admissionService.getAllEnquiries();
    expect(Array.isArray(enquiries)).toBe(true);
  });

  it('creates a new enquiry and logs it in the system', () => {
    const res = admissionService.createEnquiry({
      studentName: 'Rhea Sen',
      dob: '2015-08-20',
      gender: 'Female',
      interestedClassId: 'cls-6',
      interestedClassName: 'Class 6',
      academicSession: '2026-2027',
      parentName: 'Subhash Sen',
      relationship: 'Father',
      mobileNumber: '+91 98888 77777',
      email: 'subhash.sen@test.com',
      residentialAddress: 'Koramangala, Bengaluru',
      enquiryDate: '2026-10-31',
      source: 'Website',
      preferredContactMethod: 'Phone Call',
      assignedCounsellor: 'Priya Sharma',
      status: 'New',
      remarks: 'Interested in STEM labs',
    });

    expect(res.success).toBe(true);
    expect(res.data?.id).toBeDefined();
    expect(res.data?.enquiryNo).toMatch(/^ENQ-/);

    const retrieved = admissionService.getEnquiryById(res.data!.id);
    expect(retrieved?.studentName).toBe('Rhea Sen');
  });

  it('converts an enquiry into a formal admission application', () => {
    const enquiryRes = admissionService.createEnquiry({
      studentName: 'Kabir Mehta',
      dob: '2016-01-10',
      gender: 'Male',
      interestedClassId: 'cls-5',
      interestedClassName: 'Class 5',
      academicSession: '2026-2027',
      parentName: 'Rahul Mehta',
      relationship: 'Father',
      mobileNumber: '+91 91111 22222',
      email: 'rahul.mehta@test.com',
      residentialAddress: 'Jayanagar, Bengaluru',
      enquiryDate: '2026-10-31',
      source: 'Social Media',
      preferredContactMethod: 'Email',
      assignedCounsellor: 'Priya Sharma',
      status: 'Contacted',
      remarks: 'Qualified for entrance exam',
    });

    expect(enquiryRes.success).toBe(true);
    const enquiryId = enquiryRes.data!.id;

    const convRes = admissionService.convertEnquiryToApplication(enquiryId);
    expect(convRes.success).toBe(true);
    expect(convRes.application).toBeDefined();
    expect(convRes.application?.firstName).toBe('Kabir');
    expect(convRes.application?.lastName).toBe('Mehta');
    expect(convRes.application?.applicationNo).toMatch(/^APP-/);

    // Verify enquiry status updated to converted
    const updatedEnquiry = admissionService.getEnquiryById(enquiryId);
    expect(updatedEnquiry?.status).toBe('Converted');
  });

  it('verifies required student documents', () => {
    const apps = admissionService.getAll();
    const app = apps[0];
    if (app && app.documents && app.documents.length > 0) {
      const doc = app.documents[0];
      const verifyRes = admissionService.verifyDocument(app.id, doc.id, true, 'Verified by Swaminathan');
      expect(verifyRes.success).toBe(true);
      const updatedDoc = verifyRes.data?.documents.find(d => d.id === doc.id);
      expect(updatedDoc?.verified).toBe(true);
    }
  });

  it('calculates admission stage summaries correctly', () => {
    const stageSummary = admissionService.getStageSummary();
    expect(stageSummary).toBeDefined();
    expect(typeof stageSummary.inquiry).toBe('number');
    expect(typeof stageSummary.enrolled).toBe('number');
  });
});
