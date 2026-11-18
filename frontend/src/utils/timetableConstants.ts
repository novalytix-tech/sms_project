// ==========================================
// School Timetable Constants & Schedule Slots
// Standard 8 Periods Indian School Model
// Developed by NTS Novalytix
// ==========================================

import { DayOfWeek } from '../types';

export interface PeriodSlot {
  no: number;
  start: string;
  end: string;
}

export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Standard 8 Periods Indian School Timetable
 * Morning Session: Periods 1 to 4 (08:30 - 11:10)
 * Recess / Lunch: 11:10 - 11:50 (40 mins)
 * Afternoon Session: Periods 5 to 8 (11:50 - 02:30)
 */
export const PERIOD_SLOTS: PeriodSlot[] = [
  { no: 1, start: '08:30', end: '09:10' },
  { no: 2, start: '09:10', end: '09:50' },
  { no: 3, start: '09:50', end: '10:30' },
  { no: 4, start: '10:30', end: '11:10' },
  { no: 5, start: '11:50', end: '12:30' },
  { no: 6, start: '12:30', end: '01:10' },
  { no: 7, start: '01:10', end: '01:50' },
  { no: 8, start: '01:50', end: '02:30' },
];

export const LUNCH_BREAK = {
  start: '11:10',
  end: '11:50',
  label: 'Lunch Break',
};

/**
 * Subject theme visual mapper
 */
export const getSubjectTheme = (subject: string) => {
  const s = (subject || '').toLowerCase();
  if (s.includes('math')) {
    return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', badge: '#DBEAFE', accent: '#3B82F6' };
  }
  if (s.includes('sci') || s.includes('phy') || s.includes('chem') || s.includes('bio')) {
    return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', badge: '#D1FAE5', accent: '#10B981' };
  }
  if (s.includes('eng') || s.includes('lit') || s.includes('hindi') || s.includes('lang') || s.includes('sans')) {
    return { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', badge: '#FEF3C7', accent: '#F59E0B' };
  }
  if (s.includes('comp') || s.includes('info') || s.includes('tech')) {
    return { bg: '#F3E8FF', border: '#E9D5FF', text: '#6B21A8', badge: '#EDE9FE', accent: '#8B5CF6' };
  }
  if (s.includes('soc') || s.includes('hist') || s.includes('geo') || s.includes('civic')) {
    return { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', badge: '#FFEDD5', accent: '#F97316' };
  }
  if (s.includes('sport') || s.includes('phys') || s.includes('pe') || s.includes('yoga') || s.includes('gym')) {
    return { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', badge: '#DCFCE7', accent: '#22C55E' };
  }
  if (s.includes('art') || s.includes('draw') || s.includes('music') || s.includes('craft')) {
    return { bg: '#FDF2F8', border: '#FBCFE8', text: '#9D174D', badge: '#FCE7F3', accent: '#EC4899' };
  }
  if (s.includes('lib') || s.includes('read') || s.includes('moral')) {
    return { bg: '#EFF6FF', border: '#CCFBF1', text: '#115E59', badge: '#EFF6FF', accent: '#60A5FA' };
  }
  return { bg: '#F8FAFC', border: '#E2E8F0', text: '#1E293B', badge: '#F1F5F9', accent: '#64748B' };
};

