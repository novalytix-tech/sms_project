import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Student } from '../../types';
import { Bus, AlertCircle, ArrowLeft } from 'lucide-react';

interface NotOptedBannerProps {
  currentRole: string;
  targetStudent: Student | null;
  parentChildren: Student[];
  selectedChild: Student | null;
  onSelectChild: (id: string) => void;
  hasStudentOpted: (student: Student) => boolean;
}

export const NotOptedBanner: React.FC<NotOptedBannerProps> = ({
  currentRole,
  targetStudent,
  parentChildren,
  selectedChild,
  onSelectChild,
  hasStudentOpted,
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="transport-header">
        <div className="transport-header-title">
          <h1>School Transport</h1>
          <p>Bus routes and student tracking</p>
        </div>
      </div>

      {/* Multi-child switcher if parent has more than one child */}
      {currentRole === 'parent' && parentChildren.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Select Child:</span>
          {parentChildren.map(c => {
            const isSelected = c.id === selectedChild?.id;
            const childOpted = hasStudentOpted(c);
            return (
              <button
                key={c.id}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => onSelectChild(c.id)}
              >
                {c.fullName} ({childOpted ? 'Bus' : 'Self-Commute'})
              </button>
            );
          })}
        </div>
      )}

      <div
        className="card"
        style={{
          maxWidth: '580px',
          margin: '32px auto',
          textAlign: 'center',
          padding: '40px 24px',
          border: '1px solid #fee2e2',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Bus size={28} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          No Bus Facility Opted
        </h2>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8fafc',
            color: '#475569',
            padding: '4px 14px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span>Self-Commute</span>
          {targetStudent && <span>• {targetStudent.fullName}</span>}
        </div>

        <p
          style={{
            color: '#64748b',
            fontSize: '13px',
            lineHeight: 1.6,
            maxWidth: '460px',
            margin: '0 auto 20px',
          }}
        >
          {currentRole === 'parent'
            ? `${targetStudent?.fullName || 'This student'} is currently registered for self-commute. Live GPS tracking, bus schedules, and driver contacts are available for students who have opted for the school bus facility.`
            : 'You are currently registered for self-commute. School bus GPS tracking, route schedules, and driver contacts are only accessible to students enrolled in the school transport facility.'}
        </p>

        <div
          style={{
            background: '#fffbfb',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#991b1b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
            <AlertCircle size={15} />
            <span>Want to enroll in the school bus service?</span>
          </div>
          <p style={{ margin: 0, color: '#b91c1c', lineHeight: 1.5 }}>
            To register for bus service, choose a pickup stop, or update commute preferences, please contact the school transport office or front desk.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <ArrowLeft size={14} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

