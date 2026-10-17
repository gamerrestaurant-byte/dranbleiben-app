import type { Outcome } from './types';

export type OutcomeRecord = { key: string; start: string; outcome: Outcome };

/** Kept appointments in a row. Moved ones neither count nor break the streak. */
export function currentStreak(records: OutcomeRecord[]): number {
  const sorted = [...records].sort((a, b) => b.start.localeCompare(a.start));
  let streak = 0;
  for (const r of sorted) {
    if (r.outcome === 'missed') break;
    if (r.outcome === 'done') streak++;
  }
  return streak;
}

/** Share of rated appointments in [from, to) that were kept, or null if none were rated. */
export function keptRate(records: OutcomeRecord[], from: Date, to: Date): number | null {
  const inRange = records.filter((r) => {
    const t = new Date(r.start);
    return t >= from && t < to && r.outcome !== 'moved';
  });
  if (inRange.length === 0) return null;
  return inRange.filter((r) => r.outcome === 'done').length / inRange.length;
}
