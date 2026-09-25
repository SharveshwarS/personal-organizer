# Version 0.2.0 — reminders and desktop polish

Historical record for version 0.2 only. These results do not certify the current preview. See [RELEASE-0.3.md](RELEASE-0.3.md) for current changes and pending validation.

- Replaced the icon with an original purple calendar/check mark. The app uses a vector logo, a 1024-pixel notification image, and a Windows ICO containing nine sizes from 16 to 256 pixels. Desktop shortcut refresh uses a versioned icon path to avoid stale Explorer artwork.
- X always hides the window to the tray, including when an older saved preference had disabled this behavior. Click the tray icon to reopen; right-click → Quit Personal Organizer to stop the app. The scheduler lives in the Electron main process and continues while the window is hidden.
- Added optional reminder times to new and existing habits. An unfinished habit alerts on its scheduled weekdays after the selected local time, once per day and reminder time. Completed targets and days off do not alert. Startup/wake catches today's pending habit reminders without replaying previous days. Existing habits remain opt-in.
- Habit editing preserves existing check-in records. Editing the target or weekdays recalculates displayed history using the new settings; schedule versioning is a future feature.
- Task and habit notifications open their respective views. The reminder inbox includes today's unfinished habit reminders and refreshes as time passes.
- Portable and installed launches register the Windows Start Menu shortcut with the application identity and a stable toast activation ID. Settings → Test now waits for Windows' notification show acknowledgement and reports failures.

## Verification

27 domain/storage tests pass, covering habit scheduling, target completion, reminder keys, legacy backup compatibility and invalid times, alongside existing finance, task recurrence, persistence and restore tests. Production TypeScript/Vite build passes.

Desktop smoke verification uses isolated data, exercises the real close handler and a 15-second scheduler tick with the window hidden, captures task/habit dispatches, checks duplicate prevention, reopens the window, and saves/reopens a habit reminder while retaining check-in history. The notification transport in this test is captured rather than sent to the user's notification center.

The final Windows package passed the desktop smoke checks. A real notification from version 0.2.0 received Windows' `show` acknowledgement; the result is recorded in the application's user-data folder as `notification-check.json`. This confirms native dispatch, not a human observation or click on the toast. The desktop shortcut and Start Menu registration were verified. Windows' native icon extraction shows the new embedded logo, and the desktop shortcut uses the new versioned ICO. The installer is `release/Personal-Organizer-Setup-0.2.0.exe`.

Physical sleep/wake, login after reboot, visible toast interaction under Do Not Disturb, native backup dialogs, the interactive installer wizard, and multiple Windows display scales remain separate manual checks. No automated result claims these interactions were exercised.

The broader future feature list in version 0.1 remains a roadmap, except habit editing/reminders are now delivered. This update does not claim full TickTick Premium parity.

## 0.2.1 taskbar icon correction
The Windows window now explicitly sets its taskbar/relaunch icon to a content-addressed ICO in the local data folder. This prevents Windows from reusing the old executable icon after updates. The installer is release/Personal-Organizer-Setup-0.2.1.exe. App identity, notifications and saved records are unchanged.
