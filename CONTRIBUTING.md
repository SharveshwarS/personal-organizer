# Contributing

This is a public preview maintained by Sharveshwar S. An open-source license has not been selected. Discuss contributions with the maintainer before submitting code; do not assume an open-source reuse license.

Use Node.js 24+ and `npm ci`. Start the browser preview with `npm run dev` or use `npm run desktop` for a separate development profile. Run `npm run typecheck` during implementation. Use `npm test`, `npm run build`, and the Windows checks in `docs/FINAL-TEST-CHECKLIST.md`.

Keep business calculations and validation in `shared/domain.ts`, SQLite ownership in `electron/database.ts`, and privileged Windows actions behind narrow IPC handlers in `electron/main.ts`. The renderer must not receive arbitrary filesystem, SQL, process, or URL execution access.

Money is stored in integer minor units. Do not use floating-point transaction arithmetic or change the currency label on existing amounts. Treat schema migrations and backup compatibility as data-preservation features; include regression cases whenever changing them.

Use generated fixtures in isolated profiles. Never commit live databases, backups, logs, private screenshots, signing keys or `.env` files. `qa/`, build outputs and dependencies are ignored. Do not claim native Windows behavior from browser-only tests.

Keep changes focused. Describe the user-visible problem, expected behavior and checks actually performed. Screenshots must be from synthetic data. The project does not claim full TickTick compatibility or affiliation.
