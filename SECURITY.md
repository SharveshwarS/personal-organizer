# Security

This is a local desktop application. Local data and backups are not encrypted. Do not use it as a password manager or assume it protects information from other software running under your Windows account.

Electron uses a sandboxed renderer, context isolation, a local content-security policy, blocked arbitrary navigation and narrowly validated IPC. The author-profile action opens a fixed HTTPS URL. Backups are schema-validated and restore requires confirmation.

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/SharveshwarS/personal-organizer/security/advisories/new). Include the affected version, reproduction steps and potential impact using synthetic data. Do not post private records, credentials or exploit details in public issues.

The current preview is 0.4.0-preview.1. Its automated checks and remaining native Windows limitations are recorded in [the release notes](docs/RELEASE-0.4-preview.1.md). Older previews do not receive separate maintenance. The GitHub workflow is manual and has no publishing permissions. The installer is unsigned until a signing process is configured.
