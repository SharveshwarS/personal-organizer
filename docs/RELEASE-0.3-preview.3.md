# 0.3.0-preview.3 — reminders when choosing a time

Choosing or changing a task time now enables its Windows reminder automatically. When there is no date, the editor selects today and displays it in the date field. Clearing the time disables the reminder. Users can uncheck the reminder after choosing a time to keep a calendar entry without an alert.

Opening an existing task without changing its time preserves its saved reminder preference. Existing records are not changed in bulk. Habit daily/interval reminder schedules already enable notifications when saved.

The app still needs to be running, including in the tray, for Windows alerts. Quiet hours and Windows notification settings continue to apply. Final functional testing remains with the maintainer.

On 25 September 2026, the production TypeScript/Vite/Electron build and NSIS packaging succeeded. Installation exited with code 0; Windows registers preview 3, the installed archive matches the build, and the desktop shortcut points to it. The database hash is unchanged across installation. Previous build output was removed, and the current installer/checksum are in release/. The app remains closed for the maintainer's testing; no final functional tests were run.

## Later validation

Agent testing was subsequently authorized and completed within the scope documented in [25 September test results](TEST-REPORT-2026-09-25.md). The earlier testing deferral above is historical.
