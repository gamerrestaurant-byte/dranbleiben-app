# Dranbleiben

Termine in Sekunden in den Kalender bringen und nicht mehr vergessen.

- **Schnelleintrag:** „Zahnarzt Do 15 Uhr“ eintippen, die App erkennt Datum und Uhrzeit und trägt den Termin direkt in den Kalender des Handys ein (bei eingerichtetem Google-Konto also in den Google Kalender).
- **Frühere Erinnerungen:** am Vorabend, am Morgen und kurz vorher, optional mit Anfahrts-Puffer. Alles in den Einstellungen anpassbar.
- **Wochenausblick:** jeden Sonntagabend eine Benachrichtigung mit der kommenden Woche, Überschneidungen und „Fehlt noch was?“.
- **Hat geklappt?** Nach jedem Termin kurz abhaken, dazu Serie und Wochenbilanz. Ohne Werbung, ohne Geld.

Konzept: siehe `/mnt/project-files/konzept/app-konzept.md` im Projekt.

## Ausprobieren

Voraussetzung: [Node.js](https://nodejs.org) (LTS) und die App **Expo Go** auf dem Handy.

```bash
npm install
npx expo start
```

Den QR-Code mit dem Handy scannen (iPhone: Kamera-App, Android: Expo Go). Beim ersten Start fragt die App nach Kalender- und Benachrichtigungszugriff.

## Entwickeln

```bash
npm test          # Texterkennung, Erinnerungsplan, Wochenlogik
npm run typecheck
```

| Ordner | Inhalt |
|---|---|
| `src/lib/` | Reine Logik ohne Handy-Abhängigkeit, mit Tests: Texterkennung (`parse.ts`), Erinnerungsplan (`reminders.ts`), Woche (`week.ts`), Serie (`streak.ts`) |
| `src/services/` | Kalender (`expo-calendar/legacy`), Benachrichtigungen (`expo-notifications`), Speicher (AsyncStorage) |
| `src/screens/` | Eintragen, Woche, Einstellungen |

## Bekannte Grenzen

- Benachrichtigungen werden beim Öffnen der App für die nächsten 14 Tage neu geplant (iOS erlaubt höchstens 64 gleichzeitig). Wer die App länger nicht öffnet, bekommt für später eingetragene Termine noch keine Erinnerung.
- Der Text des Sonntags-Ausblicks wird beim letzten Öffnen der App berechnet.
- Uhrzeiten von 1 bis 7 ohne Zusatz („um 3“) werden als Nachmittag gelesen.
