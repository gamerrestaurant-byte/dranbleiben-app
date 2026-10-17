import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import type { CalendarEvent } from '../lib/types';

export type WritableCalendar = { id: string; title: string; account: string; color?: string };

export async function ensureCalendarPermission(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

async function eventCalendars(): Promise<Calendar.Calendar[]> {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

export async function writableCalendars(): Promise<WritableCalendar[]> {
  const calendars = await eventCalendars();
  return calendars
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? '', color: c.color }));
}

/** The saved calendar if it still exists, otherwise the phone's default (Google if set up). */
export async function resolveTargetCalendar(savedId: string | null): Promise<WritableCalendar | null> {
  const writable = await writableCalendars();
  const saved = writable.find((c) => c.id === savedId);
  if (saved) return saved;

  if (Platform.OS === 'ios') {
    try {
      const def = await Calendar.getDefaultCalendarAsync();
      const match = writable.find((c) => c.id === def.id);
      if (match) return match;
    } catch {
      // no default calendar set on this device
    }
  }

  const all = await eventCalendars();
  const google = all.find((c) => c.allowsModifications && c.isPrimary && /google/i.test(String(c.source?.type)));
  const primary = all.find((c) => c.allowsModifications && c.isPrimary);
  const pick = google ?? primary;
  return (pick && writable.find((c) => c.id === pick.id)) ?? writable[0] ?? null;
}

export async function addEvent(
  calendarId: string,
  entry: { title: string; start: Date; end: Date; allDay: boolean },
): Promise<string> {
  return Calendar.createEventAsync(calendarId, {
    title: entry.title,
    startDate: entry.start,
    endDate: entry.end,
    allDay: entry.allDay,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // The app sends its own, earlier reminders.
    alarms: [],
  });
}

export async function listEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  const calendars = await eventCalendars();
  const byId = new Map(calendars.map((c) => [c.id, c]));
  const events = await Calendar.getEventsAsync(
    calendars.map((c) => c.id),
    start,
    end,
  );
  return events
    .filter((e) => e.status !== Calendar.EventStatus.CANCELED)
    .map((e) => {
      const s = new Date(e.startDate);
      return {
        key: `${e.id}@${s.toISOString()}`,
        id: e.id,
        title: e.title || 'Ohne Titel',
        start: s,
        end: new Date(e.endDate),
        allDay: e.allDay,
        calendarTitle: byId.get(e.calendarId)?.title,
        color: byId.get(e.calendarId)?.color,
      };
    });
}
