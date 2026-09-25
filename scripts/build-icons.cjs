// Rasterize our vector master with Chromium and assemble a Windows multi-size ICO.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, 'qa', 'icon-profile'));
app.whenReady().then(async () => {
  const svg = await fs.readFile(path.join(root, 'public/icon.svg'), 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await win.loadURL('data:text/html,<html><body></body></html>');
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 1024];
  const data = await win.webContents.executeJavaScript(`(async () => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}';
    await img.decode();
    return ${JSON.stringify(sizes)}.map(size => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    });
  })()`);
  const images = data.map(v => Buffer.from(v, 'base64'));
  await fs.writeFile(path.join(root, 'public/icon.png'), images.pop());
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((bytes, i) => {
    const at = 6 + i * 16;
    header[at] = header[at + 1] = sizes[i] === 256 ? 0 : sizes[i];
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(bytes.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += bytes.length;
  });
  await fs.writeFile(path.join(root, 'public/icon.ico'), Buffer.concat([header, ...images]));
  console.log('ICON_BUILD_PASS: vector master, 1024px PNG and 9 ICO resolutions');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
