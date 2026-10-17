import { parseEntry } from './parse';

// Saturday, 17 Oct 2026, 09:00 local time
const ref = new Date(2026, 9, 17, 9, 0);

function fmt(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

describe('parseEntry', () => {
  const cases: [string, string, string, string][] = [
    ['Zahnarzt Do 15 Uhr', 'Zahnarzt', '2026-10-22 15:00', '2026-10-22 16:00'],
    ['Mama anrufen morgen 18:30', 'Mama anrufen', '2026-10-18 18:30', '2026-10-18 19:30'],
    ['Meeting mit Jonas nächsten Montag 10-11 Uhr', 'Meeting mit Jonas', '2026-10-19 10:00', '2026-10-19 11:00'],
    ['Friseur übermorgen um 9', 'Friseur', '2026-10-19 09:00', '2026-10-19 10:00'],
    ['Arzt am Dienstag um halb 3', 'Arzt', '2026-10-20 14:30', '2026-10-20 15:30'],
    ['Termin 5. November 14 Uhr', 'Termin', '2026-11-05 14:00', '2026-11-05 15:00'],
    ['Arzt am 3.11. um 9:00', 'Arzt', '2026-11-03 09:00', '2026-11-03 10:00'],
    ['Zahnarzt Do 15:00-16:30', 'Zahnarzt', '2026-10-22 15:00', '2026-10-22 16:30'],
    ['Kino Freitag viertel nach 7', 'Kino', '2026-10-23 19:15', '2026-10-23 20:15'],
  ];

  it.each(cases)('%s', (input, title, start, end) => {
    const r = parseEntry(input, ref)!;
    expect(r).not.toBeNull();
    expect(r.title).toBe(title);
    expect(r.allDay).toBe(false);
    expect(fmt(r.start)).toBe(start);
    expect(fmt(r.end)).toBe(end);
  });

  it('treats a date without time as all-day', () => {
    const r = parseEntry('Geburtstag Lisa 24.10.', ref)!;
    expect(r.title).toBe('Geburtstag Lisa');
    expect(r.allDay).toBe(true);
    expect(fmt(r.start)).toBe('2026-10-24 00:00');
    expect(fmt(r.end)).toBe('2026-10-25 00:00');
  });

  it('rolls a past day.month into next year', () => {
    const r = parseEntry('Steuer 3.2.', ref)!;
    expect(r.start.getFullYear()).toBe(2027);
  });

  it('returns null when no date is found', () => {
    expect(parseEntry('Milch kaufen', ref)).toBeNull();
  });
});
