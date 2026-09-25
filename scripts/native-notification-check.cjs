// Isolated native transport check; no organizer database is opened.
const { app, Notification } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const root = path.resolve(__dirname, '..');
app.setName('Personal Organizer QA');
app.setPath('userData', path.join(root, 'qa', 'native-notification-profile'));
// Use the registered identity of the installed organizer for Windows delivery.
app.setAppUserModelId('local.personal.organizer');
app.setToastActivatorCLSID('{9D761CE4-72A6-46C5-B745-8C8364E17D92}');
app.whenReady().then(async () => {
  let notice;
  const result = await new Promise(resolve => {
    if (!Notification.isSupported()) return resolve({ passed: false, reason: 'Unsupported' });
    notice = new Notification({ title: 'Personal Organizer — notification check', body: 'This is a one-time test of Windows reminder delivery.', icon: path.join(root, 'public', 'icon.png') });
    const timer = setTimeout(() => resolve({ passed: false, reason: 'No Windows acknowledgement within 10 seconds' }), 10000);
    notice.once('show', () => { clearTimeout(timer); resolve({ passed: true, event: 'show', detail: 'Windows acknowledged the native notification; visual popup and click behavior are separate checks.' }); });
    notice.once('failed', (_event, error) => { clearTimeout(timer); resolve({ passed: false, reason: error }); });
    notice.show();
  });
  await fs.mkdir(path.join(root, 'qa'), { recursive: true });
  await fs.writeFile(path.join(root, 'qa', 'native-notification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  setTimeout(() => { notice?.close(); app.exit(result.passed ? 0 : 1); }, 2500);
}).catch(error => { console.error(error); app.exit(1); });
