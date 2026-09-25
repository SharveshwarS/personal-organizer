# Install Personal Organizer

**[Download the Windows setup file](https://github.com/SharveshwarS/personal-organizer/releases/download/v0.4.0-preview.1/Personal-Organizer-Setup-0.4.0-preview.1.exe)**

Version **0.4.0-preview.1** · Windows x64 · approximately **110 MiB** · free to download, install and use.

## Get started

1. Download `Personal-Organizer-Setup-0.4.0-preview.1.exe` using the link above.
2. Run the setup file and follow the installer steps.
3. Open Personal Organizer from the desktop shortcut or Start menu.
4. Choose your name, currency and preferences. Budget setup is optional, and your workspace starts empty.

You do not need Node.js, Git, a GitHub account or a subscription. The app works offline and stores your records on your own PC. See [Privacy](../PRIVACY.md).

The actual setup file is hosted in [GitHub Releases](https://github.com/SharveshwarS/personal-organizer/releases/tag/v0.4.0-preview.1), because its size exceeds GitHub's ordinary repository-file limit. The automatically generated **Source code** ZIP/TAR downloads are for developers; choose the **setup .exe** to install the app.

## Preview and Windows notes

- This build is unsigned. Windows may show an unknown-publisher or SmartScreen warning. Check that the file comes from this repository's release page; do not disable Windows security protection.
- Closing the window with **X** keeps reminders running in the tray. Choose **Quit Personal Organizer** from the tray menu to exit fully.
- Reminders require the app to be running and your PC awake. Windows notification settings and Do Not Disturb can silence banners.
- Native notification clicks, sleep/wake, login startup and actual Windows display scaling still need broader user testing. See [the tested behavior and remaining checks](../docs/RELEASE-0.4-preview.1.md).
- Records and backups are local and unencrypted. Keep your own exported backups.

## Verify the download

Download [SHA256SUMS.txt](https://github.com/SharveshwarS/personal-organizer/releases/download/v0.4.0-preview.1/SHA256SUMS.txt) from the same release. In PowerShell, from the folder containing your downloaded setup file, run:

```powershell
Get-FileHash .\Personal-Organizer-Setup-0.4.0-preview.1.exe -Algorithm SHA256
```

Compare the result with the checksum file. Letter case does not matter.

## Updating and feedback

Updates are manual. Export a backup in Settings, finish any edits, quit the app from its tray menu, then run the newer official installer. Existing records are retained. Uninstalling also retains the local profile; a reinstall is not a data reset.

[Report a bug](https://github.com/SharveshwarS/personal-organizer/issues/new?template=bug_report.yml) · [Suggest a feature](https://github.com/SharveshwarS/personal-organizer/issues/new?template=feature_request.yml) · [Development guide](../development/README.md)

Use synthetic examples when reporting problems; do not attach personal budgets, notes or backups to public issues.
