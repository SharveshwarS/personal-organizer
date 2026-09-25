// Generate distribution notices from the installed, locked production packages.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const output = ['Personal Organizer — third-party notices', 'Generated from package-lock.json. The application license is a separate decision.', ''];
const seen = new Set();
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location || entry.dev || entry.optional && !fs.existsSync(path.join(root, location))) continue;
  const directory = path.resolve(root, location);
  if (!directory.startsWith(root + path.sep)) throw new Error('Dependency path outside project');
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const identity = `${metadata.name}@${metadata.version}`;
  if (seen.has(identity)) continue;
  seen.add(identity);
  output.push('='.repeat(72), identity, `License: ${typeof metadata.license === 'string' ? metadata.license : JSON.stringify(metadata.license || entry.license || 'See package files')}`);
  const licenseFiles = fs.readdirSync(directory).filter(name => /^(licen[cs]e|copying|notice)([.-].*)?$/i.test(name) && fs.statSync(path.join(directory, name)).isFile());
  if (!licenseFiles.length) throw new Error(`Missing license text for ${identity}; review before distribution.`);
  for (const name of licenseFiles) output.push(`--- ${name} ---`, fs.readFileSync(path.join(directory, name), 'utf8'));
  output.push('');
}
// Electron/Chromium ship their own notices next to the executable.
output.push('Electron and Chromium notices are distributed as LICENSE.electron.txt and LICENSES.chromium.html alongside the Windows executable.');
fs.writeFileSync(path.join(root, 'THIRD-PARTY-NOTICES.txt'), output.join('\n'));
console.log(`Prepared notices for ${seen.size} production packages.`);
