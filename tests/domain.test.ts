import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  finance,
  toPaise,
  validateState,
  nextDate,
  toggleTask,
  habitStreak,
  habitScheduled,
  dueTasks,
  reminderKey,
  dueHabits,
  habitReminderKey,
  addDays,
  monthShift,
} from "../build/shared/domain.js";
const date = "2026-09-19";
const transaction = (type: string, amount: number, extra = {}) => ({
  id: crypto.randomUUID(),
  type,
  amount,
  category: "Food",
  date,
  note: "",
  method: "UPI",
  ...extra,
});
const task = (extra = {}) => ({
  id: "task-1",
  title: "Read",
  notes: "",
  date: "2026-01-31",
  time: "09:00",
  priority: "medium",
  list: "Work",
  repeat: "monthly",
  anchorDay: 31,
  series: "task-1",
  done: false,
  reminder: true,
  duration: 30,
  createdAt: "2026-01-01T00:00:00Z",
  ...extra,
});
test("New workspace has no fabricated records or received income", () => {
  const s = initialState(date);
  assert.equal(
    s.tasks.length + s.habits.length + s.notes.length + s.transactions.length,
    0,
  );
  const f = finance(s, "2026-09", date);
  assert.equal(f.income, 0);
  assert.equal(f.plan.income, 0);
  assert.equal(f.rate, null);
});
test("Money parsing uses integer paise and rejects excess precision", () => {
  assert.equal(toPaise("100.01"), 10001);
  assert.equal(toPaise("0.10"), 10);
  for (const value of ["1.001", "-1", "NaN", "1e6", "₹20"])
    assert.throws(() => toPaise(value));
});
test("Savings transfers affect balances but never income or expenses", () => {
  const s = initialState(date);
  s.transactions = [
    transaction("income", 600000),
    transaction("expense", 420000),
    transaction("save", 150000),
    transaction("withdraw", 20000),
  ];
  const f = finance(s, "2026-09", date);
  assert.equal(f.surplus, 180000);
  assert.equal(f.rate, 30);
  assert.equal(f.contributions, 130000);
  assert.equal(f.spendable, 50000);
  assert.equal(f.savingsBalance, 130000);
});
test("Refunds reduce category expenses on their recorded date", () => {
  const s = initialState(date);
  s.transactions = [
    transaction("expense", 50000),
    transaction("refund", 12000),
  ];
  const f = finance(s, "2026-09", date);
  assert.equal(f.expenses, 38000);
  assert.equal(f.byCategory[0].amount, 38000);
});
test("Opening balances and prior-month income are not new monthly income", () => {
  const s = initialState(date);
  s.settings.balanceDate = "2026-08-01";
  s.settings.openingBalance = 10000;
  s.transactions = [
    transaction("income", 20000, { date: "2026-08-15" }),
    transaction("expense", 5000),
  ];
  const f = finance(s, "2026-09", date);
  assert.equal(f.income, 0);
  assert.equal(f.spendable, 25000);
});
test("Transactions before opening balance date do not double-count cash", () => {
  const s = initialState(date);
  s.transactions = [transaction("income", 600000, { date: "2026-08-10" })];
  assert.equal(finance(s, "2026-09", date).spendable, 0);
});
test("Historical months before the opening date do not claim a known cash balance", () => {
  const s = initialState(date);
  s.settings.openingBalance = 75000;
  assert.equal(finance(s, "2026-08", date).balanceAvailable, false);
  assert.equal(finance(s, "2026-09", date).balanceAvailable, true);
});
test("Daily allowance subtracts savings and unpaid commitments", () => {
  const s = initialState(date);
  s.plans["2026-09"] = {
    income: 600000,
    savings: 150000,
    committed: 50000,
    budgets: {},
  };
  s.transactions = [transaction("expense", 200000)];
  const f = finance(s, "2026-09", "2026-09-21");
  assert.equal(f.days, 10);
  assert.equal(f.daily, 20000);
});
test("Overspending remains visible while daily allowance clamps to zero", () => {
  const s = initialState(date);
  s.transactions = [transaction("expense", 700000)];
  const f = finance(s, "2026-09", date);
  assert.equal(f.allowance, -700000);
  assert.equal(f.daily, 0);
  assert.equal(f.surplus, -700000);
});
test("Leap months and closed months use calendar day counts", () => {
  const s = initialState(date);
  assert.equal(finance(s, "2028-02", "2028-02-28").days, 2);
  assert.equal(finance(s, "2026-08", date).days, 0);
  assert.equal(finance(s, "2026-10", date).days, 31);
});
test("Monthly recurrence recovers the 31st after February", () => {
  const t = task();
  assert.equal(nextDate(t), "2026-02-28");
  assert.equal(nextDate({ ...t, date: "2026-02-28" }), "2026-03-31");
  assert.equal(nextDate({ ...t, date: "2028-01-31" }), "2028-02-29");
});
test("Completing, reopening and recompleting does not duplicate next occurrence", () => {
  let s = initialState(date);
  s.tasks = [task()];
  s = toggleTask(s, "task-1");
  assert.equal(s.tasks.length, 2);
  s = toggleTask(toggleTask(s, "task-1"), "task-1");
  assert.equal(s.tasks.length, 2);
  assert.equal(s.tasks[1].date, "2026-02-28");
});
test("Daily and weekly recurrence cross month and year boundaries", () => {
  assert.equal(
    nextDate(task({ date: "2026-12-31", repeat: "daily" })),
    "2027-01-01",
  );
  assert.equal(
    nextDate(task({ date: "2026-12-31", repeat: "weekly" })),
    "2027-01-07",
  );
});
test("Habit streak skips unscheduled weekends and permits incomplete today", () => {
  const h = {
    id: "h",
    title: "Study",
    target: 1,
    unit: "times",
    days: [1, 2, 3, 4, 5],
    createdDate: "2026-09-14",
    logs: { "2026-09-17": 1, "2026-09-18": 1 },
  };
  assert.equal(habitStreak(h, "2026-09-21"), 2);
  assert.equal(habitScheduled(h, "2026-09-19"), false);
});
test("Missed scheduled day breaks streak and numeric target requires completion", () => {
  const h = {
    id: "h",
    title: "Study",
    target: 20,
    unit: "minutes",
    days: [0, 1, 2, 3, 4, 5, 6],
    createdDate: "2026-09-14",
    logs: { "2026-09-16": 20, "2026-09-17": 10, "2026-09-18": 20 },
  };
  assert.equal(habitStreak(h, "2026-09-19"), 1);
});
test("Reminder eligibility excludes completed and unscheduled tasks", () => {
  const now = new Date("2026-01-31T10:00:00");
  assert.equal(
    dueTasks(
      [
        task(),
        task({ id: "2", done: true }),
        task({ id: "3", reminder: false }),
        task({ id: "4", time: "11:00" }),
      ],
      now,
    ).length,
    1,
  );
  assert.notEqual(reminderKey(task()), reminderKey(task({ time: "09:10" })));
});
test("Backup validation rejects invalid dates, duplicate IDs, and fractional paise", () => {
  const s = initialState(date);
  s.tasks = [task()];
  assert.doesNotThrow(() => validateState(s));
  assert.throws(() =>
    validateState({ ...s, tasks: [task({ date: "2026-02-31" })] }),
  );
  assert.throws(() => validateState({ ...s, tasks: [task(), task()] }));
  assert.throws(() =>
    validateState({ ...s, transactions: [transaction("expense", 0.1)] }),
  );
});
test("Backup validation rejects unknown schema and malformed nested records", () => {
  const s = initialState(date);
  assert.throws(() => validateState({ ...s, schema: 99 }));
  assert.throws(() => validateState({ ...s, habits: [{ id: "x", logs: [] }] }));
  assert.throws(() =>
    validateState({
      ...s,
      plans: {
        "2026-13": { income: 1, savings: 0, committed: 0, budgets: {} },
      },
    }),
  );
});
test("Date helpers use calendar dates across year changes", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(monthShift("2026-12", 1), "2027-01");
});
const reminderHabit = (extra = {}) => ({
  id: "habit-1", title: "Read", target: 10, unit: "pages", days: [1, 2, 3, 4, 5],
  createdDate: "2026-09-01", logs: {}, reminderTime: "09:00", ...extra,
});
test("Habit reminders respect local time, weekdays, creation and incomplete targets", () => {
  const monday = new Date("2026-09-21T09:00:00");
  assert.deepEqual(dueHabits([
    reminderHabit(), reminderHabit({ id: "future", reminderTime: "09:01" }),
    reminderHabit({ id: "off", reminderTime: "" }),
    reminderHabit({ id: "legacy", reminderTime: undefined }),
    reminderHabit({ id: "done", logs: { "2026-09-21": 10 } }),
    reminderHabit({ id: "partial", logs: { "2026-09-21": 9 } }),
    reminderHabit({ id: "new", createdDate: "2026-09-22" }),
  ], monday).map(h => h.id), ["habit-1", "partial"]);
  assert.equal(dueHabits([reminderHabit()], new Date("2026-09-20T23:59:00")).length, 0);
  assert.equal(dueHabits([reminderHabit({ logs: { "2026-09-21": 10 } })], new Date("2026-09-22T09:00:00")).length, 1);
});
test("Habit delivery keys distinguish days, time edits, and task keys", () => {
  const h = reminderHabit();
  assert.notEqual(habitReminderKey(h, "2026-09-21"), habitReminderKey(h, "2026-09-22"));
  assert.notEqual(habitReminderKey(h, "2026-09-21"), habitReminderKey({ ...h, reminderTime: "10:00" }, "2026-09-21"));
  assert.notEqual(habitReminderKey(h, "2026-09-21"), reminderKey(task({ id: h.id, date: "2026-09-21", time: "09:00" })));
});
test("Existing habits remain compatible, invalid reminder times cannot enter storage", () => {
  const s = initialState(date);
  for (const time of [undefined, "", "00:00", "23:59"]) {
    s.habits = [reminderHabit({ reminderTime: time })];
    assert.doesNotThrow(() => validateState(s));
  }
  for (const time of [null, true, 930, "24:00", "9:30", "09:60"]) {
    assert.throws(() => validateState({ ...s, habits: [reminderHabit({ reminderTime: time })] }));
  }
});
