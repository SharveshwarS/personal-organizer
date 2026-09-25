# 0.4.0-preview.1 — a little garden, a clearer day

This preview adds an optional cozy garden and firefly companion, XP/levels/badges, daily suggestions, a task-linked focus/break timer, reminder snooze without changing due dates, flexible recurring tasks, tags/priority filters, habit schedule history and pauses, recurring bills and monthly category comparisons.

Read [the product comparison and behavior details](FEATURE-COMPARISON-0.4.md). The app stays local and offline. The update preserves existing records; it does not reset the installed profile or invent past rewards.

## Data compatibility

New fields are optional additions to schema 2 and are validated on save/import. Existing backups remain importable. New exports retain garden events, focus sessions, snoozes, bill definitions and habit history. Keep using this version or newer after adding these features: older app editors do not understand the new fields and may discard them. Export a backup before any deliberate downgrade.

## Verification

55 domain/SQLite tests passed, including 11 new cases covering reward deduplication and opt-out, habit history/pauses, snooze timing, custom/calendar recurrence, focus persistence, bill payment deduplication and malformed extension rejection. Production TypeScript/Vite/Electron compilation passed.

The development desktop workflow suite also passed with 16 UI workflow groups and 12 desktop smoke checks. It exercised actual IPC/SQLite persistence, task/habit rewards, snooze, filters, focus pause/resume and hidden-window completion, garden interaction, habit pauses and confirmed bill payment. Synthetic focus deadlines were shortened to exercise the real background completion path. Reminder transport was captured; native file-dialog choices were simulated.

Windows popup clicks, sleep/wake, login startup and actual OS display scaling still require a native desktop trial. The app cannot notify while the PC is off. Local trial, signing, license selection and GitHub publication remain separate from these checks.

## Final package and installation

The final packaged run passed with exit code 0: 16 UI workflow groups and 12 desktop checks. It used `--smoke-test --disable-gpu` after the graphics capture provider returned `UnknownVizError` during a prior run. This flag was used only for QA; normal installed rendering settings were not changed. The invalid-backup test intentionally logs an unsupported-format error. The resulting garden and monthly-comparison screenshots were inspected.

The Windows installer exited with code 0. Windows registers 0.4.0-preview.1; the installed application archive matches the tested archive, the desktop shortcut resolves correctly, and the user database SHA-256 is unchanged. The previous installer/blockmap were removed. The current installer/checksum remain under `release/`.

Local evidence (ignored and excluded from distribution): `qa/feature-unit-tests.log`, `qa/garden-packaged.stdout.log`, `qa/garden-packaged.stderr.log`, `qa/garden-packaged.exitcode`, `qa/ui-flows.json`, `qa/desktop-smoke.json`, `qa/installation-garden.json`, and the `qa/qa-*.png` screenshots. Archive inspection confirmed no QA profile, database or `.env` file and confirmed third-party notices.
