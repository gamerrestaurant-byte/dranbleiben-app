import { weekdayLong } from './format';
import type { CalendarEvent } from './types';

/** The week a preview is about: on Sunday the coming week, otherwise the current one. */
export function previewWeek(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const toMonday = day === 0 ? 1 : 1 - day;
  start.setDate(start.getDate() + toMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export type Day = { date: Date; events: CalendarEvent[] };

export function groupByDay(events: CalendarEvent[], weekStart: Date): Day[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const dayEvents = events
      .filter((e) => e.start < next && e.end > date)
      .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());
    return { date, events: dayEvents };
  });
}

/** Pairs of timed events that overlap. */
export function findConflicts(events: CalendarEvent[]): [CalendarEvent, CalendarEvent][] {
  const timed = events.filter((e) => !e.allDay).sort((a, b) => a.start.getTime() - b.start.getTime());
  const conflicts: [CalendarEvent, CalendarEvent][] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length && timed[j].start < timed[i].end; j++) {
      conflicts.push([timed[i], timed[j]]);
    }
  }
  return conflicts;
}

export function weekSummary(days: Day[]): string {
  const total = new Set(days.flatMap((d) => d.events.map((e) => e.key))).size;
  if (total === 0) return 'Deine Woche ist noch leer. Fehlt noch etwas?';
  const busiest = days.reduce((a, b) => (b.events.length > a.events.length ? b : a));
  const termine = total === 1 ? '1 Termin' : `${total} Termine`;
  if (busiest.events.length >= 3) {
    return `Deine Woche: ${termine}, ${weekdayLong(busiest.date)} ist am vollsten.`;
  }
  return `Deine Woche: ${termine}.`;
}
