# Desktop validation — 25 September 2026

Scope: local Windows Electron app, 0.3.0-preview.4. The maintainer requested agent testing after previously reserving it for themselves. All synthetic records are confined to `qa/desktop-profile`; the installed user's data is not reset. This report separates automated behavior from checks requiring an actual native interaction.

## Findings and correction

A 1280×720 window exposed a sidebar defect: Settings and the profile could fall below the viewport with no sidebar scroll. Preview 4 uses tighter spacing on short windows and enables overflow scrolling. Regression checks cover Settings visibility at 1280×720 and the minimum 980×680 window, plus reachability with 125/150/200% renderer zoom. Renderer zoom does not certify Windows display scaling.

The habit editor is usable by scrolling, but its detailed help text makes it lengthy. A future refinement could shorten the explanations and keep the Save button visible while scrolling.

## Automated evidence

- `npm test`: **44 tests passed, zero failures**, covering domain logic and SQLite. Scenarios include integer money precision, savings transfers, refunds, effective plans, recurring checklists, habit streaks, interval slots and deduplication, quiet hours, schema migration, revisions and restore undo.
- `npm run package:win`: production TypeScript, Vite and Electron compilation plus NSIS packaging succeeded. Third-party notices cover 88 production packages.
- Packaged `--smoke-test`: 12 desktop assertions and 12 UI workflow groups. See local `qa/desktop-smoke.json`, `qa/ui-flows.json` and `qa/preview4.stdout.log`.
- Separate native notification transport check: Windows emitted `show`; see `qa/native-notification.json`. It does not prove that a visible banner appeared or that a user clicked it.

The desktop smoke checks cover secure local protocol, a sandboxed renderer, real preload/SQLite save and reload, finance semantics, closing into the tray, task and habit dispatch while hidden, repeated-reconciliation deduplication, reopening/navigation, and retaining habit history while editing reminders. Scheduler notification transport is captured so dispatch assertions are deterministic.

The UI groups cover onboarding and skipped finance; invalid JPY decimals; Back navigation and KWD three-decimal plans; setup persistence; new lists and duplicate rejection; automatic task reminders and manual opt-out; task delete/undo; standard/custom habit units and intervals; note autosave and Markdown; category reassignment; calendar preferences/views; CSV export; and backup export/import/undo through real Electron IPC. Native dialog selections are simulated, and invalid imports are rejected without changing the stored state.

Finance was checked against hand calculations in KWD: income 100.125, expense 10.005, refund 1.001 and savings transfer 20.025 produce surplus **91.121**, spendable balance **71.096** and savings balance **20.025**. CSV values retain all three decimal places.

Screenshots in ignored `qa/` include onboarding, habit editor, finance and short-window layouts. Synthetic backup/CSV files and QA profiles are also ignored and excluded from distribution.

## Native limitations and remaining checks

The computer-use screenshot provider failed with `SetIsBorderRequired ... 0x80004002`; native pointer input lacked coordinate geometry. Accessibility inspection and Electron-rendered screenshots were available. Consequently, no claim is made that native popups, notification clicks, tray clicks or file-picker dialogs were visually exercised.

Still check: scheduled Windows banners and clicks while hidden; actual tray actions; Windows Do Not Disturb; sleep/wake and login startup; actual OS scaling, full keyboard/screen-reader coverage; native file dialogs; fresh-machine install and uninstall/reinstall. The current automated checks do not simulate a powered-off PC. Alerts require the organizer to be running and Windows awake.

See [the remaining checklist](FINAL-TEST-CHECKLIST.md). Local daily use, license selection, repository naming, code signing and publication remain separate decisions.

## Recommended next features

These are proposals, not implemented features:

1. **Reminder inbox and snooze**: show upcoming/missed reminders, offer 5/10/30-minute snooze, and provide an explicit Done or habit check-in action.
2. **Flexible recurrence**: every N days, weekdays, last day of month, and clear editing of one occurrence versus a series.
3. **Bills and monthly comparison**: recurring bill reminders with payment confirmation, category trends and an exportable monthly summary. Prevent duplicate transactions when marking a bill paid.
4. **Habit history and pauses**: preserve historical targets/schedules and support vacations without rewriting previous progress.
5. **Focus sessions and faster capture**: a task-linked focus timer, optional global quick-add shortcut, and tags/saved filters.

The reminder and recurrence improvements are the highest priority for this app's current workflows. Timer, shortcut and richer reminder options also appear in [TickTick's published feature set](https://ticktick.com/features); the proposals above should retain this app's original design and local-only storage.

## Installed update

Preview 4 was installed after the final packaged smoke/UI run passed. Windows registers `0.3.0-preview.4`; the installed `app.asar` hash matches the tested archive. The user database SHA-256 is unchanged across installation, and the existing desktop shortcut resolves to the installed executable. Evidence: local `qa/installation-preview4.json`. The previous preview-3 installer/blockmap were removed; `release/SHA256SUMS.txt` describes the current preview-4 installer.

Archive inspection found no database, QA directory or `.env` artifact and confirmed bundled third-party notices. The invalid-backup scenario intentionally logs `Unsupported backup format or version`; this expected rejection is asserted by the suite and is not a test failure.
