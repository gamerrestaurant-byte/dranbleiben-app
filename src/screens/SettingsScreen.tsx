import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Body, Card, Heading } from '../components/ui';
import type { Settings } from '../lib/types';
import { writableCalendars, type WritableCalendar } from '../services/calendar';
import { useTheme } from '../theme';

function Chips<T>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, { borderColor: t.accent, backgroundColor: selected ? t.accent : 'transparent' }]}
          >
            <Text style={{ color: selected ? t.accentText : t.accent, fontSize: 16, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, value, onChange, children }: { label: string; value: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  const t = useTheme();
  return (
    <Card>
      <View style={styles.row}>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
        <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
      </View>
      {value && children}
    </Card>
  );
}

const hours = (list: number[]) => list.map((h) => ({ value: h, label: `${h} Uhr` }));

export function SettingsScreen({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const t = useTheme();
  const [calendars, setCalendars] = useState<WritableCalendar[]>([]);

  useEffect(() => {
    writableCalendars().then(setCalendars).catch(() => setCalendars([]));
  }, []);

  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Heading>Einstellungen</Heading>

      <Card>
        <Text style={[styles.label, { color: t.text }]}>Neue Termine eintragen in</Text>
        {calendars.length === 0 && <Body muted>Keine beschreibbaren Kalender gefunden.</Body>}
        <Chips
          label="Kalender"
          value={settings.calendarId}
          onChange={(calendarId) => set({ calendarId })}
          options={[
            { value: null as string | null, label: 'Automatisch' },
            ...calendars.map((c) => ({ value: c.id as string | null, label: c.account ? `${c.title} (${c.account})` : c.title })),
          ]}
        />
      </Card>

      <Row
        label="Erinnerung am Vorabend"
        value={settings.eveningBefore.enabled}
        onChange={(enabled) => set({ eveningBefore: { ...settings.eveningBefore, enabled } })}
      >
        <Chips label="Uhrzeit am Vorabend" value={settings.eveningBefore.hour} onChange={(hour) => set({ eveningBefore: { enabled: true, hour } })} options={hours([18, 19, 20, 21, 22])} />
      </Row>

      <Row
        label="Erinnerung am Morgen"
        value={settings.morningOf.enabled}
        onChange={(enabled) => set({ morningOf: { ...settings.morningOf, enabled } })}
      >
        <Chips label="Uhrzeit am Morgen" value={settings.morningOf.hour} onChange={(hour) => set({ morningOf: { enabled: true, hour } })} options={hours([6, 7, 8, 9, 10])} />
      </Row>

      <Card>
        <Text style={[styles.label, { color: t.text }]}>Kurz vorher erinnern</Text>
        <Chips
          label="Kurz vorher erinnern"
          value={settings.minutesBefore}
          onChange={(minutesBefore) => set({ minutesBefore })}
          options={[
            { value: null as number | null, label: 'Aus' },
            { value: 15, label: '15 Min.' },
            { value: 30, label: '30 Min.' },
            { value: 60, label: '1 Std.' },
            { value: 120, label: '2 Std.' },
          ]}
        />
        <Text style={[styles.label, { color: t.text, marginTop: 12 }]}>Zusätzlicher Puffer (z. B. Anfahrt)</Text>
        <Chips
          label="Puffer"
          value={settings.bufferMinutes}
          onChange={(bufferMinutes) => set({ bufferMinutes })}
          options={[0, 15, 30, 45, 60].map((m) => ({ value: m, label: m === 0 ? 'Keiner' : `${m} Min.` }))}
        />
      </Card>

      <Row
        label="Wochenausblick am Sonntag"
        value={settings.weeklyPreview.enabled}
        onChange={(enabled) => set({ weeklyPreview: { ...settings.weeklyPreview, enabled } })}
      >
        <Chips
          label="Uhrzeit des Wochenausblicks"
          value={settings.weeklyPreview.hour}
          onChange={(hour) => set({ weeklyPreview: { enabled: true, hour, minute: 0 } })}
          options={hours([17, 18, 19, 20, 21])}
        />
      </Row>

      <Row label="Nach Terminen fragen „Hat geklappt?“" value={settings.askOutcome} onChange={(askOutcome) => set({ askOutcome })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center' },
});
