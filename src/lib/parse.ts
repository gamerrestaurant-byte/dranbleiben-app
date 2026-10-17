import * as chrono from 'chrono-node';

export type ParsedEntry = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

const DEFAULT_DURATION_MIN = 60;

// Bring German phrasings chrono does not understand into a form it does.
export function normalizeGerman(input: string, ref: Date): string {
  let text = ` ${input} `;

  // "halb 3" -> "2:30", "viertel nach 3" -> "3:15", "viertel vor 3" -> "2:45"
  text = text.replace(/\bhalb\s+(\d{1,2})\b/gi, (_, h) => `${(Number(h) + 23) % 24}:30`);
  text = text.replace(/\bviertel\s+nach\s+(\d{1,2})\b/gi, (_, h) => `${Number(h)}:15`);
  text = text.replace(/\bviertel\s+vor\s+(\d{1,2})\b/gi, (_, h) => `${(Number(h) + 23) % 24}:45`);

  // "14 Uhr" -> "14:00" (chrono misreads "5. November 14 Uhr" as a year)
  text = text.replace(/\b(\d{1,2})\s*Uhr\b/gi, '$1:00');

  // "24.10." -> "24.10.2026" (next occurrence)
  text = text.replace(/\b(\d{1,2})\.(\d{1,2})\.(?!\d)/g, (match, d, m) => {
    const day = Number(d);
    const month = Number(m);
    if (month < 1 || month > 12 || day < 1 || day > 31) return match;
    let year = ref.getFullYear();
    const candidate = new Date(year, month - 1, day, 23, 59);
    if (candidate < ref) year += 1;
    return `${day}.${month}.${year}`;
  });

  return text.replace(/\s+/g, ' ').trim();
}

function cleanTitle(rest: string): string {
  return rest
    .replace(/\s+/g, ' ')
    .replace(/\b(am|um|ab|von|bis|den)\s*$/i, '')
    .replace(/^\s*(am|um|ab)\b/i, '')
    .replace(/[\s,;:\-–]+$/g, '')
    .replace(/^[\s,;:\-–]+/g, '')
    .trim();
}

export function parseEntry(input: string, ref: Date = new Date()): ParsedEntry | null {
  const text = normalizeGerman(input, ref);
  const results = chrono.de.parse(text, ref, { forwardDate: true });
  if (results.length === 0) return null;

  const result = results[0];
  const allDay = !result.start.isCertain('hour');
  const start = result.start.date();

  // Appointments at 1-7 o'clock without context are almost always in the afternoon.
  if (!allDay && !result.start.isCertain('meridiem') && start.getHours() >= 1 && start.getHours() <= 7) {
    start.setHours(start.getHours() + 12);
  }

  let end: Date;
  if (allDay) {
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else if (result.end && result.end.isCertain('hour')) {
    end = result.end.date();
    if (end <= start) end = new Date(end.getTime() + 12 * 3600_000);
  } else {
    end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  }

  const rest = text.slice(0, result.index) + ' ' + text.slice(result.index + result.text.length);
  const title = cleanTitle(rest) || 'Termin';

  return { title, start, end, allDay };
}
