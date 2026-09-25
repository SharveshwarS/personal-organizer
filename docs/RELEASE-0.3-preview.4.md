# 0.3.0-preview.4 — short-window navigation and validation

Settings is now accessible in shorter windows. The sidebar uses compact vertical spacing, scrolls when necessary and wraps profile/version details without horizontal scrolling. Automated checks cover the normal and minimum window sizes and Settings reachability under renderer zoom.

The packaged app now includes expanded opt-in QA workflows under `--smoke-test`, using its isolated QA profile. Normal launches never execute these tests. Tests cover setup, lists, task reminders, habit intervals, notes, finance, calendar preferences and backup recovery.

See [25 September test results](TEST-REPORT-2026-09-25.md) for completed checks and native desktop limitations. No stored user data or schema is changed by this update. License selection and GitHub publication remain deferred.

Installation verified on 25 September 2026: Windows version registration, installed archive integrity and desktop shortcut all pass. The existing database hash is unchanged. The previous installer was removed; the latest installer and SHA-256 checksum remain in release/.
