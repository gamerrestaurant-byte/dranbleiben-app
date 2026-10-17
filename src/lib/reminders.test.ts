import { planReminders } from './reminders';
import { DEFAULT_SETTINGS, type CalendarEvent } from './types';

const ev = (start: Date, minutes = 60, allDay = false): CalendarEvent => ({
  key: 'k',
  id: '1',
  title: 'Zahnarzt',
  start,
  end: new Date(start.getTime() + minutes * 60_000),
  allDay,
});

const now = new Date(2026, 9, 17, 9, 0); // Sat 09:00
const hm = (d: Date) => `${d.getDate()}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('planReminders', () => {
  it('plans evening before, morning of, one hour before and the outcome question', () => {
    const r = planReminders(ev(new Date(2026, 9, 22, 15, 0)), DEFAULT_SETTINGS, now);
    expect(r.map((x) => [x.kind, hm(x.at)])).toEqual([
      ['evening', '21. 20:00'],
      ['morning', '22. 8:00'],
      ['before', '22. 14:00'],
      ['outcome', '22. 16:15'],
    ]);
  });

  it('skips the morning reminder when the appointment is early', () => {
    const r = planReminders(ev(new Date(2026, 9, 22, 8, 15)), DEFAULT_SETTINGS, now);
    expect(r.map((x) => x.kind)).toEqual(['evening', 'before', 'outcome']);
  });

  it('merges reminders that would fire almost together', () => {
    const r = planReminders(ev(new Date(2026, 9, 22, 9, 10)), DEFAULT_SETTINGS, now);
    // morning 8:00 and before 8:10 are 10 minutes apart; only the later one stays
    expect(r.map((x) => [x.kind, hm(x.at)])).toEqual([
      ['evening', '21. 20:00'],
      ['before', '22. 8:10'],
      ['outcome', '22. 10:25'],
    ]);
  });

  it('adds the travel buffer to the before reminder', () => {
    const r = planReminders(ev(new Date(2026, 9, 22, 15, 0)), { ...DEFAULT_SETTINGS, bufferMinutes: 30 }, now);
    expect(hm(r.find((x) => x.kind === 'before')!.at)).toBe('22. 13:30');
  });

  it('drops reminders already in the past', () => {
    const r = planReminders(ev(new Date(2026, 9, 17, 11, 0)), DEFAULT_SETTINGS, now);
    expect(r.map((x) => x.kind)).toEqual(['before', 'outcome']);
  });

  it('all-day events get evening and morning only', () => {
    const r = planReminders(ev(new Date(2026, 9, 24, 0, 0), 24 * 60, true), DEFAULT_SETTINGS, now);
    expect(r.map((x) => [x.kind, hm(x.at)])).toEqual([
      ['evening', '23. 20:00'],
      ['morning', '24. 8:00'],
    ]);
  });
});
