// ==========================================
// QuickActions — shared dashboard shortcut tiles
// One consistent card style across every persona.
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  to: string;
  /** Optional explicit colour; otherwise a palette colour is auto-assigned by position. */
  color?: string;
  bg?: string;
}

// Shared palette — keeps every persona's tiles visually consistent (same order as the reference).
const PALETTE: { color: string; bg: string }[] = [
  { color: '#3B82F6', bg: '#DBEAFE' }, // blue
  { color: '#7C3AED', bg: '#EDE9FE' }, // purple
  { color: '#16A34A', bg: '#DCFCE7' }, // green
  { color: '#D97706', bg: '#FEF3C7' }, // amber
  { color: '#DC2626', bg: '#FEE2E2' }, // red
  { color: '#0284C7', bg: '#E0F2FE' }, // sky
  { color: '#4F46E5', bg: '#E0E7FF' }, // indigo
];

export const QuickActions: React.FC<{ actions: QuickAction[] }> = ({ actions }) => {
  const navigate = useNavigate();
  return (
    <div className="quick-actions-grid" style={{ marginBottom: '24px' }}>
      {actions.map((a, i) => {
        const Icon = a.icon;
        const tone = PALETTE[i % PALETTE.length];
        return (
          <button
            key={a.label}
            className="quick-action-btn"
            onClick={() => navigate(a.to)}
            title={a.label}
          >
            <span
              className="quick-action-icon"
              style={{ background: a.bg ?? tone.bg, color: a.color ?? tone.color }}
            >
              <Icon size={18} />
            </span>
            <span>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
};
