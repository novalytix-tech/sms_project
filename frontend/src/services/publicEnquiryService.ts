// ==========================================
// Public Admission Enquiry Service
// Submits leads from the public enquiry page to the backend,
// and lets the admin fetch those leads from the cloud database.
// ==========================================

import { httpClient } from './api/httpClient';
import { AdmissionEnquiry, EnquiryStatus } from '../types';

const mapStatus = (s: string): EnquiryStatus => {
  switch ((s || '').toUpperCase()) {
    case 'CONTACTED': return 'Contacted';
    case 'APPLIED': return 'Application Started';
    case 'CONVERTED': return 'Converted';
    case 'LOST': return 'Lost';
    default: return 'New';
  }
};

export interface PublicEnquiryInput {
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  interestedClassName?: string;
  previousSchool?: string;
  previousClass?: string;
  previousBoard?: string;
  parentName: string;
  relationship?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

/** Backend lead shape returned by GET /admissions/inquiries. */
export interface BackendEnquiry {
  id: string;
  applicant_name: string;
  parent_name: string;
  target_class_name?: string;
  interested_class_name?: string;
  inquiry_date: string;
  email?: string;
  phone: string;
  alternate_phone?: string;
  source: string;
  status: string;
  notes?: string;
  applicant_dob?: string;
  gender?: string;
  previous_school?: string;
  previous_class?: string;
  previous_board?: string;
  address?: string;
  relationship_to_applicant?: string;
}

export const publicEnquiryService = {
  /** Submit a public enquiry (no login required). */
  submit: async (data: PublicEnquiryInput): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const res = await httpClient.post('/admissions/inquiries', {
        institution_code: import.meta.env.VITE_PUBLIC_INSTITUTION_CODE,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email,
        parent_name: data.parentName,
        relationship: data.relationship,
        gender: data.gender,
        applicant_dob: data.dob,
        previous_school: data.previousSchool,
        previous_class: data.previousClass,
        previous_board: data.previousBoard,
        interested_class_name: data.interestedClassName,
        address: data.address,
        alternate_phone: data.alternatePhone,
        notes: data.notes,
        source: 'Website',
      });
      if (res && res.success) {
        return { success: true, id: (res.data as any)?.id };
      }
      return { success: false, error: res?.error?.message || res?.message || 'Could not submit your enquiry.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error. Please try again.' };
    }
  },

  /** Admin: fetch all leads captured from the website (cloud database). */
  fetchLeads: async (): Promise<BackendEnquiry[]> => {
    try {
      const res = await httpClient.get<BackendEnquiry[]>('/admissions/inquiries');
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch {
      /* ignore */
    }
    return [];
  },

  /** Convert a backend lead into the admin UI's AdmissionEnquiry shape. */
  mapToEnquiry: (b: BackendEnquiry): AdmissionEnquiry => ({
    id: b.id,
    enquiryNo: `WEB-${b.id.slice(0, 8).toUpperCase()}`,
    studentName: b.applicant_name,
    dob: b.applicant_dob || '',
    gender: (b.gender as AdmissionEnquiry['gender']) || 'Male',
    interestedClassId: '',
    interestedClassName: b.interested_class_name || b.target_class_name || '—',
    academicSession: '2026-2027',
    previousSchool: b.previous_school || '',
    parentName: b.parent_name,
    relationship: (b.relationship_to_applicant as AdmissionEnquiry['relationship']) || 'Guardian',
    mobileNumber: b.phone,
    alternateMobile: b.alternate_phone || '',
    email: b.email || '',
    residentialAddress: b.address || '',
    enquiryDate: b.inquiry_date,
    source: b.source || 'Website',
    preferredContactMethod: 'Phone Call',
    assignedCounsellor: 'Unassigned',
    remarks: [
      b.notes,
      b.previous_class ? `Previous class: ${b.previous_class}` : '',
      b.previous_board ? `Board: ${b.previous_board}` : '',
    ].filter(Boolean).join(' | '),
    status: mapStatus(b.status),
    createdAt: b.inquiry_date,
    updatedAt: b.inquiry_date,
  }),

  /** Admin: fetch website leads already mapped to the AdmissionEnquiry shape. */
  fetchLeadsAsEnquiries: async (): Promise<AdmissionEnquiry[]> => {
    const leads = await publicEnquiryService.fetchLeads();
    return leads.map(publicEnquiryService.mapToEnquiry);
  },
};
