# 0.3.0-preview.1 — public-use preparation

Maintainer: [Sharveshwar S](https://github.com/SharveshwarS).

## Current gate

On 24 September 2026, the maintainer authorized a clean build and installation, deletion of previous app data and old releases, and reserved final functional testing for themselves. Version 0.3.0-preview.1 is now installed for that trial. Publication is a separate decision after the local trial. Previous version-0.2 test results do not certify this update.

The license decision is deferred until after testing and a period of local use. `package.json` remains `UNLICENSED`; no license file or public repository has been created. The GitHub repository name remains undecided.

## Implemented in source

- First-run setup: optional name, currency, week start, optional monthly income/savings plan, opening balances, optional Windows login startup, and backup restore.
- New workspaces have no assumed income, savings target, or fabricated records. Existing users keep their prior data and implicit plans.
- Currency-aware entry, totals and CSV exports, including zero- and three-decimal currencies. Currency changes are blocked once financial values exist. Backup restore deliberately replaces the whole workspace and supports undo.
- Effective-month planning defaults preserve earlier months and explicit monthly plans.
- Custom task lists and expense categories; renaming updates linked records, removal reassigns records and combines category budgets.
- Real task checklists. The next recurring occurrence starts with unchecked steps while the old occurrence retains its history.
- Sunday/Monday calendars; system-local date display; an explicit Unscheduled task filter.
- Reminder quiet hours, including overnight ranges. Suppressed items are not marked as delivered, so eligible items can alert after quiet hours end.
- Finance setup guidance, oversubscribed-plan messaging, backup status, an Open data folder action, and disabled Undo restore when none exists.
- Author attribution and a controlled GitHub link; no arbitrary external URL bridge.
- Schema-1 migration, retained pre-migration payload, version-2 backup exports and backward-compatible imports.
- Separate development profile and Windows app identity; source-only GitHub preparation, contribution/security/privacy docs, issue templates, and a manually triggered Windows workflow.
- Distribution notice generation from installed, locked production dependencies.

## Checks in this phase

Both static TypeScript checks passed on 24 September 2026: `tsc --noEmit` for the interface and `tsc -p tsconfig.electron.json --noEmit` for Electron/shared source. They emit no build or installer.

The production TypeScript/Vite build and Windows NSIS packaging completed successfully. Notices were generated for 88 production packages. The installer exited with code 0, Windows registered version 0.3.0-preview.1, and the installed application archive matched the clean build by SHA-256. The archive contains the new interface and notices and no database or QA profile. The desktop and Start Menu shortcuts target the installed app.

As explicitly requested, the previous desktop profile (including automatic backups), previous release builds, and QA profiles/screenshots were deleted. No pre-reset backup was retained. The app has not been launched after installation, leaving first-run setup untouched. The sole current installer and its checksum are in `release/`.

Prepared automated tests and final browser/native functional checks have not been run for this preview. Installation and artifact integrity checks do not certify feature behavior. The maintainer will perform final testing using [FINAL-TEST-CHECKLIST.md](FINAL-TEST-CHECKLIST.md).

## Release-preparation follow-up

The npm production-dependency audit returned zero reported vulnerabilities on 24 September 2026 (`npm audit --omit=dev`). This is limited to npm's reported advisories for production packages; it does not certify the Electron runtime, development toolchain, or application logic.

The three official GitHub Actions references are pinned to the commit hashes resolved from their v6/v6/v7 tags. The manual workflow has not been run. A targeted source scan found no matches for the checked local user paths or common private-key/token patterns; this is not an exhaustive secret audit.

The development shortcut-repair helper now prefers the installed app and does not make installed shortcuts depend on the developer's release folder. Only its syntax was checked; it was not executed. These workflow/helper/documentation changes do not change the installed preview or its data. A [local-trial guide](LOCAL-TRIAL.md) is available for the maintainer.

## Deliberate remaining scope

The current interface is English and dark themed. Windows x64 is the distribution target. Multiple currencies in one workspace, automatic conversion, cloud sync, mobile clients, advanced recurrence, habit schedule version history, recurring bills, separate bank accounts, note attachments, and a focus timer remain possible later features. These are not represented as complete.

Interactive installer/uninstaller, native dialogs, toast clicks, physical sleep/wake, login startup and DPI scaling require final hands-on checks. Code signing, licensing and repository publication are release decisions after the local trial.

## Later validation

The maintainer subsequently authorized agent testing. See [25 September test results](TEST-REPORT-2026-09-25.md) for the current status; the descriptions above record the earlier preview-1 phase.
