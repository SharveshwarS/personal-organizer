# Architecture and delivery plan

Updated 24 September 2026. Version 0.3.0-preview.1 has been built and installed for the maintainer's local trial. Previous builds and app data were removed at their request. Final functional testing remains pending and will be performed by the maintainer.

## Architecture

React, TypeScript, and Vite supply the interface. Electron owns Windows integration, SQLite persistence, the notification scheduler, tray lifecycle, login startup, and native file dialogs. SQLite is embedded; no hosted backend or separately installed database service is needed.

```text
React interface
    -> narrow preload API
    -> validated Electron IPC handlers
    -> shared domain rules -> SQLite
                           -> persisted notification delivery ledger
                           -> JSON backup and restore
```

The renderer uses context isolation, sandboxing, disabled Node integration, a restricted content security policy, and a local app protocol. IPC validates senders and data. External author links and data-folder opening use fixed destinations rather than arbitrary paths supplied by the renderer.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Navigation, loaded workspace, save queue, restore, shared editors |
| `src/Onboarding.tsx` | First-run preferences and optional finance setup |
| `src/WorkspaceContext.tsx` | Shared workspace and currency formatting/parsing |
| `src/Tasks.tsx`, `Calendar.tsx`, `Habits.tsx`, `Notes.tsx`, `Finance.tsx` | Organizer modules |
| `src/Settings.tsx`, `Personalization.tsx` | Preferences, lists/categories, dated defaults, quiet hours, recovery |
| `src/api.ts` | Typed desktop bridge and separate browser-preview persistence |
| `shared/domain.ts` | Records, validation/migration, integer money, recurrence, finance, reminders |
| `electron/main.ts` | Secure app lifecycle, notifications, tray, backup IPC, Windows integration |
| `electron/database.ts` | Transactional SQLite writes, revision checks, restore/undo, delivery ledger |
| `electron/preload.cjs` | Narrow renderer bridge |
| `tests/` | Domain, persistence, scheduling, migration and personalization cases |
| `scripts/` | Icon and third-party notice generation |

## Storage and upgrades

The installed application uses Electron's user-data directory outside the installation folder. Development uses a separate Personal Organizer Development profile. Browser previews use local browser storage; automated desktop smoke runs use a project QA profile.

Schema 2 adds setup preferences, a workspace currency, configurable lists/categories, dated plan defaults, quiet hours, and optional task checklists. Schema-1 records are normalized through shared validation. SQLite retains the exact pre-migration payload in metadata before committing migrated state. Legacy INR amounts and implicit planning defaults are preserved. Do not open a migrated database with an older app version.

Writes and restores are transactional. Restore keeps the previous workspace for undo and clears the reminder ledger. Ordinary saves prohibit changing currencies while financial records or nonzero planning amounts exist. A complete backup restore can replace the workspace with its own currency.

## Packaging and release preparation

Node.js 24 or newer is required for development. The lockfile defines dependency versions. Electron Builder produces a Windows x64 NSIS installer; the runtime is supplied from the installed Electron distribution. Installer configuration creates a desktop shortcut and retains application data on uninstall. Executables are currently unsigned.

Packaging generates dependency license notices and includes them with the app. A manually triggered GitHub workflow is prepared for future repository use; it has not run. A local preview installer exists; no repository or public release has been created. Application licensing remains undecided, with package metadata set to UNLICENSED.

## Validation sequence

1. Complete source work and static TypeScript checks.
2. Stop and wait for explicit permission to begin final testing.
3. Run the prepared automated cases and compile the application.
4. Exercise first-run setup and every module in isolated profiles, including invalid input, currency precision, category reassignment, migration, and restore/undo.
5. Package and validate the installed Windows experience: icon/shortcut, notifications, snooze, quiet hours, X-to-tray, Quit, startup, sleep/wake, dialogs, scaling, and persistence across restart/upgrade.
6. Deliver the locally tested build for a trial period. Decide subsequent features, license, repository details, and public release afterward.

Use [FINAL-TEST-CHECKLIST.md](FINAL-TEST-CHECKLIST.md) to record actual evidence. Browser checks do not establish that native Electron behavior works. Prepared test code is not a passed test, and historical verification is not evidence for this preview.
