const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: unknown, fallback = '—') {
  const d = parseDate(value);
  return d ? `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : fallback;
}

export function formatTime(value: unknown, fallback = '—') {
  if (!value) return fallback;
  const s = String(value);
  const m = /^(\d{1,2}):(\d{2})/.exec(s.includes('T') ? s.split('T')[1] : s);
  if (!m) return fallback;
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

export function formatDateTime(value: unknown, fallback = '—') {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${formatDate(d)}, ${formatTime(d.toTimeString())}`;
}

export function money(value: unknown) {
  const n = Number(value ?? 0);
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export const num = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function pick(obj: any, keys: string[], fallback: any = null) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}

export const titleCase = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
