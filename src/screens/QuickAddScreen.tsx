import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Body, Button, Card, Heading } from '../components/ui';
import { range } from '../lib/format';
import { parseEntry } from '../lib/parse';
import type { Settings } from '../lib/types';
import { addEvent, resolveTargetCalendar, type WritableCalendar } from '../services/calendar';
import { useTheme } from '../theme';

const EXAMPLES = ['Zahnarzt Do 15 Uhr', 'Mama anrufen morgen 18:30', 'Meeting nächsten Montag 10-11 Uhr'];

export function QuickAddScreen({
  settings,
  focusKey,
  onAdded,
}: {
  settings: Settings;
  focusKey: number;
  onAdded: () => void;
}) {
  const t = useTheme();
  const input = useRef<TextInputInstance>(null);
  const [text, setText] = useState('');
  const [calendar, setCalendar] = useState<WritableCalendar | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseEntry(text) : null), [text]);

  useEffect(() => {
    resolveTargetCalendar(settings.calendarId).then(setCalendar).catch(() => setCalendar(null));
  }, [settings.calendarId]);

  useEffect(() => {
    input.current?.focus();
  }, [focusKey]);

  async function save() {
    if (!parsed || !calendar) return;
    setSaving(true);
    try {
      await addEvent(calendar.id, parsed);
      setMessage({ kind: 'ok', text: `Eingetragen: ${parsed.title}, ${range(parsed.start, parsed.end, parsed.allDay)}` });
      setText('');
      onAdded();
    } catch (e) {
      setMessage({ kind: 'error', text: 'Das hat nicht geklappt. Hat die App Zugriff auf deinen Kalender?' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Heading>Termin eintragen</Heading>
      <TextInput
        ref={input}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setMessage(null);
        }}
        onSubmitEditing={save}
        autoFocus
        returnKeyType="done"
        placeholder="z. B. Zahnarzt Do 15 Uhr"
        placeholderTextColor={t.muted}
        accessibilityLabel="Termin in eigenen Worten"
        accessibilityHint="Zum Beispiel: Zahnarzt Donnerstag 15 Uhr"
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.accent }]}
      />

      {text.trim() !== '' && (
        <Card>
          {parsed ? (
            <View accessibilityLiveRegion="polite">
              <Text style={[styles.previewTitle, { color: t.text }]}>{parsed.title}</Text>
              <Body>{range(parsed.start, parsed.end, parsed.allDay)}</Body>
              <Body muted>{calendar ? `Kalender: ${calendar.title}` : 'Kein beschreibbarer Kalender gefunden'}</Body>
            </View>
          ) : (
            <Body muted>Ich finde noch kein Datum. Schreib z. B. „morgen 14 Uhr“ oder „Fr 9:30“.</Body>
          )}
          <Button label={saving ? 'Speichere …' : 'In Kalender eintragen'} onPress={save} disabled={!parsed || !calendar || saving} />
        </Card>
      )}

      {message && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: message.kind === 'ok' ? t.success : t.danger }]}
        >
          {message.text}
        </Text>
      )}

      {text.trim() === '' && (
        <View style={styles.examples}>
          <Body muted>Beispiele zum Antippen:</Body>
          {EXAMPLES.map((ex) => (
            <Button key={ex} label={ex} variant="secondary" onPress={() => setText(ex)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { fontSize: 20, minHeight: 56, borderWidth: 2, borderRadius: 14, paddingHorizontal: 16, marginBottom: 12 },
  previewTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  message: { fontSize: 17, marginTop: 4, marginBottom: 12 },
  examples: { marginTop: 8 },
});
