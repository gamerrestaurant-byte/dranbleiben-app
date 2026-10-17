import { currentStreak, keptRate } from './streak';
import type { CalendarEvent } from './types';
import { findConflicts, groupByDay, previewWeek, weekSummary } from './week';

const e = (key: string, d: number, h: number, mins = 60): CalendarEvent => {
  const start = new Date(2026, 9, d, h);
  return { key, id: key, title: key, start, end: new Date(start.getTime() + mins * 60_000), allDay: false };
};

describe('previewWeek', () => {
  it('on Sunday shows the coming week', () => {
    const { start, end } = previewWeek(new Date(2026, 9, 18, 19));
    expect(start).toEqual(new Date(2026, 9, 19));
    expect(end).toEqual(new Date(2026, 9, 26));
  });
  it('mid-week shows the current week', () => {
    expect(previewWeek(new Date(2026, 9, 21, 12)).start).toEqual(new Date(2026, 9, 19));
  });
});

describe('week overview', () => {
  const events = [e('a', 20, 9), e('b', 20, 9, 120), e('c', 20, 14), e('d', 22, 15)];
  const days = groupByDay(events, new Date(2026, 9, 19));

  it('groups events by day', () => {
    expect(days.map((d) => d.events.length)).toEqual([0, 3, 0, 1, 0, 0, 0]);
  });
  it('finds overlaps', () => {
    expect(findConflicts(events).map(([x, y]) => x.key + y.key)).toEqual(['ab']);
  });
  it('summarizes the week', () => {
    expect(weekSummary(days)).toBe('Deine Woche: 4 Termine, Dienstag ist am vollsten.');
    expect(weekSummary(groupByDay([], new Date(2026, 9, 19)))).toMatch(/leer/);
  });
});

describe('streak', () => {
  const recs = [
    { key: '1', start: '2026-10-10T10:00:00Z', outcome: 'missed' as const },
    { key: '2', start: '2026-10-12T10:00:00Z', outcome: 'done' as const },
    { key: '3', start: '2026-10-13T10:00:00Z', outcome: 'moved' as const },
    { key: '4', start: '2026-10-14T10:00:00Z', outcome: 'done' as const },
  ];
  it('counts kept appointments since the last miss', () => {
    expect(currentStreak(recs)).toBe(2);
  });
  it('computes the kept rate without moved ones', () => {
    expect(keptRate(recs, new Date('2026-10-01'), new Date('2026-11-01'))).toBeCloseTo(2 / 3);
  });
});
