import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  protocol,
  net,
  ipcMain,
  dialog,
  Notification,
  powerMonitor,
  session,
  shell,
} from "electron";
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  unlink,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Store } from "./database.js";
import {
  scheduledReminders,
  rewardChanges,
  settleFocus,
  billReminders,
} from "../shared/features.js";
import {
  inQuietHours,
  localDate,
  validateState,
  type State,
} from "../shared/domain.js";

const smoke = process.argv.includes("--smoke-test");
const root = app.getAppPath();
if (smoke)
  app.setPath("userData", path.join(process.cwd(), "qa", "desktop-profile"));
else if (!app.isPackaged)
  app.setPath(
    "userData",
    path.join(app.getPath("appData"), "Personal Organizer Development"),
  );
app.setName("Personal Organizer");
const appIdentity =
  app.isPackaged && !smoke
    ? "local.personal.organizer"
    : "local.personal.organizer.development";
app.setAppUserModelId(appIdentity);
if (process.platform === "win32")
  app.setToastActivatorCLSID("{9D761CE4-72A6-46C5-B745-8C8364E17D92}");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "organizer",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
let window: BrowserWindow,
  tray: Tray,
  store: Store,
  quitting = false;
const notifications = new Set<Notification>();
const smokeNotifications: { title: string; kind: string; hidden: boolean }[] =
  [];
function showWindow() {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
function notify(title: string, body: string, id?: string, kind = "task") {
  if (smoke) {
    smokeNotifications.push({ title, kind, hidden: !window.isVisible() });
    return;
  }
  if (!Notification.isSupported())
    throw new Error("Windows notifications are unavailable.");
  const notice = new Notification({
    title,
    body,
    icon: path.join(root, "public", "icon.png"),
  });
  notifications.add(notice);
  notice.on("click", () => {
    showWindow();
    if (id) window.webContents.send("navigate-task", id, kind);
  });
  notice.on("close", () => notifications.delete(notice));
  notice.on("failed", (_event, error) => {
    console.error("Notification failed:", error);
    notifications.delete(notice);
  });
  notice.show();
  return notice;
}
async function testNotification() {
  const notice = notify(
    "Your organizer is ready",
    "Task and habit reminders appear here, including while the app is in the tray.",
  );
  if (!notice) return true;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Windows did not confirm the notification. Check Windows notification settings.",
          ),
        ),
      10000,
    );
    notice.once("show", () => {
      clearTimeout(timer);
      resolve();
    });
    notice.once("failed", (_event, error) => {
      clearTimeout(timer);
      reject(new Error(error));
    });
  });
  return true;
}
function reconcile() {
  try {
    const state = store.read().state;
    const now = new Date();
    if (inQuietHours(state.settings, now)) return;
    const due = [
      ...scheduledReminders(state, now),
      ...billReminders(state, now),
    ].filter((item) => !store.attempted(item.key));
    if (!due.length) return;
    if (!smoke && !Notification.isSupported()) return;
    // Persist before handing to Windows. The in-app reminders list remains the source of truth.
    for (const item of due) store.mark(item.key, "attempted");
    if (due.length > 3)
      notify(
        `${due.length} reminders waiting`,
        "Open Personal Organizer to review your tasks and habits.",
        due[0].id,
        "reminders",
      );
    else
      for (const item of due) notify(item.title, item.body, item.id, item.kind);
  } catch (error) {
    console.error("Reminder check:", error);
  }
}
function checkFocus() {
  try {
    const previous = store.read(),
      next = settleFocus(previous.state);
    if (next === previous.state) return;
    const result = store.save(next, previous.revision);
    window.webContents.send("workspace:changed", result);
    if (!inQuietHours(next.settings))
      notify(
        "Session complete",
        "Take a breath. Your completed session is saved in Focus.",
        "focus",
        "focus",
      );
  } catch (error) {
    console.error("Focus check:", error);
  }
}
let focusTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleFocus(state = store.read().state) {
  clearTimeout(focusTimer);
  const active = state.focusSessions?.find((f) => f.status === "running");
  if (!active) return;
  focusTimer = setTimeout(
    () => {
      checkFocus();
      scheduleFocus();
    },
    Math.min(2147483647, Math.max(20, active.endsAt - Date.now())),
  );
}
function safeEvent(event: Electron.IpcMainInvokeEvent) {
  if (
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    !event.senderFrame.url.startsWith("organizer://app/")
  )
    throw new Error("Untrusted request.");
}
function backupPayload(state: State) {
  return JSON.stringify(
    {
      format: "personal-organizer",
      version: 2,
      exportedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}
async function automaticBackup() {
  const directory = path.join(app.getPath("userData"), "backups");
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, `organizer-${localDate()}.json`);
  try {
    await stat(target);
    return;
  } catch {
    /* create today's first snapshot */
  }
  await writeFile(target, backupPayload(store.read().state), "utf8");
  const files = (await readdir(directory))
    .filter((f) => /^organizer-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  for (const file of files.slice(0, -14))
    await unlink(path.join(directory, file));
}
function registerIPC() {
  ipcMain.handle("workspace:load", (e) => {
    safeEvent(e);
    return store.read();
  });
  ipcMain.handle("workspace:save", (e, input, revision) => {
    safeEvent(e);
    if (
      JSON.stringify(input).length > 20000000 ||
      !Number.isSafeInteger(revision)
    )
      throw new Error("Invalid save request.");
    const state = validateState(input),
      previous = store.read();
    if (previous.revision !== revision)
      throw new Error("Data changed in another window. Reload before saving.");
    if (state.settings.startAtLogin !== previous.state.settings.startAtLogin) {
      if (!app.isPackaged)
        throw new Error(
          "Startup with Windows is available in the installed app.",
        );
      app.setLoginItemSettings({ openAtLogin: state.settings.startAtLogin });
    }
    const result = store.save(rewardChanges(previous.state, state), revision);
    scheduleFocus(result.state);
    reconcile();
    return result;
  });
  ipcMain.handle("workspace:export", async (e) => {
    safeEvent(e);
    const choice = await dialog.showSaveDialog(window, {
      title: "Back up your organizer",
      defaultPath: `Organizer-backup-${localDate()}.json`,
      filters: [{ name: "Organizer backup", extensions: ["json"] }],
    });
    if (choice.canceled || !choice.filePath) return false;
    await writeFile(choice.filePath, backupPayload(store.read().state), "utf8");
    return true;
  });
  ipcMain.handle("workspace:import", async (e) => {
    safeEvent(e);
    const choice = await dialog.showOpenDialog(window, {
      title: "Restore an organizer backup",
      properties: ["openFile"],
      filters: [{ name: "Organizer backup", extensions: ["json"] }],
    });
    if (choice.canceled) return null;
    if ((await stat(choice.filePaths[0])).size > 20000000)
      throw new Error("Backup exceeds the 20 MB limit.");
    const parsed = JSON.parse(await readFile(choice.filePaths[0], "utf8"));
    if (
      parsed.format !== "personal-organizer" ||
      ![1, 2].includes(parsed.version)
    )
      throw new Error("Not a supported organizer backup.");
    const state = validateState(parsed.state);
    const confirm = await dialog.showMessageBox(window, {
      type: "question",
      buttons: ["Cancel", "Restore backup"],
      defaultId: 0,
      cancelId: 0,
      message: "Replace your organizer with this backup?",
      detail: `${state.tasks.length} tasks, ${state.habits.length} habits, ${state.notes.length} notes and ${state.transactions.length} transactions. Your current data is saved for Undo restore.`,
    });
    if (confirm.response !== 1) return null;
    // Imported backups never change the operating-system login setting.
    state.settings.startAtLogin = store.read().state.settings.startAtLogin;
    const restored = store.restore(state);
    scheduleFocus(restored.state);
    return restored;
  });
  ipcMain.handle("workspace:undo", (e) => {
    safeEvent(e);
    const previous = store.meta("restoreUndo");
    if (!previous) throw new Error("No restore to undo.");
    const state = validateState(JSON.parse(previous));
    state.settings.startAtLogin = store.read().state.settings.startAtLogin;
    const restored = store.restore(state);
    scheduleFocus(restored.state);
    return restored;
  });
  ipcMain.handle("notification:test", (e) => {
    safeEvent(e);
    return testNotification();
  });
  ipcMain.handle("app:info", async (e) => {
    safeEvent(e);
    const backupFiles = (
      await readdir(path.join(app.getPath("userData"), "backups")).catch(
        () => [],
      )
    )
      .filter((f) => /^organizer-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort();
    return {
      dataPath: app.getPath("userData"),
      version: app.getVersion(),
      packaged: app.isPackaged,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      latestBackup: backupFiles.at(-1)?.slice(10, 20) || "",
      backupCount: backupFiles.length,
      canUndoRestore: !!store.meta("restoreUndo"),
    };
  });
  ipcMain.handle("app:author", (e) => {
    safeEvent(e);
    return shell.openExternal("https://github.com/SharveshwarS");
  });
  ipcMain.handle("app:data-folder", async (e) => {
    safeEvent(e);
    const error = await shell.openPath(app.getPath("userData"));
    if (error) throw new Error(error);
  });
}

if (!smoke && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window) showWindow();
  });
  app.on("before-quit", () => {
    quitting = true;
  });
  app
    .whenReady()
    .then(async () => {
      await mkdir(app.getPath("userData"), { recursive: true });
      store = new Store(path.join(app.getPath("userData"), "organizer.db"));
      await automaticBackup();
      if (process.platform === "win32" && app.isPackaged && !smoke) {
        // Portable launches need the same Windows notification identity as installs.
        const programs = path.join(
          app.getPath("appData"),
          "Microsoft",
          "Windows",
          "Start Menu",
          "Programs",
        );
        await mkdir(programs, { recursive: true });
        if (
          !shell.writeShortcutLink(
            path.join(programs, "Personal Organizer.lnk"),
            "create",
            {
              target: process.execPath,
              cwd: path.dirname(process.execPath),
              description: "Personal Organizer",
              icon: process.execPath,
              iconIndex: 0,
              appUserModelId: "local.personal.organizer",
              toastActivatorClsid: app.toastActivatorCLSID,
            },
          )
        )
          console.error(
            "Could not register the Start Menu shortcut for notifications.",
          );
      }
      protocol.handle("organizer", async (request) => {
        const url = new URL(request.url);
        let filename: string;
        try {
          filename = decodeURIComponent(url.pathname);
        } catch {
          return new Response("Invalid URL", { status: 400 });
        }
        const dist = path.join(root, "dist");
        const target = path.resolve(
          dist,
          `.${filename === "/" ? "/index.html" : filename}`,
        );
        if (url.host !== "app" || !target.startsWith(`${dist}${path.sep}`))
          return new Response("Not found", { status: 404 });
        const types: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".ico": "image/x-icon",
        };
        try {
          return new Response(new Uint8Array(await readFile(target)), {
            headers: {
              "Content-Type":
                types[path.extname(target)] || "application/octet-stream",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (_web, _permission, callback) => callback(false),
      );
      session.defaultSession.webRequest.onHeadersReceived((details, callback) =>
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'",
            ],
          },
        }),
      );
      session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
        callback({
          cancel:
            !details.url.startsWith("organizer://app/") &&
            !details.url.startsWith("devtools://"),
        }),
      );
      // Windows caches icons by their source path. Give the taskbar a real,
      // content-addressed ICO outside app.asar so an upgrade cannot reuse stale art.
      const iconBytes = await readFile(path.join(root, "public", "icon.ico"));
      const iconDirectory = path.join(app.getPath("userData"), "icons");
      await mkdir(iconDirectory, { recursive: true });
      const taskbarIcon = path.join(
        iconDirectory,
        `organizer-${createHash("sha256").update(iconBytes).digest("hex").slice(0, 16)}.ico`,
      );
      await writeFile(taskbarIcon, iconBytes);
      window = new BrowserWindow({
        width: 1440,
        height: 940,
        minWidth: 980,
        minHeight: 680,
        backgroundColor: "#101218",
        title: "Personal Organizer",
        show: !smoke,
        icon: taskbarIcon,
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(root, "electron", "preload.cjs"),
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
        },
      });
      if (process.platform === "win32") {
        window.setAppDetails({
          appId: appIdentity,
          appIconPath: taskbarIcon,
          appIconIndex: 0,
          relaunchCommand: app.isPackaged
            ? `"${process.execPath}"`
            : `"${process.execPath}" "${root}"`,
          relaunchDisplayName: "Personal Organizer",
        });
        window.setIcon(taskbarIcon);
      }
      Menu.setApplicationMenu(null);
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (event) => event.preventDefault());
      window.on("close", (event) => {
        if (!quitting && tray) {
          event.preventDefault();
          window.hide();
        }
      });
      registerIPC();
      await window.loadURL("organizer://app/");
      tray = new Tray(
        nativeImage.createFromPath(path.join(root, "public", "icon.ico")),
      );
      tray.setToolTip("Personal Organizer · Reminders running");
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: "Open Personal Organizer", click: showWindow },
          { label: "Task & habit reminders are active", enabled: false },
          { type: "separator" },
          { label: "Quit Personal Organizer", click: () => app.quit() },
        ]),
      );
      tray.on("click", showWindow);
      tray.on("double-click", showWindow);
      powerMonitor.on("resume", reconcile);
      powerMonitor.on("resume", () => {
        checkFocus();
        scheduleFocus();
      });
      scheduleFocus();
      // Align checks with the user's selected minute rather than app launch time.
      const scheduleReminderTick = () =>
        setTimeout(
          () => {
            reconcile();
            scheduleReminderTick();
          },
          60000 - (Date.now() % 60000) + 50,
        );
      scheduleReminderTick();
      if (smoke) {
        const { runSmoke } = await import("./smoke.js");
        try {
          await runSmoke(window, store, {
            reconcile,
            notifications: smokeNotifications,
            showWindow,
          });
          app.exit(0);
        } catch (error) {
          console.error(error);
          app.exit(1);
        }
        return;
      }
      reconcile();
      if (process.argv.includes("--test-notification")) {
        const report = await testNotification().then(
          () => ({ passed: true, event: "show", version: app.getVersion() }),
          (error) => ({
            passed: false,
            error: String(error),
            version: app.getVersion(),
          }),
        );
        await writeFile(
          path.join(app.getPath("userData"), "notification-check.json"),
          JSON.stringify(report, null, 2),
        );
        console.log("WINDOWS_NOTIFICATION_CHECK", JSON.stringify(report));
      }
      setInterval(() => automaticBackup().catch(console.error), 60 * 60 * 1000);
    })
    .catch((error) => {
      console.error(error);
      if (!smoke)
        dialog.showErrorBox(
          "Personal Organizer could not start",
          String(error),
        );
      app.exit(1);
    });
  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", () => store?.close());
}
