import React, { useState, useMemo } from 'react';
import { AdmissionApplication, AdmissionEnquiry, AdmissionFollowUp, ClassAdmissionCapacity } from '../../../types';
import { classService } from '../../../services/classService';
import { formatDate, formatCurrencyINR } from '../../../utils/formatters';
import { exportToCSV } from '../../../utils/export';
import { Download, Printer } from 'lucide-react';

interface ReportsTabProps {
  enquiries: AdmissionEnquiry[];
  applications: AdmissionApplication[];
  followUps: AdmissionFollowUp[];
  capacities: ClassAdmissionCapacity[];
  classes: ReturnType<typeof classService.getAll>;
}

type ReportType =
  | 'daily_enquiry'
  | 'monthly_enquiry'
  | 'source_enquiry'
  | 'class_enquiry'
  | 'app_status'
  | 'doc_pending'
  | 'followup_pending'
  | 'conversion'
  | 'confirmed_admission'
  | 'lost_enquiry'
  | 'fee_pending'
  | 'counsellor_performance';

export const ReportsTab: React.FC<ReportsTabProps> = ({
  enquiries,
  applications,
  followUps,
  capacities,
  classes,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('source_enquiry');
  const [sessionFilter, setSessionFilter] = useState('2026-2027');
  const [classFilter, setClassFilter] = useState('all');

  // Filtered dataset
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      const matchSession = e.academicSession === sessionFilter;
      const matchClass = classFilter === 'all' || e.interestedClassId === classFilter;
      return matchSession && matchClass;
    });
  }, [enquiries, sessionFilter, classFilter]);

  const filteredApps = useMemo(() => {
    return applications.filter(a => {
      const matchSession = a.academicYear === sessionFilter;
      const matchClass = classFilter === 'all' || a.targetClassId === classFilter;
      return matchSession && matchClass;
    });
  }, [applications, sessionFilter, classFilter]);

  // Report data generator
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 'daily_enquiry': {
        const dateMap: Record<string, { count: number; sources: Set<string> }> = {};
        filteredEnquiries.forEach(e => {
          if (!dateMap[e.enquiryDate]) dateMap[e.enquiryDate] = { count: 0, sources: new Set() };
          dateMap[e.enquiryDate].count++;
          dateMap[e.enquiryDate].sources.add(e.source);
        });

        const rows = Object.entries(dateMap)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, data]) => [
            formatDate(date),
            data.count,
            Array.from(data.sources).join(', '),
            `${Math.round((data.count / (filteredEnquiries.length || 1)) * 100)}%`,
          ]);

        return {
          title: 'Daily Admission Enquiry Report',
          subtitle: 'Day-to-day intake of parent queries and lead channels',
          headers: ['Date', 'Total Inquiries', 'Channels Recorded', 'Share of Total'],
          rows,
          kpi: { label: 'Total Enquiries', value: filteredEnquiries.length },
        };
      }

      case 'monthly_enquiry': {
        const monthMap: Record<string, number> = {};
        filteredEnquiries.forEach(e => {
          const m = e.enquiryDate.substring(0, 7);
          monthMap[m] = (monthMap[m] || 0) + 1;
        });

        const rows = Object.entries(monthMap)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([month, count]) => [
            month,
            count,
            `${Math.round((count / (filteredEnquiries.length || 1)) * 100)}%`,
          ]);

        return {
          title: 'Monthly Admission Trend Report',
          subtitle: 'Month-wise pipeline accumulation for the selected academic cycle',
          headers: ['Month (YYYY-MM)', 'Enquiry Count', 'Percentage Contribution'],
          rows,
          kpi: { label: 'Active Months', value: Object.keys(monthMap).length },
        };
      }

      case 'source_enquiry': {
        const sourceMap: Record<string, { total: number; converted: number; lost: number }> = {};
        filteredEnquiries.forEach(e => {
          const s = e.source || 'Other';
          if (!sourceMap[s]) sourceMap[s] = { total: 0, converted: 0, lost: 0 };
          sourceMap[s].total++;
          if (e.status === 'Converted') sourceMap[s].converted++;
          if (e.status === 'Lost') sourceMap[s].lost++;
        });

        const rows = Object.entries(sourceMap)
          .sort((a, b) => b[1].total - a[1].total)
          .map(([src, d]) => [
            src,
            d.total,
            d.converted,
            d.lost,
            `${Math.round((d.converted / (d.total || 1)) * 100)}%`,
          ]);

        return {
          title: 'Channel & Source-Wise Enquiry Report',
          subtitle: 'Analysis of lead origin and conversion efficacy by channel',
          headers: ['Acquisition Channel', 'Total Leads', 'Converted to Apps', 'Lost Leads', 'Conversion Rate'],
          rows,
          kpi: { label: 'Channels Tracked', value: Object.keys(sourceMap).length },
        };
      }

      case 'class_enquiry': {
        const rows = capacities.map(c => {
          const enqs = filteredEnquiries.filter(e => e.interestedClassId === c.classId).length;
          const apps = filteredApps.filter(a => a.targetClassId === c.classId).length;
          const confirmed = filteredApps.filter(a => a.targetClassId === c.classId && a.stage === 'enrolled').length;

          return [
            c.className,
            c.totalApprovedSeats,
            enqs,
            apps,
            confirmed,
            c.availableSeats,
            `${Math.round((confirmed / (c.totalApprovedSeats || 1)) * 100)}%`,
          ];
        });

        return {
          title: 'Class-Wise Admission Demand & Seat Report',
          subtitle: 'Capacity allocation and grade-level demand matrix',
          headers: ['Class / Grade', 'Approved Capacity', 'Enquiries', 'Applications', 'Confirmed Enrolled', 'Available Seats', 'Fill Rate'],
          rows,
          kpi: { label: 'Total Approved Seats', value: capacities.reduce((acc, c) => acc + c.totalApprovedSeats, 0) },
        };
      }

      case 'app_status': {
        const stageMap: Record<string, number> = {};
        filteredApps.forEach(a => {
          stageMap[a.stage] = (stageMap[a.stage] || 0) + 1;
        });

        const rows = Object.entries(stageMap).map(([stage, count]) => [
          stage.replace('_', ' ').toUpperCase(),
          count,
          `${Math.round((count / (filteredApps.length || 1)) * 100)}%`,
        ]);

        return {
          title: 'Application Pipeline Status Report',
          subtitle: 'Distribution of applications across each operational workflow stage',
          headers: ['Workflow Stage', 'Applicant Count', 'Pipeline Share'],
          rows,
          kpi: { label: 'Total Applications', value: filteredApps.length },
        };
      }

      case 'doc_pending': {
        const rows = filteredApps
          .filter(a => (a.documents || []).some(d => d.required && !d.verified))
          .map(a => {
            const pending = (a.documents || []).filter(d => d.required && !d.verified).map(d => d.title).join(', ');
            return [
              a.applicationNo,
              `${a.firstName} ${a.lastName}`,
              a.targetClassName,
              a.parentName,
              a.parentPhone,
              pending,
            ];
          });

        return {
          title: 'Documents Pending Verification Report',
          subtitle: 'Applicants awaiting statutory verification of original credentials',
          headers: ['App Reference', 'Candidate Name', 'Target Class', 'Parent Name', 'Contact Phone', 'Pending Documents'],
          rows,
          kpi: { label: 'Applicants Pending Docs', value: rows.length },
        };
      }

      case 'followup_pending': {
        const todayStr = new Date().toISOString().split('T')[0];
        const rows = filteredEnquiries
          .filter(e => e.status !== 'Converted' && e.status !== 'Lost' && e.nextFollowUpDate)
          .map(e => [
            e.enquiryNo,
            e.studentName,
            e.interestedClassName,
            e.parentName,
            e.mobileNumber,
            e.assignedCounsellor,
            formatDate(e.nextFollowUpDate || ''),
            e.nextFollowUpDate! <= todayStr ? 'DUE / OVERDUE' : 'UPCOMING',
          ]);

        return {
          title: 'Follow-up Pending & Reminder Report',
          subtitle: 'Scheduled parent calls, reminders, and pending walkthroughs',
          headers: ['Enquiry Ref', 'Student Name', 'Class', 'Parent Name', 'Mobile', 'Counsellor', 'Scheduled Date', 'Urgency'],
          rows,
          kpi: { label: 'Pending Follow-ups', value: rows.length },
        };
      }

      case 'conversion': {
        const total = filteredEnquiries.length || 1;
        const converted = filteredEnquiries.filter(e => e.status === 'Converted').length;
        const visits = filteredEnquiries.filter(e => e.status === 'Visit Completed').length;
        const lost = filteredEnquiries.filter(e => e.status === 'Lost').length;

        const rows = [
          ['Total Enquiries Received', total, '100%'],
          ['Campus Walkthroughs Conducted', visits, `${Math.round((visits / total) * 100)}%`],
          ['Converted to Formal Applications', converted, `${Math.round((converted / total) * 100)}%`],
          ['Lost / Dropped Inquiries', lost, `${Math.round((lost / total) * 100)}%`],
        ];

        return {
          title: 'Admission Conversion Efficiency Report',
          subtitle: 'Conversion funnel ratios from enquiry to enrolled student',
          headers: ['Funnel Milestone', 'Record Count', 'Conversion Rate'],
          rows,
          kpi: { label: 'Overall Conversion', value: `${Math.round((converted / total) * 100)}%` },
        };
      }

      case 'confirmed_admission': {
        const rows = filteredApps
          .filter(a => a.stage === 'enrolled')
          .map(a => [
            a.assignedAdmissionNo || 'ADM-2026',
            a.applicationNo,
            `${a.firstName} ${a.lastName}`,
            a.targetClassName,
            a.targetSection || 'A',
            a.parentName,
            a.parentPhone,
            formatDate(a.enrolledDate || a.updatedAt),
          ]);

        return {
          title: 'Officially Confirmed Admissions Report',
          subtitle: 'Students finalized with official admission numbers in student directory',
          headers: ['Admission No', 'Application Ref', 'Student Full Name', 'Class', 'Section', 'Parent Name', 'Phone', 'Enrollment Date'],
          rows,
          kpi: { label: 'Confirmed Enrolled', value: rows.length },
        };
      }

      case 'lost_enquiry': {
        const rows = filteredEnquiries
          .filter(e => e.status === 'Lost')
          .map(e => [
            e.enquiryNo,
            e.studentName,
            e.interestedClassName,
            e.source,
            e.parentName,
            e.mobileNumber,
            e.lostReason || 'Not stated',
            e.assignedCounsellor,
          ]);

        return {
          title: 'Lost Enquiries & Attrition Analysis Report',
          subtitle: 'Inquiries discontinued and documented rejection reasons',
          headers: ['Enquiry Ref', 'Student Name', 'Class', 'Source Channel', 'Parent', 'Phone', 'Primary Lost Reason', 'Counsellor'],
          rows,
          kpi: { label: 'Total Lost Enquiries', value: rows.length },
        };
      }

      case 'fee_pending': {
        const rows = filteredApps
          .filter(a => !a.isFeePaid && a.stage !== 'rejected' && a.stage !== 'withdrawn')
          .map(a => {
            const total = a.admissionFeeAmount || 25000;
            const paid = a.feeAmountPaid || 0;
            const bal = total - paid;

            return [
              a.applicationNo,
              `${a.firstName} ${a.lastName}`,
              a.targetClassName,
              a.parentName,
              a.parentPhone,
              formatCurrencyINR(total),
              formatCurrencyINR(paid),
              formatCurrencyINR(bal),
              a.stage.replace('_', ' ').toUpperCase(),
            ];
          });

        return {
          title: 'Admission Fee Pending & Outstanding Dues Report',
          subtitle: 'Admitted candidates with outstanding registration dues',
          headers: ['Application Ref', 'Candidate Name', 'Class', 'Parent', 'Phone', 'Total Fee', 'Paid', 'Outstanding Due', 'Workflow Stage'],
          rows,
          kpi: { label: 'Awaiting Payment', value: rows.length },
        };
      }

      case 'counsellor_performance': {
        const cMap: Record<string, { total: number; converted: number; lost: number }> = {};
        filteredEnquiries.forEach(e => {
          const c = e.assignedCounsellor || 'Unassigned';
          if (!cMap[c]) cMap[c] = { total: 0, converted: 0, lost: 0 };
          cMap[c].total++;
          if (e.status === 'Converted') cMap[c].converted++;
          if (e.status === 'Lost') cMap[c].lost++;
        });

        const rows = Object.entries(cMap).map(([counsellor, d]) => [
          counsellor,
          d.total,
          d.converted,
          d.lost,
          `${Math.round((d.converted / (d.total || 1)) * 100)}%`,
        ]);

        return {
          title: 'Admissions Counsellor Performance Report',
          subtitle: 'Workload distribution and conversion efficiency across admission staff',
          headers: ['Counsellor Staff Member', 'Total Assigned Enquiries', 'Applications Converted', 'Lost Inquiries', 'Conversion Success Rate'],
          rows,
          kpi: { label: 'Active Counsellors', value: Object.keys(cMap).length },
        };
      }
    }
  }, [selectedReport, filteredEnquiries, filteredApps, capacities]);

  const handleExport = () => {
    exportToCSV(`Admission_Report_${selectedReport}`, reportData.headers, reportData.rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Selector Strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '12px 18px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#19191f' }}>Select Admission Report:</span>
          <select
            className="form-select filter-select filter-select-md"
            value={selectedReport}
            onChange={e => setSelectedReport(e.target.value as ReportType)}
          >
            <option value="daily_enquiry">1. Daily Enquiry Report</option>
            <option value="monthly_enquiry">2. Monthly Enquiry Report</option>
            <option value="source_enquiry">3. Source-Wise Enquiry Report</option>
            <option value="class_enquiry">4. Class-Wise Enquiry Report</option>
            <option value="app_status">5. Application Status Report</option>
            <option value="doc_pending">6. Document Pending Report</option>
            <option value="followup_pending">7. Follow-up Pending Report</option>
            <option value="conversion">8. Admission Conversion Report</option>
            <option value="confirmed_admission">9. Confirmed Admission Report</option>
            <option value="lost_enquiry">10. Lost Enquiry Report</option>
            <option value="fee_pending">11. Fee Pending Admission Report</option>
            <option value="counsellor_performance">12. Counsellor Performance Report</option>
          </select>

          <span style={{ fontSize: '13px', fontWeight: 600, color: '#19191f', marginLeft: '6px' }}>Session:</span>
          <select
            className="form-select filter-select filter-select-sm"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
          >
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            <span>Print Report</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Header Card */}
      <div className="card" style={{ padding: '16px 20px', background: '#F6F8FC' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#19191f' }}>
              {reportData.title}
            </h3>
            <div style={{ fontSize: '12.5px', color: '#71717a' }}>
              {reportData.subtitle} • Academic Session: <strong>{sessionFilter}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11.5px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>
              {reportData.kpi.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3B82F6' }}>
              {reportData.kpi.value}
            </div>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {reportData.headers.map((h, idx) => (
                  <th key={idx}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} style={{ textAlign: 'center', padding: '24px', color: '#71717a' }}>
                    No records found matching the active session and class filters for this report.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell: any, cIdx: number) => (
                      <td key={cIdx} style={{ fontWeight: cIdx === 0 ? 600 : 400 }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

