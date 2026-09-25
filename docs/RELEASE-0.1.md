# Version 0.1.0 — development release

Historical record for version 0.1 only. Its defaults and test results do not describe the current preview. See [RELEASE-0.3.md](RELEASE-0.3.md) for current behavior and pending validation.

Built on 19 September 2026. React 19, Vite 8, Electron 44, and SQLite through Node's built-in SQLite API. Exact resolved dependency versions are in package-lock.json.

## Delivered

An offline desktop workspace with Today, tasks, scheduling, task reminders, habits, notes, and monthly finance tracking. The interface is dark by default. It has its own icon and a Windows x64 NSIS installer.

The app contains no pre-entered tasks, expenses, income receipts, or habit history. Planning defaults are ₹6,000 expected income and a ₹1,500 savings target. Test fixtures in `qa/desktop-profile` and the browser preview are separate from the real desktop profile.

## Verification completed

- TypeScript checks and Vite production build passed.
- 24 automated domain/storage tests passed: integer-paise arithmetic, refunds, savings transfers, opening balances, unknown historical balances, overspending, month/leap-year boundaries, recurrence, habit streaks, reminder eligibility, backup validation, stale-write rejection, SQLite close/reopen persistence, restore and undo.
- Dependency audit: zero known vulnerabilities after compatible build-dependency fixes.
- Browser UI: created a daily study task, completed it, and observed one remaining open occurrence. Recorded ₹6,000 income and a ₹420.50 transport expense; verified ₹5,579.50 surplus and ₹339.95 planned daily allowance for 12 remaining days. Created a Markdown note, previewed it, and confirmed persistence in a fresh tab. Created and checked in a habit, observing a one-day streak and 100% completion.
- Electron development and packaged smoke checks passed: secure local protocol, sandboxed renderer, narrow preload API, SQLite load/save, finance totals excluding savings transfers from expenses, window-reload persistence, and no renderer error messages in the exercised flows.
- Electron-rendered Today and Finance screenshots were visually inspected. Screenshots use separate QA fixtures, not real user data.
- The unpacked Windows app launched with an empty real workspace. Its native accessibility tree matched the rendered application.
- Windows installer built successfully. Executable icon and metadata are applied; code signing is unconfigured.

## Remaining platform checks

Native screenshot capture failed with `SetIsBorderRequired failed: No such interface supported (0x80004002)`, including after a fresh window selection. Accessibility text could be read, but native clicking failed with `coordinate input geometry is unavailable`. These are automation limitations; the application itself launched.

The following are not claimed as verified:

- Interactive installer wizard and uninstall flow.
- Visible Windows notifications, clicking a toast, and behavior under Focus Assist.
- Real sleep/resume and login-start behavior.
- Native backup save/open dialogs and the restore confirmation UI.
- Multiple Windows display-scaling settings.

Reminder eligibility/delivery-ledger logic and underlying restore operations have automated coverage. That does not replace native interaction checks.

## First-version limits and next work

- Four fixed task lists. Custom lists, tags, true subtasks, rich checklist controls, archives, and board/matrix layouts remain to implement.
- Daily, weekly, and monthly task recurrence. No custom intervals or bulk series editing yet; edits affect one occurrence and completion creates the next one.
- One reminder at the task's scheduled time. Snooze moves that occurrence's time. Habit reminders, multiple offsets, quiet hours, and daily-review alerts remain to implement.
- Habit schedules and targets are set on creation. Full editing with schedule history, pause/resume, best-streak statistics, and weekly targets remain to implement.
- Notes have Markdown text, folders, pins, and search. Attachments, revision history, note-task linking, and interactive Markdown checkboxes are not included.
- Finance has one combined spending balance and one savings balance. Individual bank accounts, linked recurring bills, automatic commitment reconciliation, custom categories, and printable monthly reports are not included. Unpaid commitments are a manual reserve.
- No focus/Pomodoro module, cloud sync, external calendars, mobile companion, encryption, or signing certificate.

The full product and build plans describe the longer-term destination. This document and README describe what is available now.
