# 0.3.0-preview.2 — quick lists and habit reminders

## Changes

- **My Lists +** opens a small list-creation dialog, validates the name, and selects the new list after saving. Long lists scroll in the sidebar.
- Habit units now offer Times, Minutes, Hours, Glasses, Pages, Steps, Kilometers, Repetitions, Sessions, and Custom. Existing custom units and check-ins are retained when editing.
- Windows reminders have Off, Once a day, and Interval modes. Intervals can be 1–1440 minutes, including 10 minutes, 1 hour, or 2 hours. Choose a first reminder and a same-day end time; only selected weekdays apply.
- Interval reminders continue throughout the chosen window unless “Stop reminders when today's target is reached” is enabled. Once-daily reminders retain their unfinished-target behavior.
- Each interval has a persisted delivery key. Restart, sleep, and quiet hours consider only the most recent eligible slot, rather than replaying every missed interval. Outside the chosen window, interval notifications stop.
- The main-process scheduler checks at minute boundaries, on saves, at launch, and after wake. X-to-tray continues scheduling. Windows settings can suppress toasts; a sleeping/off PC or fully quit app cannot alert.

## Compatibility and validation

The optional interval settings are validated on save/import and preserved in backups. Old once-daily reminders remain compatible. This update must preserve the user's new trial records; no further profile reset is authorized.

Regression cases have been prepared for interval boundaries, selected weekdays, quiet-hours catch-up, target behavior, validation, and persistence. Final automated and native functional tests remain deferred to the maintainer.

Both TypeScript checks and the production Vite/Electron build passed. Windows NSIS packaging completed, and the installer exited with code 0. Windows now registers version 0.3.0-preview.2. The installed archive matches the build by SHA-256, the desktop shortcut points to the installed application, and the existing database hash is unchanged across installation. The previous preview build was removed; the current installer and SHA256SUMS.txt are in release/. The app was left closed for the user's own trial.
