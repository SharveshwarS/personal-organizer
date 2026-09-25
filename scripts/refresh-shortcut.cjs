const { app, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, 'qa', 'shortcut-profile'));
app.whenReady().then(async () => {
  const portableTarget = path.join(root, 'release/win-unpacked/Personal Organizer.exe');
  const installedTarget = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Personal Organizer', 'Personal Organizer.exe')
    : null;
  let target = portableTarget;
  if (installedTarget) {
    try { await fs.access(installedTarget); target = installedTarget; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await fs.access(target);
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  // A versioned icon path prevents Explorer from reusing the old cached artwork.
  // Installed shortcuts must not depend on a developer's release folder.
  let icon = target;
  if (target === portableTarget) {
    icon = path.join(root, `release/organizer-${version}.ico`);
    await fs.copyFile(path.join(root, 'public/icon.ico'), icon);
  }
  const shortcutPath = path.join(app.getPath('desktop'), 'Personal Organizer.lnk');
  let operation = 'create';
  try {
    await fs.access(shortcutPath);
    if (![target, portableTarget].some(known => known.toLowerCase() === shell.readShortcutLink(shortcutPath).target.toLowerCase()))
      throw new Error('Desktop shortcut points to another installation; leave it intact.');
    operation = 'update';
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!shell.writeShortcutLink(shortcutPath, operation, {
    target, cwd: path.dirname(target), icon, iconIndex: 0,
    description: 'Open Personal Organizer', appUserModelId: 'local.personal.organizer',
    toastActivatorClsid: '{9D761CE4-72A6-46C5-B745-8C8364E17D92}',
  })) throw new Error('Shortcut update failed.');
  const verified = shell.readShortcutLink(shortcutPath);
  if (verified.target !== target || verified.icon !== icon) throw new Error('Shortcut verification failed.');
  console.log('SHORTCUT_REFRESH_PASS', JSON.stringify({ shortcutPath, ...verified }));
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
