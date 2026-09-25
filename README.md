# Personal Organizer

A private, offline Windows app for tasks, calendars, habits, notes, and monthly budgets.

Created by [Sharveshwar S](https://github.com/SharveshwarS). Built with React, TypeScript, Electron, and SQLite.

**Status: 0.4.0-preview.1 adds a cozy garden, focus sessions, reminder snooze, flexible recurrence, tags, habit history/pauses, recurring bills and monthly comparisons.** See the release notes for test coverage and remaining native desktop checks. This is a preview with publicly shared source. An open-source license has not been selected; package metadata remains `UNLICENSED`.

## Make it yours

On the first launch, choose an optional name, currency, and whether your week begins on Sunday or Monday. Add expected monthly income, a savings target, and opening balances, or skip finance setup entirely. No income, expenses, tasks, or habit history are inserted for you.

- **Tasks:** custom lists, priorities, dates, durations, checklists, daily/weekday/weekly/monthly/yearly/custom recurrence, tags, priority filters, completion history, and deletion undo.
- **Calendar:** month/week views, agenda, task rescheduling, and your preferred first day of the week.
- **Habits:** daily or selected weekdays, numeric targets, preset/custom units, check-ins, streaks, history heatmap, preserved target/schedule history, vacation pauses, and daily or interval Windows reminders.
- **Notes:** Markdown, autosave, folders, pinning, and search.
- **Finance:** one chosen currency, income/expenses/refunds, savings transfers, custom categories, monthly plans, future planning defaults, charts, balances, confirmed recurring bill payments, monthly category comparisons, and CSV export.
- **Reminders:** native Windows notifications, 5/10/30-minute task/habit snooze, quiet hours, and background tray operation.
- **Focus:** task-linked focus/break timers, pause/resume, background completion and session history.
- **Journey:** an optional cozy garden, firefly companion, XP, levels, badges and gentle daily quests.
- **Recovery:** local SQLite storage, validated JSON export/restore, undo restore, and up to 14 automatic daily snapshots.

The interface is currently English and dark themed. Windows x64 is the current packaging target. This app is independent and is not affiliated with TickTick.

## Everyday use

For the installed preview, start with the [short local-trial guide](docs/LOCAL-TRIAL.md).

1. Complete first-run setup or restore an existing backup.
2. Use **+** beside **My Lists** to create a list. Add a task with **Quick add** or **Ctrl+N**. Use **Ctrl+K** to search tasks and notes.
3. Choose a task time to automatically enable its reminder; you can uncheck it if you prefer no alert. For a habit, choose a progress unit and set Windows reminders to once daily or an interval in minutes/hours, with a start/end time on selected weekdays.
4. Record income when it actually arrives. Expected income is only a plan.
5. Review your month in Finance. Edit one monthly plan, or configure starting amounts for future months under Settings.
6. Periodically export a backup to a separate drive.

**X keeps the app in the tray.** Click the tray icon to reopen. Right-click it and choose **Quit Personal Organizer** to exit fully. Optional startup with Windows is in Settings. A fully quit app or sleeping/off PC cannot send alerts. Windows notification settings may silence popups; use Settings → Test to check delivery.

## Money and history

Supported currencies include INR, USD, EUR, GBP, CAD, AUD, JPY, KWD, and others listed during setup. Amounts are stored as integer minor units with the chosen currency's precision. One workspace uses one currency; no exchange-rate conversion is performed. Currency is locked after financial amounts exist so existing records cannot be accidentally relabeled.

Monthly surplus is actual income minus net expenses. Savings transfers affect balances but do not count as spending. Unpaid commitments are a manual reserve: reduce the reserve when recording their payments. The daily allowance uses planned income, savings target, net spending, unpaid commitments, and remaining calendar days. It is not a measure of cash on hand.

Changing future planning defaults leaves earlier months and explicitly saved monthly plans unchanged. Removing a list/category reassigns its records; category limits are combined. Habit target, unit and weekday edits apply from today; recorded schedule history preserves earlier progress. Vacation pauses skip reminders and streak requirements. Changes made in older versions cannot be reconstructed.

## Data and upgrades

Records stay in the app's Windows user-data directory, shown in Settings. They are not encrypted. There is no telemetry, cloud account, bank connection, or automatic updater. Opening the author's GitHub link launches the default browser only when requested.

Existing 0.1/0.2 workspaces migrate to schema 2 with their INR values and previous implicit plans preserved. The exact schema-1 recovery payload is retained in SQLite metadata before migration. Older JSON backups remain importable; new exports use version 2. Older app versions must not be used to edit a schema-2 database.

The development desktop app has a separate **Personal Organizer Development** profile. Browser preview and automated QA also use separate storage. Updates should not overwrite user data; uninstall is configured to retain it.

## Development

Use Node.js 24 or newer and Git on Windows:

```powershell
git clone https://github.com/SharveshwarS/personal-organizer.git
cd personal-organizer
npm ci
npm run dev          # Browser preview at the URL Vite prints
npm run desktop      # Build and open the separate development desktop profile
npm run typecheck    # Static source checks only
```

The browser preview does not send Windows notifications. It uses its own browser storage and is not the installed app.

Run the automated checks and build locally:

```powershell
npm test
npm run build
npm run package:win
```

The Windows installer and unpacked app are produced in `release/`. This source preview does not include a downloadable installer on GitHub. Build one locally with the command above. Packaging generates third-party notices from the locked production dependencies. Electron's own notices ship with its runtime. Executables are currently unsigned.

## Project documents

- [Cozy garden update and validation](docs/RELEASE-0.4-preview.1.md)
- [Competitor comparison, feature details and remaining roadmap](docs/FEATURE-COMPARISON-0.4.md)

- [Short-window navigation in preview 4](docs/RELEASE-0.3-preview.4.md)
- [Automatic task reminders in preview 3](docs/RELEASE-0.3-preview.3.md)
- [Quick lists and interval reminders in preview 2](docs/RELEASE-0.3-preview.2.md)
- [Test results and remaining desktop checks](docs/TEST-REPORT-2026-09-25.md)
- [Final test checklist](docs/FINAL-TEST-CHECKLIST.md)
- [Product direction and remaining roadmap](docs/PRODUCT-PLAN.md)
- [Architecture and build plan](docs/BUILD-PLAN.md)
- [Contributing](CONTRIBUTING.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md)

## License

No open-source license is granted at this time. Copyright © 2026 Sharveshwar S. Package metadata intentionally remains `UNLICENSED`; this is not the public-domain Unlicense. See [GitHub’s explanation of unlicensed repositories](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository). Third-party dependencies retain their own licenses; `npm run notices` generates their attribution file.

`private: true` prevents accidental npm publication; it does not describe the GitHub repository’s visibility.
