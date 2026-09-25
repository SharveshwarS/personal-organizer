# Privacy and local storage

Personal Organizer stores your tasks, habit logs, notes, financial entries, recurring bills, garden progress, focus sessions, snoozed reminders and preferences on your device. It does not require an account, collect analytics, connect to a bank or synchronize to a hosted service.

The desktop app stores an SQLite database and rotating daily JSON snapshots under its Windows user-data folder. Settings shows that folder and provides an Open data folder button. The database and exported backups are not encrypted. Anyone with access to your Windows files may be able to read them.

Manual backups and transaction exports go to locations you choose. Keep a separate copy if you need protection against device or disk loss. Uninstall is configured to retain app data. There is no automatic data-deletion or cloud-recovery service.

Windows handles notification delivery and may display task, habit and bill titles on the lock screen. Use Windows notification preferences and the app's quiet hours to control visibility. Startup with Windows is optional.

The author's GitHub profile opens in your default browser only when you click that action. The app itself does not upload your organizer data. Installing development dependencies and running GitHub workflows require network access separate from normal offline use.

Development, browser preview and automated QA have separate storage. Source preparation does not copy your real records into the repository or installer.
