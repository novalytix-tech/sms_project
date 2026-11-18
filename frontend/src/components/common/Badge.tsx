// ==========================================
// Status Badge Component
// Developed by NTS Novalytix
// ==========================================

import React from 'react';

interface BadgeProps {
  status:
    | 'active'
    | 'inactive'
    | 'present'
    | 'absent'
    | 'late'
    | 'excused'
    | 'paid'
    | 'unpaid'
    | 'partial'
    | 'overdue'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'delivered'
    | 'partially_delivered'
    | 'cancelled'
    | 'high'
    | 'urgent'
    | 'normal'
    | string;
  label?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label }) => {
  const norm = (status || '').toLowerCase();
  let typeClass = 'badge-neutral';

  if (['active', 'present', 'paid', 'approved', 'delivered'].includes(norm)) {
    typeClass = 'badge-success';
  } else if (['late', 'partial', 'pending', 'partially_delivered', 'high', 'upcoming'].includes(norm)) {
    typeClass = 'badge-warning';
  } else if (['inactive', 'absent', 'overdue', 'rejected', 'cancelled', 'urgent'].includes(norm)) {
    typeClass = 'badge-danger';
  } else if (['excused', 'unpaid', 'normal', 'ongoing', 'borrowed'].includes(norm)) {
    typeClass = 'badge-info';
  }

  const displayText = label || norm.replace(/_/g, ' ');

  return <span className={`badge ${typeClass}`}>{displayText}</span>;
};

