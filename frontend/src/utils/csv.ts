// ==========================================
// CSV parsing helper for Import / Paste
// Developed by NTS Novalytix
// ==========================================

/**
 * Parses CSV text into an array of row objects keyed by the header row.
 * Handles quoted fields, escaped quotes (""), commas inside quotes and CRLF.
 */
export function parseCSV(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM that Excel / Google Sheets prepend — otherwise the first
  // column header gets corrupted (e.g. "﻿Admission No") and every row is skipped.
  text = text.replace(/^﻿/, '');

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      cur.push(field);
      field = '';
    } else if (c === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim().replace(/^﻿/, ''));

  return rows
    .slice(1)
    .filter(r => r.some(v => v.trim() !== ''))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const val = (r[idx] ?? '').trim();
        obj[h] = val;
        // Also expose a lowercase alias so lookups tolerate header casing/spacing.
        const lower = h.toLowerCase();
        if (!(lower in obj)) obj[lower] = val;
      });
      return obj;
    });
}

/**
 * Case-insensitive, trimmed field lookup from a parsed CSV row.
 * Tries each candidate header name regardless of casing/surrounding spaces.
 */
export function pickField(row: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== '') return row[c];
    const lower = c.toLowerCase();
    if (row[lower] !== undefined && row[lower] !== '') return row[lower];
  }
  return '';
}

/** Builds TSV text (tab separated) from headers + rows — used for clipboard Copy. */
export function toTSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) =>
    String(v ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return [headers.join('\t'), ...rows.map(r => r.map(esc).join('\t'))].join('\n');
}
