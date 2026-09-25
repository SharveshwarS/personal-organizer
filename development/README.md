# Development

Looking to try the app? Use the [Windows installer](../installer/README.md); no development setup is required.

The source lives at the repository root so cloning, npm commands and the Windows build workflow use the standard project layout. This folder is the starting guide for exploring it.

## Source map

| Path | Contents |
| --- | --- |
| [src](../src) | React interface and styles |
| [electron](../electron) | Desktop window, tray, reminder scheduler, preload and SQLite storage |
| [shared](../shared) | Shared domain logic, validation and feature behavior |
| [tests](../tests) | Domain, reminders, personalization and storage tests |
| [scripts](../scripts) | Packaging support, icons, notices and desktop checks |
| [docs](../docs) | Architecture, product decisions, release notes and validation |

## Run locally

Use Windows with Git and Node.js 24 or newer:

```powershell
git clone https://github.com/SharveshwarS/personal-organizer.git
cd personal-organizer
npm ci
npm run desktop
```

The development desktop profile is separate from the installed app's records. `npm run dev` starts a browser preview with separate browser storage; it does not provide native Windows reminders.

```powershell
npm run typecheck
npm test
npm run package:win
```

The installer is generated under `release/`, which is ignored by Git. Public setup files belong in GitHub Releases. The repository also has a manually triggered Windows validation workflow.

The source is available to inspect; the maintainer has not selected an open-source license. Read [Contributing](../CONTRIBUTING.md), [Security](../SECURITY.md) and [the licensing status](../README.md#license) before proposing contributions or reuse.
