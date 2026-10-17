import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planReminders } from '../lib/reminders';
import type { CalendarEvent, Outcome, Settings } from '../lib/types';
import { groupByDay, previewWeek, weekSummary } from '../lib/week';
import { listEvents } from './calendar';

const CHANNEL = 'termine';
export const CATEGORY_REMINDER = 'reminder';
export const CATEGORY_OUTCOME = 'outcome';
export const ACTION_SNOOZE = 'snooze';
export const OUTCOME_ACTIONS: Record<string, Outcome> = { done: 'done', moved: 'moved', missed: 'missed' };

/** iOS keeps at most 64 pending notifications; leave room for the weekly previews and snoozes. */
const MAX_SCHEDULED = 56;
const PLAN_DAYS = 14;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Termine',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY_REMINDER, [
    { identifier: ACTION_SNOOZE, buttonTitle: 'In 15 Min. nochmal', options: { opensAppToForeground: false } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY_OUTCOME, [
    { identifier: 'done', buttonTitle: 'Ja, erledigt', options: { opensAppToForeground: false } },
    { identifier: 'moved', buttonTitle: 'Verschoben', options: { opensAppToForeground: false } },
    { identifier: 'missed', buttonTitle: 'Verpasst', options: { opensAppToForeground: false } },
  ]);

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function nextWeeklyPreview(settings: Settings, now: Date, weeksAhead: number): Date {
  const d = new Date(now);
  d.setHours(settings.weeklyPreview.hour, settings.weeklyPreview.minute, 0, 0);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  if (d <= now) d.setDate(d.getDate() + 7);
  d.setDate(d.getDate() + 7 * weeksAhead);
  return d;
}

/**
 * Replaces all scheduled notifications with a fresh plan from the calendar.
 * Called on app start, when the app comes to the foreground, and after a new entry.
 */
export async function rescheduleAll(settings: Settings, ratedKeys: Set<string>, now = new Date()): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + PLAN_DAYS);
  const events = await listEvents(now, horizon);

  const planned = events
    .flatMap((event) =>
      planReminders(event, settings, now)
        .filter((r) => r.kind !== 'outcome' || !ratedKeys.has(event.key))
        .map((r) => ({ r, event })),
    )
    .sort((a, b) => a.r.at.getTime() - b.r.at.getTime())
    .slice(0, MAX_SCHEDULED);

  for (const { r, event } of planned) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: r.title,
        body: r.body,
        categoryIdentifier: r.kind === 'outcome' ? CATEGORY_OUTCOME : CATEGORY_REMINDER,
        data: { kind: r.kind, key: event.key, start: event.start.toISOString(), title: event.title },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }

  if (settings.weeklyPreview.enabled) {
    await scheduleWeeklyPreviews(settings, now);
  }
}

async function scheduleWeeklyPreviews(settings: Settings, now: Date) {
  // The text of a scheduled notification is fixed, so the next preview gets a summary computed now
  // (refreshed every time the app opens) and the following ones a generic text.
  for (let i = 0; i < 3; i++) {
    const at = nextWeeklyPreview(settings, now, i);
    let body = 'Schau dir an, was diese Woche ansteht.';
    if (i === 0) {
      const week = previewWeek(at);
      const events = await listEvents(week.start, week.end);
      body = weekSummary(groupByDay(events, week.start));
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Dein Wochenausblick', body, data: { kind: 'weekly' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

export async function snooze(content: Notifications.NotificationContent): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title ?? 'Erinnerung',
      body: content.body ?? '',
      categoryIdentifier: CATEGORY_REMINDER,
      data: content.data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15 * 60,
      channelId: CHANNEL,
    },
  });
}

export type { CalendarEvent };
