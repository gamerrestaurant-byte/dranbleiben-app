import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Heading } from './src/components/ui';
import type { OutcomeRecord } from './src/lib/streak';
import { DEFAULT_SETTINGS, type CalendarEvent, type Outcome, type Settings } from './src/lib/types';
import { QuickAddScreen } from './src/screens/QuickAddScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { WeekScreen } from './src/screens/WeekScreen';
import { ensureCalendarPermission } from './src/services/calendar';
import { ACTION_SNOOZE, OUTCOME_ACTIONS, rescheduleAll, setupNotifications, snooze } from './src/services/notifications';
import { loadOutcomes, loadSettings, recordOutcome, saveSettings } from './src/services/storage';
import { useTheme } from './src/theme';

type Tab = 'add' | 'week' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'add', label: 'Eintragen' },
  { id: 'week', label: 'Woche' },
  { id: 'settings', label: 'Einstellungen' },
];

function Main() {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>('add');
  const [ready, setReady] = useState(false);
  const [calendarAllowed, setCalendarAllowed] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  const state = useRef({ settings, outcomes });
  state.current = { settings, outcomes };

  const refresh = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    const { settings: s, outcomes: o } = state.current;
    try {
      await rescheduleAll(s, new Set(o.map((r) => r.key)));
    } catch (e) {
      console.warn('Erinnerungen konnten nicht geplant werden', e);
    }
  }, []);

  const rate = useCallback(
    async (key: string, start: Date, outcome: Outcome) => {
      const records = await recordOutcome(key, start, outcome);
      setOutcomes(records);
      state.current.outcomes = records;
      setRefreshKey((k) => k + 1);
    },
    [],
  );

  const handleResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const content = response.notification.request.content;
      const data = content.data as { kind?: string; key?: string; start?: string } | undefined;
      if (response.actionIdentifier === ACTION_SNOOZE) {
        await snooze(content);
      } else if (data?.key && data.start && OUTCOME_ACTIONS[response.actionIdentifier]) {
        await rate(data.key, new Date(data.start), OUTCOME_ACTIONS[response.actionIdentifier]);
      } else if (data?.kind === 'weekly' || data?.kind === 'outcome') {
        setTab('week');
      }
      Notifications.clearLastNotificationResponse();
    },
    [rate],
  );

  // Start-up: load data, ask for permissions, plan reminders.
  useEffect(() => {
    (async () => {
      const [s, o] = await Promise.all([loadSettings(), loadOutcomes()]);
      setSettings(s);
      setOutcomes(o);
      state.current = { settings: s, outcomes: o };
      const allowed = await ensureCalendarPermission();
      setCalendarAllowed(allowed);
      await setupNotifications();
      const last = Notifications.getLastNotificationResponse();
      if (last) await handleResponse(last);
      setReady(true);
      if (allowed) await refresh();
    })();
  }, [handleResponse, refresh]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      sub.remove();
      appState.remove();
    };
  }, [handleResponse, refresh]);

  const changeSettings = async (next: Settings) => {
    setSettings(next);
    state.current.settings = next;
    await saveSettings(next);
    refresh();
  };

  const onRate = (event: CalendarEvent, outcome: Outcome) => rate(event.key, event.start, outcome);

  if (!ready) return null;

  if (!calendarAllowed) {
    return (
      <View style={styles.center}>
        <Heading>Kalenderzugriff fehlt</Heading>
        <Body>Die App trägt Termine direkt in deinen Kalender ein und erinnert dich daran. Dafür braucht sie Zugriff.</Body>
        <Button
          label="Zugriff erlauben"
          onPress={async () => {
            const ok = await ensureCalendarPermission();
            setCalendarAllowed(ok);
            if (ok) refresh();
          }}
          hint="Falls nichts passiert: in den Systemeinstellungen den Kalenderzugriff für die App erlauben"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'add' && <QuickAddScreen settings={settings} focusKey={focusKey} onAdded={refresh} />}
        {tab === 'week' && (
          <WeekScreen
            outcomes={outcomes}
            refreshKey={refreshKey}
            onRate={onRate}
            onAddMissing={() => {
              setTab('add');
              setFocusKey((k) => k + 1);
            }}
          />
        )}
        {tab === 'settings' && <SettingsScreen settings={settings} onChange={changeSettings} />}
      </View>
      <View accessibilityRole="tablist" style={[styles.tabs, { borderTopColor: t.border, backgroundColor: t.card }]}>
        {TABS.map((item) => {
          const selected = item.id === tab;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={styles.tab}
            >
              <Text style={{ fontSize: 16, fontWeight: selected ? '700' : '500', color: selected ? t.accent : t.muted }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style="auto" />
        <Main />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 24, justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
});
