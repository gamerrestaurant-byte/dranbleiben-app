export type CalendarEvent = {
  /** Unique per occurrence: event id plus start time. */
  key: string;
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarTitle?: string;
  color?: string;
};

export type Outcome = 'done' | 'moved' | 'missed';

export type Settings = {
  calendarId: string | null;
  eveningBefore: { enabled: boolean; hour: number };
  morningOf: { enabled: boolean; hour: number };
  minutesBefore: number | null;
  /** Extra lead time, e.g. for travel. Shifts the "before" reminder earlier. */
  bufferMinutes: number;
  weeklyPreview: { enabled: boolean; hour: number; minute: number };
  askOutcome: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  calendarId: null,
  eveningBefore: { enabled: true, hour: 20 },
  morningOf: { enabled: true, hour: 8 },
  minutesBefore: 60,
  bufferMinutes: 0,
  weeklyPreview: { enabled: true, hour: 19, minute: 0 },
  askOutcome: true,
};
