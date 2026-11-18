import { describe, it, expect, beforeEach } from 'vitest';
import { academicAwardsService } from './academicAwardsService';
import { ERPStorage } from './storage';

describe('academicAwardsService Awards & Certificate Management', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves awards and analytics summary', () => {
    const awards = academicAwardsService.getAwards();
    expect(Array.isArray(awards)).toBe(true);

    const analytics = academicAwardsService.getAnalyticsSummary();
    expect(analytics).toBeDefined();
    expect(typeof analytics.totalAwards).toBe('number');
  });

  it('manages award lifecycle: create -> submit -> approve -> publish', () => {
    // 1. Create Draft Award
    const res = academicAwardsService.createAward(
      {
        awardTitle: 'State Science Fair 1st Prize',
        categoryId: 'cat-stem',
        studentId: 'stud-1',
        achievementLevel: 'State',
        position: '1st Place / Gold',
        awardDate: '2026-10-15',
        academicYear: '2026-2027',
        description: 'Built autonomous solar irrigation rover.',
        status: 'draft',
      },
      { id: 'teach-1', name: 'Mrs. Ananya Sharma' }
    );

    expect(res.success).toBe(true);
    expect(res.data?.id).toBeDefined();
    expect(res.data?.status).toBe('draft');

    const draftId = res.data!.id;

    // 2. Submit Award
    const submitted = academicAwardsService.submitAward(draftId, { id: 'teach-1', name: 'Mrs. Ananya Sharma' });
    expect(submitted.success).toBe(true);
    expect(submitted.data?.status).toBe('submitted');

    // 3. Approve Award
    const approved = academicAwardsService.approveAward(draftId, { id: 'admin-1', name: 'Dr. Arvind Swaminathan' });
    expect(approved.success).toBe(true);
    expect(approved.data?.status).toBe('approved');

    // 4. Publish Award
    const published = academicAwardsService.publishAward(draftId, { id: 'admin-1', name: 'Dr. Arvind Swaminathan' });
    expect(published.success).toBe(true);
    expect(published.data?.status).toBe('published');
  });

  it('issues and verifies a certificate with unique verification code', () => {
    const awards = academicAwardsService.getAwards();
    const approvedAward = awards.find(a => a.status === 'published' || a.status === 'approved') || awards[0];

    const certRes = academicAwardsService.issueCertificate({
      awardId: approvedAward.id,
      principalName: 'Dr. Arvind Swaminathan',
    });

    expect(certRes.success).toBe(true);
    expect(certRes.data?.verificationCode).toMatch(/^CERT-2026-/);

    // Verify certificate using code
    const verification = academicAwardsService.verifyCertificate(certRes.data!.verificationCode);
    expect(verification.verified).toBe(true);
    expect(verification.certificate?.recipientName).toBe(certRes.data!.recipientName);
  });
});
