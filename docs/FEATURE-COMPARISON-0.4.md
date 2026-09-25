# Product comparison and the cozy garden update

Reviewed on 25 September 2026 using the products' own documentation. This is a focused comparison for an offline Windows organizer, not a claim of complete feature parity. Platform and plan availability vary.

| Reference | Useful strength | Our implementation in 0.4 preview 1 |
| --- | --- | --- |
| [TickTick features](https://www.ticktick.com/features) | Recurring reminders, tags, filters, habits and Pomodoro tools | Flexible recurrence, tags/priority filters, snooze inbox, habit history/pauses and a task-linked focus/break timer |
| [Todoist Karma](https://www.todoist.com/help/todoist/features/introduction-to-karma-OgWkWy) | Completion points, levels, goals and optional celebrations | Optional XP, growth levels, three daily suggestions and a badge shelf |
| [Habitica](https://www.habitica.com/) | Avatars, quests and rewards linked to habits and tasks | A small firefly companion and garden rewards, designed for personal offline use |
| [Forest](https://www.forestapp.cc/) | Focus sessions represented by growing plants | A cozy night garden that grows with task, habit and focus progress |

## What makes this organizer its own product

The garden combines everyday organization with personal budgeting in one private workspace. A completed task earns 10 XP, a reached habit target earns 15 XP once per day, and a completed focus session earns one XP per minute, capped at 60. Earlier records are not automatically converted into rewards. Reopening and completing the same task, or resetting the same day's habit, does not grant another reward.

Level 2 begins at 50 XP and unlocks a flower; level 3 begins at 200 XP and unlocks a little tree. Additional plants appear in the scene as the first levels are reached. Tap the firefly for a gentle message. Missed days never remove XP or kill plants. A break session earns no XP; ending a focus session early earns none. Garden rewards and celebration messages can be disabled independently, and animation respects reduced-motion preferences.

Finance actions do not earn points: the app should support an honest record of money, not reward spending or fabricated entries.

## Added practical features

- Reminder inbox: 5/10/30-minute snooze, completion/check-in actions, upcoming task reminders and due bills. Snooze keeps the original task date/time. Windows notifications open the relevant app screen; these are in-app actions, not new native toast buttons.
- Recurrence: daily, weekdays, weekly, monthly, last day of the month, yearly and every N days. Completing an occurrence creates the next one with reset checklist steps. Editing still affects that occurrence and the next one generated from it; bulk series editing is not included.
- Task organization: up to ten tags, tag/priority filters, tags included in search.
- Focus: task linking, configurable focus or break lengths, pause/resume, history and a Windows completion reminder. The main process schedules the deadline without polling the full database every second. Elapsed wall-clock time includes sleep or time the app is quit; completion is recorded on the next running check. This is not activity monitoring or an app blocker.
- Habits: target/unit/weekday history from the day of an edit, vacation pauses and resume without losing raw check-ins. Earlier versions did not record historical schedules, so changes made before this update cannot be reconstructed.
- Finance: prior-month category comparison and CSV export; recurring monthly bills with due-date alerts, explicit payment confirmation, archive/restore and one payment record per bill/month. Dates such as the 31st use the final day of shorter months. Current-month comparisons may be incomplete.

## Gaps intentionally kept on the roadmap

These are not implemented or promised as part of this preview:

- Kanban and saved custom views; reusable task templates; command palette and global quick capture.
- Drag-to-reschedule calendar blocks; multiple reminders per task; more extensive recurrence/series editing.
- Automatic multi-session Pomodoro cycles, ambient audio, richer garden customization and more companion interactions.
- Note attachments, revision history and richer organization; financial accounts and printable reports.
- Broader keyboard/screen-reader validation, localization and native Windows display-scaling coverage.

Cloud synchronization, collaboration, mobile widgets, location reminders and third-party calendar connections change the current local-only scope and need separate product decisions. Source publication is now authorized. License selection and any packaged GitHub release remain separate decisions.
