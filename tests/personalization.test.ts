// Prepared for the final validation phase. Do not infer execution from this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, validateState, toMinorUnits, money, finance, renameGroup, removeGroup, inQuietHours, toggleTask, categories } from "../build/shared/domain.js";
import { Store } from "../build/electron/database.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const today = "2026-09-24";
function legacy() {
  return { schema: 1, tasks: [], habits: [], notes: [], transactions: [], plans: {},
    settings: { name: "Existing user", openingBalance: 12345, openingSavings: 0, balanceDate: today, closeToTray: true, startAtLogin: false } };
}
const task = (list = "Work") => ({ id: "t1", title: "Project", notes: "", date: today, time: "09:00", priority: "medium", list, repeat: "daily", anchorDay: 24, series: "t1", done: false, reminder: true, duration: 30, createdAt: today,
  checklist: [{ id: "step", title: "Draft", done: true }] });
test("New users get first-run setup and no assumed monthly income", () => {
  const s = initialState(today);
  assert.equal(s.schema, 2);
  assert.equal(s.settings.setupComplete, false);
  assert.equal(finance(s, "2026-09", today).plan.income, 0);
  assert.equal(finance(s, "2026-09", today).plan.savings, 0);
  assert.deepEqual(validateState(s), s);
});
test("Currency precision supports two, zero and three decimal places", () => {
  assert.equal(toMinorUnits("12.34", "USD"), 1234);
  assert.equal(toMinorUnits("12", "JPY"), 12);
  assert.equal(toMinorUnits("12.345", "KWD"), 12345);
  assert.throws(() => toMinorUnits("1.1", "JPY"));
  assert.throws(() => toMinorUnits("1.234", "USD"));
  assert.throws(() => toMinorUnits("1.2345", "KWD"));
  assert.match(money(12345, "KWD"), /12\.345/);
  assert.match(money(1234, "USD"), /12\.34/);
});
test("Legacy migration keeps INR data and old implicit plans without onboarding overwrite", () => {
  const old = legacy();
  const migrated = validateState(old);
  assert.equal(old.schema, 1);
  assert.equal(migrated.schema, 2);
  assert.equal(migrated.settings.currency, "INR");
  assert.equal(migrated.settings.setupComplete, true);
  assert.equal(migrated.settings.openingBalance, 12345);
  assert.equal(finance(migrated, "2026-09", today).plan.income, 600000);
  assert.deepEqual(migrated.expenseCategories, categories);
});
test("Changing future defaults preserves earlier months and explicit monthly plans", () => {
  const s = initialState(today);
  s.planDefaults = { "2026-09": { income: 100000, savings: 20000, committed: 0, budgets: {} }, "2026-11": { income: 200000, savings: 30000, committed: 0, budgets: {} } };
  s.plans["2026-12"] = { income: 350000, savings: 40000, committed: 0, budgets: {} };
  assert.equal(finance(s, "2026-08", today).plan.income, 0);
  assert.equal(finance(s, "2026-10", today).plan.income, 100000);
  assert.equal(finance(s, "2026-11", today).plan.income, 200000);
  assert.equal(finance(s, "2026-12", today).plan.income, 350000);
});
test("Category removal reassigns transactions and combines current and default budgets", () => {
  const s = initialState(today);
  s.transactions = [{ id: "expense", type: "expense", amount: 500, category: "Food", date: today, note: "", method: "Cash" }];
  const plan = { income: 10000, savings: 0, committed: 0, budgets: { Food: 1200, Other: 400 } };
  s.plans["2026-09"] = plan; s.planDefaults["2026-10"] = plan;
  const result = removeGroup(s, "expenseCategories", "Food", "Other");
  assert.equal(result.transactions[0].category, "Other");
  assert.equal(result.plans["2026-09"].budgets.Other, 1600);
  assert.equal(result.planDefaults["2026-10"].budgets.Other, 1600);
  assert.equal(result.expenseCategories.includes("Food"), false);
  assert.equal(s.transactions[0].category, "Food");
});
test("Task list rename and removal preserve tasks and prevent duplicate labels", () => {
  const s = initialState(today); s.tasks = [task()];
  const renamed = renameGroup(s, "taskLists", "Work", "Projects");
  assert.equal(renamed.tasks[0].list, "Projects");
  assert.equal(removeGroup(renamed, "taskLists", "Projects", "Inbox").tasks[0].list, "Inbox");
  assert.throws(() => renameGroup(s, "taskLists", "Work", "personal"));
  assert.throws(() => renameGroup(s, "taskLists", "Work", "__proto__"));
  assert.throws(() => removeGroup(s, "taskLists", "Work", "Work"));
  assert.throws(() => removeGroup(s, "taskLists", "Missing", "Inbox"));
  assert.throws(() => renameGroup(s, "taskLists", "Missing", "Projects"));
});
test("Quiet hours handle overnight and daytime windows with exact boundaries", () => {
  const settings = initialState(today).settings;
  settings.quietHours = { enabled: true, start: "22:00", end: "08:00" };
  assert.equal(inQuietHours(settings, new Date(`${today}T22:00:00`)), true);
  assert.equal(inQuietHours(settings, new Date(`${today}T07:59:00`)), true);
  assert.equal(inQuietHours(settings, new Date(`${today}T08:00:00`)), false);
  settings.quietHours = { enabled: true, start: "12:00", end: "14:00" };
  assert.equal(inQuietHours(settings, new Date(`${today}T13:00:00`)), true);
  assert.equal(inQuietHours(settings, new Date(`${today}T23:00:00`)), false);
  settings.quietHours.enabled = false;
  assert.equal(inQuietHours(settings, new Date(`${today}T13:00:00`)), false);
});
test("Repeating a task keeps completed history and resets the next checklist", () => {
  const s = initialState(today); s.tasks = [task()];
  const result = toggleTask(s, "t1");
  assert.equal(result.tasks[0].checklist[0].done, true);
  assert.equal(result.tasks[1].checklist[0].done, false);
  assert.equal(result.tasks[1].checklist[0].title, "Draft");
});
test("Validation rejects unsafe currency and quiet-hours data", () => {
  const s = initialState(today);
  for (const schema of ["2", 3, null]) assert.throws(() => validateState({ ...s, schema }));
  assert.throws(() => validateState({ ...s, settings: { ...s.settings, currency: "not-a-currency" } }));
  assert.throws(() => validateState({ ...s, settings: { ...s.settings, quietHours: { enabled: true, start: "08:00", end: "08:00" } } }));
  assert.throws(() => validateState({ ...s, taskLists: ["Work", "work"] }));
});
test("Currency changes cannot relabel existing financial data; explicit restore and undo can replace it", () => {
  const db = new Store(":memory:");
  try {
    const first = db.read(); first.state.settings.openingBalance = 100;
    const saved = db.save(first.state, first.revision);
    assert.throws(() => db.save({ ...saved.state, settings: { ...saved.state.settings, currency: "JPY" } }, saved.revision), /Currency/);
    assert.equal(db.read().state.settings.currency, "USD");
    const replacement = initialState(today); replacement.settings.currency = "JPY";
    db.restore(replacement); assert.equal(db.read().state.settings.currency, "JPY");
    db.undoRestore(); assert.equal(db.read().state.settings.currency, "USD");
  } finally { db.close(); }
});
test("An existing SQLite workspace migrates once and retains its exact recovery payload", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "organizer-migration-"));
  const file = path.join(directory, "test.db");
  let db = new Store(file);
  try {
    db.put("base", JSON.stringify(legacy())); const beforeRevision = db.read().revision;
    db.close(); db = new Store(file);
    assert.equal(db.read().state.schema, 2);
    assert.equal(db.read().revision, beforeRevision + 1);
    assert.equal(JSON.parse(db.meta("preMigrationV1")).schema, 1);
    const migrated = db.read(); db.close(); db = new Store(file);
    assert.deepEqual(db.read(), migrated);
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});
