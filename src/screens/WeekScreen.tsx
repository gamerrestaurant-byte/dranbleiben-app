import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Heading } from '../components/ui';
import { date, time, weekdayLong } from '../lib/format';
import { currentStreak, keptRate, type OutcomeRecord } from '../lib/streak';
import type { CalendarEvent, Outcome } from '../lib/types';
import { findConflicts, groupByDay, previewWeek, weekSummary, type Day } from '../lib/week';
import { listEvents } from '../services/calendar';
import { useTheme } from '../theme';

export function WeekScreen({
  outcomes,
  refreshKey,
  onRate,
  onAddMissing,
}: {
  outcomes: OutcomeRecord[];
  refreshKey: number;
  onRate: (event: CalendarEvent, outcome: Outcome) => void;
  onAddMissing: () => void;
}) {
  const t = useTheme();
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState<Day[]>([]);
  const [pending, setPending] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const base = previewWeek(now);
      const start = new Date(base.start);
      start.setDate(start.getDate() + 7 * offset);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      setDays(groupByDay(await listEvents(start, end), start));

      const weekAgo = new Date(now.getTime() - 7 * 86400_000);
      const rated = new Set(outcomes.map((o) => o.key));
      const past = await listEvents(weekAgo, now);
      setPending(past.filter((e) => !e.allDay && e.end <= now && !rated.has(e.key)).slice(-5));
      setError(false);
    } catch {
      setError(true);
    }
  }, [offset, outcomes]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const events = days.flatMap((d) => d.events);
  const conflicts = findConflicts(events);
  const streak = currentStreak(outcomes);
  const now = new Date();
  const rate = keptRate(outcomes, new Date(now.getTime() - 7 * 86400_000), now);
  const label = offset === 0 ? (now.getDay() === 0 ? 'Kommende Woche' : 'Diese Woche') : 'Woche danach';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Heading>Wochenausblick</Heading>

      {error && <Body muted>Ich kann deinen Kalender gerade nicht lesen. Hat die App Zugriff?</Body>}

      {pending.length > 0 && (
        <Card>
          <Text style={[styles.cardTitle, { color: t.text }]}>Hat geklappt?</Text>
          {pending.map((e) => (
            <View key={e.key} style={styles.pending}>
              <Body>
                {e.title} · {date(e.start)} {time(e.start)}
              </Body>
              <View style={styles.row}>
                <Button label="Ja" onPress={() => onRate(e, 'done')} hint={`${e.title} als erledigt markieren`} />
                <Button label="Verschoben" variant="secondary" onPress={() => onRate(e, 'moved')} />
                <Button label="Verpasst" variant="secondary" onPress={() => onRate(e, 'missed')} />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Text style={[styles.cardTitle, { color: t.text }]}>
          {streak > 0 ? `${streak} ${streak === 1 ? 'Termin' : 'Termine'} in Folge eingehalten` : 'Noch keine Serie'}
        </Text>
        <Body muted>
          {rate == null
            ? 'Hake Termine nach dem Termin ab, dann siehst du hier deine Bilanz.'
            : `Letzte 7 Tage: ${Math.round(rate * 100)} % eingehalten`}
        </Body>
      </Card>

      <View style={styles.row}>
        <Button label="◀" variant="secondary" onPress={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} hint="Vorherige Woche" />
        <Text style={[styles.weekLabel, { color: t.text }]}>{label}</Text>
        <Button label="▶" variant="secondary" onPress={() => setOffset(Math.min(1, offset + 1))} disabled={offset === 1} hint="Nächste Woche" />
      </View>

      <Body>{weekSummary(days)}</Body>
      {conflicts.length > 0 && (
        <Text style={[styles.warning, { color: t.warning }]}>
          ⚠ Überschneidung: {conflicts.map(([a, b]) => `${a.title} und ${b.title} (${weekdayLong(a.start)})`).join('; ')}
        </Text>
      )}

      {days.map((d) => (
        <View key={d.date.toISOString()} style={styles.day}>
          <Text accessibilityRole="header" style={[styles.dayTitle, { color: t.text }]}>
            {weekdayLong(d.date)}, {d.date.getDate()}.{d.date.getMonth() + 1}.
            {d.date.toDateString() === now.toDateString() ? ' · heute' : ''}
          </Text>
          {d.events.length === 0 ? (
            <Body muted>frei</Body>
          ) : (
            d.events.map((e) => (
              <View key={e.key} style={[styles.event, { borderLeftColor: e.color ?? t.accent }]}>
                <Body>{e.allDay ? `ganztägig · ${e.title}` : `${time(e.start)}–${time(e.end)} · ${e.title}`}</Body>
              </View>
            ))
          )}
        </View>
      ))}

      <Card style={{ marginTop: 12 }}>
        <Body>Fehlt noch was?</Body>
        <Button label="Termin eintragen" onPress={onAddMissing} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  pending: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  weekLabel: { fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center', marginTop: 8 },
  warning: { fontSize: 16, marginTop: 8 },
  day: { marginTop: 16 },
  dayTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  event: { borderLeftWidth: 4, paddingLeft: 10, paddingVertical: 4, marginBottom: 4 },
});
