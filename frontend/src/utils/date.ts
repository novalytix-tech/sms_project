// Calendar dates in the user's local time zone (YYYY-MM-DD).
// Never use `new Date().toISOString().split('T')[0]` for "today": that is the UTC date,
// which in India is the previous day until 05:30 IST.

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toLocalISO(new Date());
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalISO(d);
}
