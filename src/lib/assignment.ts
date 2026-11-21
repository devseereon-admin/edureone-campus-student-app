import type { Tone } from '@/components/ui';

const today = () => new Date().toISOString().slice(0, 10);

export function statusOf(a: any): { label: string; tone: Tone } {
  const s = String(a?.submission_status || a?.status || 'PENDING').toUpperCase();
  if (s === 'PENDING' && a?.due_date && String(a.due_date).slice(0, 10) < today()) return { label: 'Overdue', tone: 'red' };
  if (s === 'GRADED') return { label: 'Graded', tone: 'green' };
  if (s === 'LATE') return { label: 'Submitted late', tone: 'amber' };
  if (s === 'SUBMITTED' || s === 'RESUBMITTED') return { label: s === 'RESUBMITTED' ? 'Resubmitted' : 'Submitted', tone: 'blue' };
  return { label: 'Pending', tone: 'amber' };
}
