const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const pad = (n: number) => String(n).padStart(2, '0');

export const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const weekday = (d: Date) => WEEKDAYS[d.getDay()];
export const weekdayLong = (d: Date) => WEEKDAYS_LONG[d.getDay()];
export const date = (d: Date) => `${weekday(d)}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;

export function range(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return `${date(start)}, ganztägig`;
  return `${date(start)}, ${time(start)}–${time(end)}`;
}
