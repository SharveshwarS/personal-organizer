# Validation and local trial

The maintainer subsequently requested agent testing and resumed it on 25 September 2026. This supersedes the earlier instruction to defer functional testing. Tests use an isolated QA profile; the installed user's records are not reset.

See [the 0.4 release results](RELEASE-0.4-preview.1.md) and [the earlier dated test report](TEST-REPORT-2026-09-25.md) for evidence and limitations. A checked item describes only the scope stated here.

## Completed checks

- [x] All 55 domain and SQLite tests pass: money precision, plans, recurrence, habits, quiet hours, interval deduplication, migration and recovery.
- [x] First-run setup, optional finance, invalid JPY precision, Back navigation, KWD plans and persistence after reload.
- [x] Sidebar list creation and case-insensitive duplicate rejection.
- [x] Choosing/changing a task time enables the reminder and supplies today's date when absent; clearing time disables it; manual opt-out works.
- [x] Habit unit dropdown, interval entry, custom units and retained check-ins.
- [x] Markdown notes autosave and survive navigation; embedded script text does not execute.
- [x] Income, expenses, refunds and savings transfers match hand calculations; CSV retains currency and three-decimal precision.
- [x] Category rename reassigns transactions; Monday-first, week and agenda calendar views work.
- [x] Backup export/import, invalid rejection and Undo restore through real IPC/SQLite, with dialog choices simulated.
- [x] Packaged smoke: secure protocol, sandbox, save/reload, close-to-tray, hidden scheduler dispatch, deduplication and reminder navigation. Notification transport is captured for scheduler assertions.
- [x] Separate native notification check receives Windows' `show` acknowledgement. This is not visual confirmation of the popup or its click behavior.
- [x] Short-window Settings visibility at 1280×720 and 980×680; no sidebar horizontal overflow; Settings reachable at 125/150/200% renderer zoom.
- [x] Preview-4 build/package and installed archive verification; existing database unchanged; desktop shortcut valid.
- [x] QA/development storage is separate from installed user storage.

- [x] 0.4: garden XP deduplication and opt-out, focus pause/resume/completion, habit history/pauses, snooze preserving due dates, tags/custom recurrence and confirmed recurring bills.

## Checks still requiring a native desktop trial

- [ ] Visually confirm logo in Explorer, shortcut, taskbar, tray and a notification popup.
- [ ] Receive an actual scheduled popup with the window hidden, click it, use tray actions and explicitly Quit.
- [ ] Exercise native file-picker and restore-confirmation dialogs manually; automated recovery checks simulate their choices.
- [ ] Check Windows Do Not Disturb, actual sleep/wake and optional login startup.
- [ ] Complete keyboard/screen-reader review and real Windows display scaling at 100/125/150/200%. Renderer zoom is not a substitute for OS scaling.
- [ ] Check a fresh OS installation and uninstall/reinstall with retained data.
- [ ] Trial search, unusual long records, month/year transitions, error recovery and daily use beyond the automated scenarios.

## Release decisions — deferred

- [ ] Use locally and choose the next features from actual feedback.
- [ ] Choose a license, repository name and public release version; add exact license and repository URLs.
- [ ] Review source inventory for private data, credentials and generated artifacts before committing.
- [x] GitHub Actions dependencies pinned to exact commits.
- [ ] Run the manual GitHub workflow and review checksums/notices.
- [ ] Decide code signing and supported Windows versions based on actual checks.
- [ ] Publish only after maintainer approval, documenting limitations.



## 0.4 package update

- [x] Installed 0.4.0-preview.1 after packaged validation (software-rendered QA); archive/shortcut/version verified and user database unchanged. See RELEASE-0.4-preview.1.md for exact coverage and the graphics-capture limitation.
