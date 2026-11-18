// ==========================================
// School ERP Utility Formatters
// Developed by NTS Novalytix
// ==========================================

/**
 * Formats a number to Indian Rupee (INR) representation with Indian digit grouping
 * Example: 1250000 -> ₹ 12,50,000
 */
export function formatCurrencyINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹ 0';
  }

  // Format with en-IN locale
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  return `₹ ${formatted}`;
}

/**
 * Formats a number to Indian Rupee with two decimal points
 * Example: 25000 -> ₹ 25,000.00
 */
export function formatCurrencyINRWithDecimals(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹ 0.00';
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `₹ ${formatted}`;
}

/**
 * Converts a numeric amount to Indian Rupee words (e.g. 25000 -> "Twenty-Five Thousand Rupees Only")
 */
export function amountInWordsINR(num: number): string {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Rupees Only';

  let str = '';
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str +=
    Number(n[5]) !== 0
      ? (str !== '' ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])])
      : '';

  return `${str.trim()} Rupees Only`;
}

/**
 * Formats standard date strings into clean readable school dates (e.g. "21 Oct 2026")
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats time or 24-hr string to 12-hr display (e.g., "09:00" -> "9:00 AM")
 */
export function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr) return '—';
  try {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 should be 12
    return `${hour}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Capitalizes string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a number (0-100) to clean words for exam marks (e.g. 76 -> "Seventy-Six", 100 -> "One Hundred")
 */
export function marksToWords(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '—';
  if (num === 0) return 'Zero';
  if (num < 0) return '—';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const whole = Math.round(num);
  if (whole < 20) return ones[whole];
  if (whole < 100) {
    const rem = whole % 10;
    return tens[Math.floor(whole / 10)] + (rem !== 0 ? '-' + ones[rem] : '');
  }
  if (whole === 100) return 'One Hundred';
  return whole.toString();
}

/**
 * Formats a Date of Birth into classic school format with date in words
 * Example: "2010-08-14" -> "Fourteenth August Two Thousand Ten"
 */
export function dobInWords(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    const ordinals = [
      '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
      'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
      'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth',
      'Thirty-First'
    ];
    const dayWord = ordinals[day] || `${day}th`;

    let yearWord = `${year}`;
    if (year >= 2000 && year < 2030) {
      const ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
      ];
      const tens = ['', '', 'Twenty', 'Thirty'];
      const rem = year - 2000;
      if (rem === 0) yearWord = 'Two Thousand';
      else if (rem < 20) yearWord = `Two Thousand ${ones[rem]}`;
      else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        yearWord = `Two Thousand ${tens[t]}${o !== 0 ? '-' + ones[o] : ''}`;
      }
    }
    return `${dayWord} ${month} ${yearWord}`;
  } catch {
    return '';
  }
}


