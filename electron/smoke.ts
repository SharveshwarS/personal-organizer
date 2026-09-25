import type { BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import type { Store } from "./database.js";
import {
  initialState,
  localDate,
  addDays,
  type Task,
} from "../shared/domain.js";
export async function runSmoke(window: BrowserWindow, store: Store, background: {
  reconcile: () => void;
  notifications: { title: string; kind: string; hidden: boolean }[];
  showWindow: () => void;
}) {
  const directory = path.join(process.cwd(), "qa");
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  window.webContents.on("console-message", (_e, level, message) => {
    if (level >= 3) errors.push(message);
  });
  const date = localDate();
  const state = initialState(date);
  state.settings.setupComplete = true;
  state.settings.currency = "INR";
  state.taskLists = ["Study", "Personal", "Bills"];
  const task = (
    id: string,
    title: string,
    time: string,
    list: string,
    priority: Task["priority"],
  ): Task => ({
    id,
    title,
    time,
    list,
    priority,
    date,
    notes: "Desktop QA fixture",
    repeat: "none",
    anchorDay: Number(date.slice(8)),
    series: id,
    done: false,
    reminder: false,
    duration: 30,
    createdAt: new Date().toISOString(),
  });
  state.tasks = [
    task("qa-1", "Review this week’s study plan", "09:30", "Study", "high"),
    task("qa-2", "Take a little walk outside", "17:00", "Personal", "low"),
    task("qa-3", "Log today’s expenses", "20:30", "Bills", "medium"),
  ];
  state.habits = [
    {
      id: "qa-habit",
      title: "Read a few pages",
      target: 1,
      unit: "times",
      days: [0, 1, 2, 3, 4, 5, 6],
      createdDate: addDays(date, -7),
      logs: { [addDays(date, -1)]: 1 },
    },
  ];
  state.transactions = [
    {
      id: "qa-income",
      type: "income",
      amount: 600000,
      category: "Other",
      date,
      note: "Monthly allowance",
      method: "Bank transfer",
    },
    {
      id: "qa-expense",
      type: "expense",
      amount: 125000,
      category: "Food",
      date,
      note: "Food & groceries",
      method: "UPI",
    },
    {
      id: "qa-saving",
      type: "save",
      amount: 150000,
      category: "Other",
      date,
      note: "Savings contribution",
      method: "Bank transfer",
    },
  ];
  store.restore(state);
  await window.reload();
  await new Promise<void>((resolve) =>
    window.webContents.once("did-finish-load", () => resolve()),
  );
  const waitFor = async (expression: string) => {
    for (let i = 0; i < 100; i++) {
      if (await window.webContents.executeJavaScript(expression)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`UI timeout: ${expression}`);
  };
  await waitFor("document.body.innerText.includes('Review this week')");
  assert.equal(
    await window.webContents.executeJavaScript("window.organizer.desktop"),
    true,
  );
  assert.equal(
    await window.webContents.executeJavaScript("typeof require"),
    "undefined",
  );
  const snapshot = await window.webContents.executeJavaScript(
    "window.organizer.load()",
  );
  assert.equal(snapshot.state.tasks.length, 3);
  await writeFile(
    path.join(directory, "desktop-today.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await window.webContents.executeJavaScript(
    "[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes('Finance')).click()",
  );
  await waitFor("document.body.innerText.includes('Your money, at a glance.')");
  await window.webContents.executeJavaScript(
    "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
  );
  await new Promise((r) => setTimeout(r, 150));
  await writeFile(
    path.join(directory, "desktop-finance.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  assert.match(
    await window.webContents.executeJavaScript("document.body.innerText"),
    /4,750/,
  );
  // Exercise the real IPC path, then reload to verify disk-backed state.
  const marker = "Desktop persistence verified";
  await window.webContents.executeJavaScript(
    `(async()=>{const s=await window.organizer.load();s.state.settings.name=${JSON.stringify(marker)};await window.organizer.save(s.state,s.revision)})()`,
  );
  assert.equal(store.read().state.settings.name, marker);
  window.reload();
  await new Promise<void>((resolve) =>
    window.webContents.once("did-finish-load", () => resolve()),
  );
  await waitFor(
    "document.body.innerText.includes('Desktop persistence verified')",
  );
  // Exercise the real close handler and scheduler, capturing notification dispatches
  // instead of displaying QA toasts in the user's Windows notification center.
  const reminderState = store.read();
  reminderState.state.settings.closeToTray = false; // Old preference cannot disable background mode.
  reminderState.state.tasks[0].reminder = true;
  reminderState.state.tasks[0].time = "00:00";
  reminderState.state.habits[0].reminderTime = "00:00";
  store.save(reminderState.state, reminderState.revision);
  // Consume Windows' initial SW_HIDE startup hint used by the test launcher.
  window.showInactive();
  background.showWindow();
  assert.equal(window.isVisible(), true);
  window.close();
  assert.equal(window.isDestroyed(), false);
  assert.equal(window.isVisible(), false);
  const count = background.notifications.length;
  // Let the actual minute-aligned scheduler tick while the real window is hidden.
  await new Promise((resolve) => setTimeout(resolve, 60000 - Date.now() % 60000 + 1500));
  const delivered = background.notifications.slice(count);
  assert.deepEqual(delivered.map(n => n.kind).sort(), ["habit", "task"]);
  assert.ok(delivered.every(n => n.hidden));
  background.reconcile();
  assert.equal(background.notifications.length, count + 2);
  background.showWindow();
  assert.equal(window.isVisible(), true);
  // The fixture was saved directly to SQLite; refresh the renderer's revision.
  window.reload();
  await new Promise<void>((resolve) => window.webContents.once("did-finish-load", () => resolve()));
  await waitFor("document.body.innerText.includes('Desktop persistence verified')");
  window.webContents.send("navigate-task", "qa-habit", "habit");
  await waitFor("document.body.innerText.includes('Little habits. Big changes.')");
  await window.webContents.executeJavaScript("document.querySelector('[aria-label=\"Edit habit Read a few pages\"]').click()");
  await waitFor("document.querySelector('dialog[open]') && document.body.innerText.includes('Windows reminders')");
  await window.webContents.executeJavaScript(`(() => {
    const input = document.querySelector('input[type=time]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '08:30');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await window.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(b=>b.textContent==='Save habit').click()");
  await waitFor("!document.querySelector('dialog[open]')");
  assert.equal(store.read().state.habits[0].reminderTime, "08:30");
  assert.equal(store.read().state.habits[0].logs[addDays(date, -1)], 1);
  await window.webContents.executeJavaScript("document.querySelector('[aria-label=\"Edit habit Read a few pages\"]').click()");
  await waitFor("document.querySelector('input[type=time]')?.value === '08:30'");
  await writeFile(path.join(directory, "desktop-habit-reminder.png"), (await window.webContents.capturePage()).toPNG());
  assert.equal(errors.length, 0, errors.join("\n"));
  const { runUIQA } = await import("./ui-qa.js");
  await runUIQA(window, store, directory);
  assert.equal(errors.length, 0, errors.join("\n"));
  const report = {
    passed: true,
    packaged: !process.execPath.endsWith("electron.exe"),
    checks: [
      "Secure local protocol",
      "Sandboxed React renderer",
      "SQLite load through preload",
      "Finance surplus excludes savings transfers",
      "IPC save",
      "Persistence after window reload",
      "No renderer error messages",
      "X hides the window even with legacy closeToTray disabled",
      "Task and habit scheduler dispatch while hidden (captured transport)",
      "Repeated reconciliation does not duplicate reminders",
      "Tray reopen and habit notification navigation",
      "Habit reminder editing persists and retains check-in history",
    ],
    screenshots: ["desktop-today.png", "desktop-finance.png"],
  };
  await writeFile(
    path.join(directory, "desktop-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("DESKTOP_SMOKE_PASS", JSON.stringify(report));
}
