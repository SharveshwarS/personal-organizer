# Personal Organizer: product direction

Updated 24 September 2026. See [release status](RELEASE-0.3.md) for source changes awaiting final validation and the [test checklist](FINAL-TEST-CHECKLIST.md) for the release gate.

## Purpose

One private Windows app for planning the day, building routines, keeping notes, and understanding monthly spending. It should work for students, working adults, and anyone managing a personal routine, without assuming an income, occupation, currency, or schedule.

The app takes inspiration from task organizers such as TickTick but has its own identity and implementation. It does not promise feature parity or affiliation. All core records are local; no account, subscription, hosted backend, or bank connection is required.

## Current scope

| Area | Implemented in the source |
| --- | --- |
| Setup | Optional name, currency, first weekday, optional monthly plan and opening balances, backup restore |
| Today | Due and overdue tasks, habit check-ins, reminders, finance summary |
| Tasks | Custom lists, priorities, search, dates/times, durations, checklist steps, daily/weekly/monthly repeats, deletion undo |
| Calendar | Month/week views, agenda, rescheduling, Sunday/Monday week start |
| Habits | Numeric targets, selected weekdays, dated check-ins, streaks, heatmap, reminder time |
| Notes | Markdown, folders, pinning, search, autosave |
| Finance | Income, expenses, refunds, savings transfers, category limits, monthly plans, dated planning defaults, charts, CSV export |
| Desktop | Windows notifications, task snooze, background tray, optional sign-in startup, application icon |
| Settings | Custom lists/categories with reassignment, quiet hours, preferences, backup/restore and undo |

New installations begin without sample records or assumed financial amounts. Existing installations retain their records and previous plan values through migration. Source implementation does not imply that the new installer or native behavior has passed final testing.

## Financial rules

- Choose one workspace currency during setup. Store integer minor units using that currency's precision. Do not relabel existing money or silently convert currencies.
- Expected income is a forecast. Only a recorded income transaction means money was received.
- Net expenses are expenses minus refunds; monthly surplus is actual income minus net expenses.
- Savings transfers change spending/savings balances but are not expenses or income.
- Opening balances apply before transactions on the selected date. Earlier transactions remain visible in reports.
- Remaining planned allowance is expected income minus savings target, net expenses, and the manual unpaid-commitments reserve. Reduce that reserve when recording a payment to avoid double counting.
- Daily allowance divides non-negative remaining allowance by remaining calendar days. Overspending stays visible separately. Planned allowance is distinct from available cash.
- Date-effective defaults apply from the chosen month onward; explicit monthly plans take precedence. Earlier months are preserved.
- Category removal requires a destination, reassigns records, and combines category limits. It never deletes transaction history.

## Reminders and recovery

The main Electron process schedules notifications while the window is hidden in the tray. X hides the window; Quit exits. A sleeping, powered-off, or fully quit app cannot deliver alerts. Due tasks are reconciled after wake/startup. Habit reminders concern today's unfinished scheduled habits, not a backlog of past days.

Quiet hours defer automatic notification delivery using the computer's local time. Windows notification preferences can also suppress popups. Real notification delivery, taskbar identity, startup, and installer upgrades require native Windows validation.

Manual JSON backups and up to 14 daily local snapshots support recovery. Restore validates records before replacing the workspace and retains an undo snapshot. Data is not encrypted. Exporting to another drive protects against loss of the device or disk.

## Design principles

Keep the dark interface calm, legible, and usable by keyboard. Provide useful empty states, clear save/error feedback, understandable financial labels, and recovery from ordinary mistakes. Test at common Windows scaling levels. Use an original icon and familiar controls without copying another product's branding.

## Candidates for the local trial

These are future options, not delivered features or release promises. Prioritize them after real use:

- Delivered in 0.4: habit schedule history from the day of an edit and vacation pauses, with raw check-ins retained.
- Delivered in 0.4: weekday/custom/month-end/yearly recurrence, tags and tag/priority filters. Saved filters, templates and bulk series editing remain future options.
- Delivered in 0.4: recurring bills with payment confirmation and monthly category comparisons/CSV. Multiple accounts and printable reports remain future options.
- Delivered in 0.4: task-linked focus/break timer and optional cozy garden rewards. Richer note organization, attachments and revision history remain future options.
- Accessibility refinements, localization, and additional themes based on trial feedback.

Cloud sync, collaboration, mobile clients, calendar integrations, and bank connectivity are outside the current local Windows scope.

## Publication gate

Agent testing has been authorized; see TEST-REPORT-2026-09-25.md for completed checks and remaining native validation. Finish those checks and use the app locally for a while. Source publication is now authorized. Decide additional features and licensing through further local use. Author: [Sharveshwar S](https://github.com/SharveshwarS).
