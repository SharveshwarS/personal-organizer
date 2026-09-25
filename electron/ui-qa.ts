import type { BrowserWindow } from "electron";
import { dialog } from "electron";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { initialState, localDate, finance, addDays } from "../shared/domain.js";
import { journeyXP } from "../shared/features.js";
import type { Store } from "./database.js";

// Runs only from --smoke-test, against the isolated QA profile.
export async function runUIQA(
  window: BrowserWindow,
  store: Store,
  directory: string,
) {
  const checks: string[] = [];
  const run = (code: string) => window.webContents.executeJavaScript(code);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 80));
  async function wait(code: string) {
    for (let i = 0; i < 100; i++) {
      if (await run(code)) return;
      await tick();
    }
    throw new Error(`UI QA timeout: ${code}`);
  }
  async function reload() {
    const loaded = new Promise<void>((resolve) =>
      window.webContents.once("did-finish-load", () => resolve()),
    );
    window.reload();
    await loaded;
    await wait("!!document.querySelector('form, .app-shell')");
  }
  async function click(selector: string) {
    await run(
      `(() => {const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw new Error('Missing control: '+${JSON.stringify(selector)}); el.click()})()`,
    );
    await tick();
  }
  async function button(text: string, scope = "document") {
    await run(
      `(() => {const el=[...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!el) throw new Error('Missing button '+${JSON.stringify(text)}); el.click()})()`,
    );
    await tick();
  }
  async function fill(selector: string, value: string) {
    await run(
      `(() => {const el=document.querySelector(${JSON.stringify(selector)}); if(!el)throw new Error('Missing field '+${JSON.stringify(selector)}); const p=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`,
    );
    await tick();
  }
  async function field(label: string, value: string) {
    const selector = await run(
      `(() => {const el=[...document.querySelectorAll('label.field')].find(l=>l.querySelector('span')?.textContent===${JSON.stringify(label)})?.querySelector('input,select,textarea');if(!el)throw new Error('Missing label '+${JSON.stringify(label)});el.setAttribute('data-qa-field','current');return '[data-qa-field="current"]'})()`,
    );
    await fill(selector, value);
    await run(
      "document.querySelector('[data-qa-field]')?.removeAttribute('data-qa-field')",
    );
  }
  async function nav(name: string) {
    await run(
      `([...document.querySelectorAll('nav button')].find(b=>b.textContent.startsWith(${JSON.stringify(name)}))||[...document.querySelectorAll('.sidebar button')].find(b=>b.textContent.trim()===${JSON.stringify(name)})).click()`,
    );
    await tick();
  }
  async function capture(name: string) {
    await tick();
    await writeFile(
      path.join(directory, name),
      (await window.webContents.capturePage()).toPNG(),
    );
  }
  const today = localDate();
  store.restore(initialState(today));
  await reload();
  await capture("qa-onboarding.png");
  await field("What should we call you? (optional)", "QA Example");
  await field("Currency", "JPY");
  await field("Week starts on", "0");
  await button("Continue");
  await field("Expected monthly income (JPY)", "100.50");
  await button("Continue");
  assert.ok(await run("!!document.querySelector('.form-error')"));
  await field("Expected monthly income (JPY)", "10000");
  await field("Monthly savings target (JPY)", "2500");
  await button("Continue");
  await button("Back");
  await button("Back");
  await field("Currency", "KWD");
  await button("Continue");
  await field("Expected monthly income (KWD)", "100.125");
  await field("Monthly savings target (KWD)", "20.025");
  await button("Continue");
  await button("Open my organizer");
  await wait("!!document.querySelector('.app-shell')");
  assert.equal(store.read().state.settings.currency, "KWD");
  assert.equal(
    finance(store.read().state, today.slice(0, 7)).plan.income,
    100125,
  );
  checks.push(
    "Onboarding, invalid currency precision, Back navigation and three-decimal plan",
  );
  await reload();
  assert.equal(await run("!!document.querySelector('.onboarding')"), false);
  checks.push("Setup persists after renderer restart");

  await click('[aria-label="Add new list"]');
  await field("List name", "QA Projects");
  await button("Create list");
  await wait("!document.querySelector('dialog[open]')");
  assert.ok(store.read().state.taskLists.includes("QA Projects"));
  assert.match(
    await run("document.querySelector('.list-nav.selected').textContent"),
    /QA Projects/,
  );
  await click('[aria-label="Add new list"]');
  await field("List name", "qa projects");
  await button("Create list");
  assert.equal(store.read().state.taskLists.length, 4);
  assert.ok(await run("!!document.querySelector('dialog .form-error')"));
  await button("Cancel", "document.querySelector('dialog')");
  checks.push("Sidebar list creation, selection and duplicate rejection");

  await click(".quick-add");
  await field("Task title", "QA recurring task");
  await field("Time", "23:59");
  assert.equal(
    await run("document.querySelector('dialog input[type=checkbox]').checked"),
    true,
  );
  assert.equal(
    await run("document.querySelector('dialog input[type=date]').value"),
    today,
  );
  await field("Time", "");
  assert.equal(
    await run("document.querySelector('dialog input[type=checkbox]').checked"),
    false,
  );
  await field("Time", "23:59");
  await click("dialog input[type=checkbox]");
  await field("Repeat", "daily");
  await fill('[aria-label="New checklist item"]', "First step");
  await button("Add step");
  await button("Save task");
  await wait("!document.querySelector('dialog[open]')");
  let task = store.read().state.tasks[0];
  assert.equal(task.reminder, false);
  assert.equal(task.list, "QA Projects");
  await click(".task-body");
  assert.equal(
    await run(
      "[...document.querySelectorAll('dialog input[type=checkbox]')].at(-1).checked",
    ),
    false,
  );
  await button("Cancel", "document.querySelector('dialog')");
  await click('[aria-label="Complete QA recurring task"]');
  assert.equal(store.read().state.tasks.length, 2);
  assert.equal(store.read().state.tasks[1].checklist?.[0].done, false);
  checks.push(
    "Automatic reminders, clearing time, manual opt-out, active list and recurring checklist",
  );
  await nav("Tasks");
  await click('[aria-label="Delete QA recurring task"]');
  await button("Undo", "document.querySelector('.toast')");
  assert.equal(store.read().state.tasks.length, 2);
  checks.push("Task deletion and undo");

  await nav("Habits");
  await button("New habit");
  await field("Habit name", "QA hydration");
  await field("Daily target", "8");
  await field("Unit", "glasses");
  await field("Windows reminders", "interval");
  await field("Interval unit", "minutes");
  await field("Remind me every", "10");
  await field("First reminder", "08:00");
  await field("Remind until", "22:00");
  await capture("qa-habit-interval.png");
  await button("Create habit");
  await wait("!document.querySelector('dialog[open]')");
  assert.equal(store.read().state.habits[0].reminderInterval?.minutes, 10);
  await click('[aria-label="Log QA hydration"]');
  await click('[aria-label="Edit habit QA hydration"]');
  await field("Unit", "custom");
  await field("Custom unit", "cups");
  await button("Save habit");
  await wait("!document.querySelector('dialog[open]')");
  assert.equal(store.read().state.habits[0].logs[today], 1);
  assert.equal(store.read().state.habits[0].unit, "cups");
  checks.push(
    "Habit unit dropdown, interval entry, custom unit and retained check-ins",
  );

  await nav("Notes");
  await button("New note");
  await fill('[aria-label="Note title"]', "QA note");
  await fill(
    '[aria-label="Note content"]',
    "# QA heading\n\n**Saved safely**\n<script>alert('no')</script>",
  );
  await wait("document.querySelector('.save-status')?.textContent==='Saved'");
  assert.match(store.read().state.notes[0].body, /Saved safely/);
  await click('[aria-label="Preview note"]');
  assert.equal(
    await run("document.querySelector('.markdown-preview h1')?.textContent"),
    "QA heading",
  );
  assert.equal(
    await run("document.querySelectorAll('.markdown-preview script').length"),
    0,
  );
  await nav("Today");
  await nav("Notes");
  assert.equal(
    await run("document.querySelector('.note-title')?.value"),
    "QA note",
  );
  checks.push("Note autosave, Markdown rendering and navigation persistence");

  await nav("Finance");
  for (const [type, amount] of [
    ["income", "100.125"],
    ["expense", "10.005"],
    ["refund", "1.001"],
    ["save", "20.025"],
  ]) {
    await button("Add transaction");
    await field("Transaction type", type);
    await field("Amount (KWD)", amount);
    await button("Save transaction");
    await wait("!document.querySelector('dialog[open]')");
  }
  const totals = finance(store.read().state, today.slice(0, 7));
  assert.equal(totals.surplus, 91121);
  assert.equal(totals.spendable, 71096);
  assert.equal(totals.savingsBalance, 20025);
  await capture("qa-finance-kwd.png");
  const download = new Promise<string>((resolve, reject) =>
    window.webContents.session.once("will-download", (_e, item) => {
      const file = path.join(directory, "transactions-qa.csv");
      item.setSavePath(file);
      item.once("done", (_e, status) =>
        status === "completed" ? resolve(file) : reject(new Error(status)),
      );
    }),
  );
  await button("CSV");
  const csv = await readFile(await download, "utf8");
  assert.match(csv, /100.125/);
  assert.match(csv, /KWD/);
  checks.push(
    "Finance entry, refunds, savings, hand-calculated balances and currency-aware CSV",
  );

  await nav("Settings");
  await click('[aria-label="Rename category Food"]');
  await field("Name", "Groceries");
  await button("Save", "document.querySelector('dialog')");
  await wait("!document.querySelector('dialog[open]')");
  assert.ok(
    store.read().state.transactions.every((t) => t.category === "Groceries"),
  );
  await field("Week starts on", "1");
  await button("Save preferences");
  await nav("Calendar");
  assert.equal(
    await run("document.querySelector('.calendar-weekdays span').textContent"),
    "Mon",
  );
  await button("Week");
  assert.equal(
    await run("document.querySelectorAll('.calendar-cell').length"),
    7,
  );
  await button("Agenda");
  assert.equal(
    await run("document.querySelectorAll('.calendar-cell').length"),
    0,
  );
  checks.push(
    "Category reassignment, calendar weekday preference, week and agenda views",
  );

  const originalSave = dialog.showSaveDialog,
    originalOpen = dialog.showOpenDialog,
    originalMessage = dialog.showMessageBox;
  const backup = path.join(directory, "roundtrip-backup.json");
  try {
    dialog.showSaveDialog = (async () => ({
      canceled: false,
      filePath: backup,
    })) as typeof dialog.showSaveDialog;
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [backup],
    })) as typeof dialog.showOpenDialog;
    dialog.showMessageBox = (async () => ({
      response: 1,
      checkboxChecked: false,
    })) as typeof dialog.showMessageBox;
    const before = store.read().state;
    assert.equal(await run("window.organizer.exportBackup()"), true);
    const exported = JSON.parse(await readFile(backup, "utf8"));
    assert.deepEqual(exported.state, before);
    await run(
      "(async()=>{let s=await window.organizer.load();s.state.settings.name='QA changed';await window.organizer.save(s.state,s.revision)})()",
    );
    await run("window.organizer.importBackup()");
    assert.deepEqual(store.read().state, before);
    await run("window.organizer.undoRestore()");
    assert.equal(store.read().state.settings.name, "QA changed");
    await writeFile(
      backup,
      '{"format":"personal-organizer","version":2,"state":{}}',
    );
    const stateBeforeInvalid = store.read();
    await assert.rejects(() => run("window.organizer.importBackup()"));
    assert.deepEqual(store.read(), stateBeforeInvalid);
    checks.push(
      "Export/import and undo through Electron IPC; invalid import leaves state intact (dialog selections simulated)",
    );
  } finally {
    dialog.showSaveDialog = originalSave;
    dialog.showOpenDialog = originalOpen;
    dialog.showMessageBox = originalMessage;
  }

  store.restore(initialState(today));
  await reload();
  await button("Continue");
  await button("Set up finance later");
  await button("Open my organizer");
  await wait("!!document.querySelector('.app-shell')");
  assert.equal(finance(store.read().state, today.slice(0, 7)).plan.income, 0);
  assert.equal(store.read().state.transactions.length, 0);
  checks.push("Skip-finance setup creates no income or transactions");
  window.setSize(1280, 720);
  await tick();
  await capture("qa-layout-1280.png");
  assert.equal(
    await run("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  const settingsVisible = `(() => {const el=[...document.querySelectorAll('.sidebar button')].find(b=>b.textContent.trim()==='Settings');const r=el.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight})()`;
  assert.equal(
    await run(settingsVisible),
    true,
    "Settings stays visible at 1280x720",
  );
  window.setSize(980, 680);
  await tick();
  assert.equal(
    await run(settingsVisible),
    true,
    "Settings stays visible at minimum window size",
  );
  assert.equal(
    await run(
      "document.querySelector('.sidebar').scrollWidth <= document.querySelector('.sidebar').clientWidth",
    ),
    true,
    "Sidebar has no horizontal overflow at minimum size",
  );
  await capture("qa-layout-minimum.png");
  for (const zoom of [1.25, 1.5, 2]) {
    window.webContents.setZoomFactor(zoom);
    await tick();
    await run(
      "[...document.querySelectorAll('.sidebar button')].find(b=>b.textContent.trim()==='Settings').scrollIntoView({block:'center'})",
    );
    assert.equal(
      await run(settingsVisible),
      true,
      `Settings remains reachable at ${zoom} renderer zoom`,
    );
  }
  window.webContents.setZoomFactor(1);
  await tick();
  checks.push(
    "1280x720 and minimum 980x680 layouts keep Settings visible; renderer zoom 125/150/200% keeps Settings reachable",
  );
  window.setSize(1440, 940);
  await tick();
  await click(".quick-add");
  await field("Task title", "QA garden task");
  await field("Date", today);
  await field("Time", "00:00");
  await field("Repeat", "custom");
  await field("Repeat every (days)", "3");
  await field("Tags", "garden, deep-work");
  await field("Priority", "high");
  await button("Save task");
  await wait("!document.querySelector('dialog[open]')");
  await click('[aria-label^="Reminders"]');
  await button("10 min");
  assert.equal(store.read().state.tasks[0].time, "00:00");
  assert.ok(store.read().state.snoozes?.[0].until! > Date.now());
  assert.ok(await run("document.body.innerText.includes('Snoozed until')"));
  await button("Done");
  assert.equal(journeyXP(store.read().state), 10);
  assert.equal(store.read().state.tasks[1].date, addDays(today, 3));
  await nav("Tasks");
  await field("Filter by tag", "garden");
  await field("Filter by priority", "high");
  assert.equal(await run("document.querySelectorAll('.task-row').length"), 1);
  checks.push(
    "Reminder snooze preserves due time; completion earns XP and custom recurrence keeps tags; tag/priority filters work",
  );

  await nav("Habits");
  await button("New habit");
  await field("Habit name", "QA garden care");
  await button("Create habit");
  await wait("!document.querySelector('dialog[open]')");
  await click('[aria-label="Log QA garden care"]');
  assert.equal(journeyXP(store.read().state), 25);
  await click('[aria-label="Edit habit QA garden care"]');
  await field("Daily target", "2");
  await field("Pause habit through (optional)", addDays(today, 1));
  await button("Save habit");
  await wait("!document.querySelector('dialog[open]')");
  assert.ok(store.read().state.habits[0].history?.length);
  assert.ok(await run("document.body.innerText.includes('Paused ·')"));
  await click('[aria-label="Edit habit QA garden care"]');
  await field("Pause habit through (optional)", "");
  await button("Save habit");
  await wait("!document.querySelector('dialog[open]')");
  assert.ok(
    await run(
      "!!document.querySelector('[aria-label=\"Log QA garden care\"]')",
    ),
  );
  checks.push(
    "Habit target history, vacation pause/resume and garden XP use the real editor and store",
  );

  await nav("Focus");
  await field("Focus minutes", "1");
  await button("Start session");
  await button("Pause");
  assert.equal(store.read().state.focusSessions?.[0].status, "paused");
  await button("Resume");
  assert.equal(store.read().state.focusSessions?.[0].status, "running");
  // Shorten only the synthetic session's deadline; the real background timer must settle it.
  await run(
    "(async()=>{const s=await window.organizer.load();s.state.focusSessions[0].endsAt=Date.now()+1200;await window.organizer.save(s.state,s.revision)})()",
  );
  window.hide();
  await wait("document.body.innerText.includes('Start session')");
  assert.equal(store.read().state.focusSessions?.[0].status, "completed");
  assert.equal(journeyXP(store.read().state), 26);
  window.show();
  await capture("qa-focus.png");
  await nav("Journey");
  await click('[aria-label="Visit your firefly companion"]');
  assert.ok(
    await run(
      "document.body.innerText.includes('One small thing is enough to begin.')",
    ),
  );
  await capture("qa-garden.png");
  await reload();
  assert.equal(journeyXP(store.read().state), 26);
  checks.push(
    "Focus pause/resume, hidden-window completion, renderer refresh, XP persistence and interactive garden",
  );

  await nav("Finance");
  await button("Add bill");
  await field("Bill name", "QA internet");
  await field("Bill amount (USD)", "12.34");
  await field("Due day of month", "31");
  await button("Save bill");
  await wait("!document.querySelector('dialog[open]')");
  await button("Record payment");
  assert.equal(store.read().state.transactions.length, 0);
  await button("Confirm payment");
  await wait("!document.querySelector('dialog[open]')");
  assert.equal(store.read().state.transactions.length, 1);
  assert.equal(store.read().state.transactions[0].amount, 1234);
  assert.equal(
    await run(
      "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Paid').disabled",
    ),
    true,
  );
  assert.ok(await run("!!document.querySelector('.comparison-table')"));
  await run(
    "document.querySelector('.bill-row').scrollIntoView({block:'start'})",
  );
  await capture("qa-bills-comparison.png");
  checks.push(
    "Recurring bill confirmation records one expense; Paid disables duplicate UI payment; comparison table renders",
  );
  await writeFile(
    path.join(directory, "ui-flows.json"),
    JSON.stringify({ passed: true, checks }, null, 2),
  );
  console.log("UI_QA_PASS", JSON.stringify(checks));
}
