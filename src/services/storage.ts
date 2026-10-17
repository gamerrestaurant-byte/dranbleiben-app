import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OutcomeRecord } from '../lib/streak';
import { DEFAULT_SETTINGS, type Outcome, type Settings } from '../lib/types';

const SETTINGS_KEY = 'settings.v1';
const OUTCOMES_KEY = 'outcomes.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadOutcomes(): Promise<OutcomeRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTCOMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function recordOutcome(key: string, start: Date, outcome: Outcome): Promise<OutcomeRecord[]> {
  const records = (await loadOutcomes()).filter((r) => r.key !== key);
  records.push({ key, start: start.toISOString(), outcome });
  await AsyncStorage.setItem(OUTCOMES_KEY, JSON.stringify(records));
  return records;
}
