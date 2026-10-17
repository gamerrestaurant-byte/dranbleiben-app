import { time } from './format';
import type { CalendarEvent, Settings } from './types';

export type PlannedReminder = {
  at: Date;
  kind: 'evening' | 'morning' | 'before' | 'outcome';
  title: string;
  body: string;
};

const MIN = 60_000;
/** Reminders closer together than this are merged, keeping the earlier one. */
const MERGE_WINDOW = 20 * MIN;

function atHour(day: Date, hour: number, offsetDays = 0): Date {
  const d = new Date(day);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function planReminders(event: CalendarEvent, settings: Settings, now: Date): PlannedReminder[] {
  const when = event.allDay ? 'ganztägig' : `um ${time(event.start)}`;
  const planned: PlannedReminder[] = [];

  if (settings.eveningBefore.enabled) {
    planned.push({
      at: atHour(event.start, settings.eveningBefore.hour, -1),
      kind: 'evening',
      title: `Morgen: ${event.title}`,
      body: `Morgen ${when}. Ist alles vorbereitet?`,
    });
  }

  if (settings.morningOf.enabled) {
    const at = atHour(event.start, settings.morningOf.hour);
    if (event.allDay || at.getTime() <= event.start.getTime() - 30 * MIN) {
      planned.push({ at, kind: 'morning', title: `Heute: ${event.title}`, body: `Heute ${when}.` });
    }
  }

  if (!event.allDay && settings.minutesBefore != null) {
    const lead = settings.minutesBefore + settings.bufferMinutes;
    planned.push({
      at: new Date(event.start.getTime() - lead * MIN),
      kind: 'before',
      title: event.title,
      body: settings.bufferMinutes > 0 ? `Zeit loszugehen, Termin ${when}.` : `Gleich ${when}.`,
    });
  }

  const reminders = planned
    .filter((r) => r.at > now && r.at < (event.allDay ? event.end : event.start))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const merged: PlannedReminder[] = [];
  reminders.forEach((r, i) => {
    const next = reminders[i + 1];
    // Drop a reminder when a more specific one follows right after it.
    if (next && next.at.getTime() - r.at.getTime() < MERGE_WINDOW) return;
    merged.push(r);
  });

  if (settings.askOutcome && !event.allDay) {
    const at = new Date(event.end.getTime() + 15 * MIN);
    if (at > now) {
      merged.push({ at, kind: 'outcome', title: 'Hat geklappt?', body: `${event.title} ${when}` });
    }
  }

  return merged;
}
