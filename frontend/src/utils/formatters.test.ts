import { describe, it, expect } from 'vitest';
import {
  formatCurrencyINR,
  formatCurrencyINRWithDecimals,
  amountInWordsINR,
  formatDate,
  formatTime,
  capitalize,
  marksToWords,
  dobInWords,
} from './formatters';

describe('formatCurrencyINR', () => {
  it('formats positive numbers in Indian numbering format', () => {
    expect(formatCurrencyINR(1000)).toMatch(/₹\s*1,000/);
    expect(formatCurrencyINR(100000)).toMatch(/₹\s*1,00,000/);
    expect(formatCurrencyINR(1250000)).toMatch(/₹\s*12,50,000/);
    expect(formatCurrencyINR(10000000)).toMatch(/₹\s*1,00,00,000/);
  });

  it('handles 0, null, undefined and NaN gracefully', () => {
    expect(formatCurrencyINR(0)).toBe('₹ 0');
    expect(formatCurrencyINR(null)).toBe('₹ 0');
    expect(formatCurrencyINR(undefined)).toBe('₹ 0');
    expect(formatCurrencyINR(NaN)).toBe('₹ 0');
  });

  it('handles fractional amounts by rounding to whole rupees', () => {
    expect(formatCurrencyINR(1499.75)).toMatch(/₹\s*1,500/);
  });
});

describe('formatCurrencyINRWithDecimals', () => {
  it('formats numbers with exactly two decimal points', () => {
    expect(formatCurrencyINRWithDecimals(25000)).toMatch(/₹\s*25,000\.00/);
    expect(formatCurrencyINRWithDecimals(99.5)).toMatch(/₹\s*99\.50/);
    expect(formatCurrencyINRWithDecimals(123456.78)).toMatch(/₹\s*1,23,456\.78/);
  });

  it('handles null, undefined and NaN gracefully', () => {
    expect(formatCurrencyINRWithDecimals(null)).toBe('₹ 0.00');
    expect(formatCurrencyINRWithDecimals(undefined)).toBe('₹ 0.00');
    expect(formatCurrencyINRWithDecimals(NaN)).toBe('₹ 0.00');
  });
});

describe('amountInWordsINR', () => {
  it('converts exact amounts into correct Indian Rupee words', () => {
    expect(amountInWordsINR(0)).toBe('Zero Rupees Only');
    expect(amountInWordsINR(-50)).toBe('Zero Rupees Only');
    expect(amountInWordsINR(500)).toBe('Five Hundred Rupees Only');
    expect(amountInWordsINR(25000)).toBe('Twenty Five Thousand Rupees Only');
    expect(amountInWordsINR(100000)).toBe('One Lakh Rupees Only');
    expect(amountInWordsINR(1250000)).toBe('Twelve Lakh Fifty Thousand Rupees Only');
  });

  it('handles complex compound numbers', () => {
    const result = amountInWordsINR(15042);
    expect(result).toContain('Fifteen Thousand');
    expect(result).toContain('Forty Two');
    expect(result).toContain('Rupees Only');
  });
});

describe('formatDate', () => {
  it('formats valid ISO date strings to readable Indian format', () => {
    const formatted = formatDate('2026-10-31');
    expect(formatted).toMatch(/31\s+Oct\s+2026/);
  });

  it('returns fallback dash for null, undefined or empty strings', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('returns input as-is for malformed non-date strings', () => {
    expect(formatDate('not-a-valid-date')).toBe('not-a-valid-date');
  });
});

describe('formatTime', () => {
  it('converts 24-hour time string into 12-hour AM/PM format', () => {
    expect(formatTime('09:30')).toBe('9:30 AM');
    expect(formatTime('13:45')).toBe('1:45 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('handles missing or invalid inputs gracefully', () => {
    expect(formatTime(null)).toBe('—');
    expect(formatTime(undefined)).toBe('—');
    expect(formatTime('')).toBe('—');
    expect(formatTime('invalid')).toBe('invalid');
  });
});

describe('capitalize', () => {
  it('capitalizes the first character of a string', () => {
    expect(capitalize('student')).toBe('Student');
    expect(capitalize('teacher')).toBe('Teacher');
    expect(capitalize('A')).toBe('A');
  });

  it('handles empty strings gracefully', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('marksToWords', () => {
  it('converts academic marks into exact word representations', () => {
    expect(marksToWords(0)).toBe('Zero');
    expect(marksToWords(76)).toBe('Seventy-Six');
    expect(marksToWords(80)).toBe('Eighty');
    expect(marksToWords(95)).toBe('Ninety-Five');
    expect(marksToWords(100)).toBe('One Hundred');
    expect(marksToWords(18)).toBe('Eighteen');
  });

  it('handles null, undefined, NaN and negative values gracefully', () => {
    expect(marksToWords(null)).toBe('—');
    expect(marksToWords(undefined)).toBe('—');
    expect(marksToWords(NaN)).toBe('—');
    expect(marksToWords(-5)).toBe('—');
  });
});

describe('dobInWords', () => {
  it('converts date strings into formal school date in words', () => {
    expect(dobInWords('2010-08-14')).toBe('Fourteenth August Two Thousand Ten');
    expect(dobInWords('2011-01-01')).toBe('First January Two Thousand Eleven');
    expect(dobInWords('2012-10-25')).toBe('Twenty-Fifth October Two Thousand Twelve');
  });

  it('handles empty or invalid date strings gracefully', () => {
    expect(dobInWords('')).toBe('');
    expect(dobInWords(null)).toBe('');
    expect(dobInWords('invalid-date')).toBe('');
  });
});


