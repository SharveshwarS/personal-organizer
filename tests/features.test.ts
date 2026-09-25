import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  validateState,
  nextDate,
  toggleTask,
  habitScheduled,
  habitStreak,
  habitProfile,
  editHabitSchedule,
  finance,
  renameGroup,
  removeGroup,
  hasFinancialData,
} from "../build/shared/domain.js";
import {
  rewardChanges,
  journeyXP,
  emptyJourney,
  settleFocus,
  pauseFocus,
  resumeFocus,
  setHabitPause,
  resumeHabit,
  snoozeReminder,
  scheduledReminders,
  completeReminder,
  billDueDate,
  payBill,
  billReminders,
} from "../build/shared/features.js";
import { Store } from "../build/electron/database.js";

const today = "2026-09-25";
const task = () => ({
  id: "t1",
  title: "A small task",
  notes: "",
  date: today,
  time: "09:00",
  priority: "medium",
  list: "Work",
  repeat: "none",
  anchorDay: 25,
  series: "t1",
  done: false,
  reminder: true,
  duration: 25,
  createdAt: today,
});
const habit = () => ({
  id: "h1",
  title: "Read",
  target: 2,
  unit: "pages",
  days: [0, 1, 2, 3, 4, 5, 6],
  logs: {},
  createdDate: "2026-09-20",
  reminderTime: "08:00",
});
const at = (time) => new Date(`${today}T${time}:00`);
test("Custom, weekday, month-end and yearly recurrence preserve calendar boundaries", () => {
  assert.equal(nextDate({ ...task(), repeat: "weekdays" }), "2026-09-28");
  assert.equal(
    nextDate({ ...task(), repeat: "custom", everyDays: 3 }),
    "2026-09-28",
  );
  assert.equal(
    nextDate({ ...task(), date: "2028-01-31", repeat: "month-end" }),
    "2028-02-29",
  );
  const leap = {
    ...task(),
    date: "2028-02-29",
    anchorDay: 29,
    repeat: "yearly",
  };
  assert.equal(nextDate(leap), "2029-02-28");
  assert.equal(nextDate({ ...leap, date: "2031-02-28" }), "2032-02-29");
  const s = initialState(today);
  s.tasks = [
    {
      ...task(),
      repeat: "custom",
      everyDays: 7,
      tags: ["work"],
      checklist: [{ id: "c", title: "Step", done: true }],
    },
  ];
  const next = toggleTask(s, "t1");
  assert.equal(next.tasks[1].date, "2026-10-02");
  assert.deepEqual(next.tasks[1].tags, ["work"]);
  assert.equal(next.tasks[1].checklist[0].done, false);
});
test("Task rewards persist once through reopen, repeated completion and opt-out", () => {
  const s = initialState(today);
  s.tasks = [task()];
  const once = rewardChanges(s, toggleTask(s, "t1"), today);
  assert.equal(journeyXP(once), 10);
  const reopened = rewardChanges(once, toggleTask(once, "t1"), today);
  const twice = rewardChanges(reopened, toggleTask(reopened, "t1"), today);
  assert.equal(journeyXP(twice), 10);
  s.journey = { ...emptyJourney(), enabled: false };
  assert.equal(journeyXP(rewardChanges(s, toggleTask(s, "t1"), today)), 0);
});
test("Habit XP requires increased current-day logs, not target edits or retroactive corrections", () => {
  const s = initialState(today);
  s.habits = [{ ...habit(), logs: { [today]: 1 } }];
  const lowered = { ...s, habits: [{ ...s.habits[0], target: 1 }] };
  assert.equal(journeyXP(rewardChanges(s, lowered, today)), 0);
  const done = rewardChanges(
    s,
    completeReminder(s, "habit", "h1", today),
    today,
  );
  assert.equal(journeyXP(done), 15);
  const reset = {
    ...done,
    habits: [{ ...done.habits[0], logs: { [today]: 0 } }],
  };
  assert.equal(
    journeyXP(
      rewardChanges(
        reset,
        completeReminder(reset, "habit", "h1", today),
        today,
      ),
    ),
    15,
  );
  const past = {
    ...s,
    habits: [{ ...s.habits[0], logs: { "2026-09-24": 2 } }],
  };
  assert.equal(journeyXP(rewardChanges(s, past, today)), 0);
});
test("History keeps old targets/units and paused days do not break streaks", () => {
  const h = { ...habit(), logs: { "2026-09-23": 2, "2026-09-24": 2 } };
  const changed = editHabitSchedule(
    h,
    { ...h, target: 5, unit: "chapters" },
    today,
  );
  assert.equal(habitProfile(changed, "2026-09-24").target, 2);
  assert.equal(habitProfile(changed, today).target, 5);
  assert.equal(habitProfile(changed, "2026-09-24").unit, "pages");
  const paused = setHabitPause(changed, today, "2026-09-27");
  assert.equal(habitScheduled(paused, today), false);
  assert.equal(habitStreak(paused, today), 2);
  const resumed = resumeHabit(paused, "2026-09-26");
  assert.equal(habitScheduled(resumed, today), false);
  assert.equal(habitScheduled(resumed, "2026-09-26"), true);
});
test("Snooze defers transport without moving due time, then issues one stable new key", () => {
  const s = initialState(today);
  s.tasks = [task()];
  const oldKey = scheduledReminders(s, at("09:00"))[0].key;
  const snoozed = snoozeReminder(s, "task", "t1", 10, at("09:00"));
  assert.equal(snoozed.tasks[0].time, "09:00");
  assert.equal(snoozed.tasks[0].date, today);
  assert.equal(scheduledReminders(snoozed, at("09:09")).length, 0);
  const due = scheduledReminders(snoozed, at("09:10"));
  assert.notEqual(due[0].key, oldKey);
  assert.equal(scheduledReminders(snoozed, at("09:11"))[0].key, due[0].key);
  assert.equal(
    scheduledReminders(
      completeReminder(snoozed, "task", "t1", today),
      at("09:11"),
    ).length,
    0,
  );
});
test("Habit snoozes honor pauses, date boundaries, edited schedules and interval windows", () => {
  const s = initialState(today);
  s.habits = [habit()];
  const snoozed = snoozeReminder(s, "habit", "h1", 30, at("08:00"));
  assert.equal(scheduledReminders(snoozed, at("08:29")).length, 0);
  assert.equal(scheduledReminders(snoozed, at("08:30")).length, 1);
  const changed = {
    ...snoozed,
    habits: [{ ...habit(), reminderTime: "08:10" }],
  };
  assert.equal(scheduledReminders(changed, at("08:15")).length, 1);
  assert.equal(
    scheduledReminders(
      { ...snoozed, habits: [setHabitPause(habit(), today, today)] },
      at("08:30"),
    ).length,
    0,
  );
  assert.equal(
    scheduledReminders(snoozed, new Date("2026-09-26T08:00:00")).length,
    1,
  );
});
test("Focus pause/resume and completion survive serialized state without duplicate XP", () => {
  const now = at("10:00").getTime(),
    s = initialState(today);
  s.focusSessions = [
    {
      id: "f1",
      taskId: "",
      title: "Focus",
      kind: "focus",
      minutes: 25,
      status: "running",
      startedAt: now,
      endsAt: now + 1500000,
      remainingMs: 1500000,
    },
  ];
  const paused = pauseFocus(s, "f1", now + 60000);
  assert.equal(paused.focusSessions[0].remainingMs, 1440000);
  assert.equal(settleFocus(paused, now + 9999999), paused);
  const resumed = resumeFocus(
    validateState(JSON.parse(JSON.stringify(paused))),
    "f1",
    now + 3600000,
  );
  assert.equal(resumed.focusSessions[0].endsAt, now + 5040000);
  const done = settleFocus(resumed, now + 5040000);
  assert.equal(journeyXP(done), 25);
  assert.equal(done.focusSessions[0].status, "completed");
  assert.equal(settleFocus(done, now + 6000000), done);
});
test("Breaks, cancelled sessions and sessions paused after their deadline have correct rewards", () => {
  const now = at("10:00").getTime(),
    s = initialState(today);
  const f = {
    id: "f",
    taskId: "",
    title: "Rest",
    kind: "break",
    minutes: 5,
    status: "running",
    startedAt: now - 300000,
    endsAt: now,
    remainingMs: 300000,
  };
  s.focusSessions = [f];
  assert.equal(journeyXP(settleFocus(s, now)), 0);
  s.focusSessions = [{ ...f, kind: "focus", status: "cancelled" }];
  assert.equal(settleFocus(s, now), s);
  s.focusSessions = [{ ...f, kind: "focus" }];
  assert.equal(pauseFocus(s, "f", now).focusSessions[0].status, "completed");
  assert.equal(journeyXP(pauseFocus(s, "f", now)), 5);
});
test("Bills clamp short months, require confirmation and deduplicate monthly payments", () => {
  const s = initialState(today),
    b = {
      id: "bill1",
      title: "Internet",
      amount: 12345,
      category: "Utilities",
      day: 31,
      startMonth: "2026-01",
      archived: false,
    };
  s.bills = [b];
  assert.equal(billDueDate(b, "2026-02"), "2026-02-28");
  assert.equal(hasFinancialData(s), true);
  assert.equal(s.transactions.length, 0);
  const paid = payBill(s, b.id, "2026-09", today);
  assert.equal(paid.transactions[0].date, today);
  assert.equal(finance(paid, "2026-09", today).expenses, 12345);
  assert.equal(payBill(paid, b.id, "2026-09", today), paid);
  assert.throws(() => payBill(s, b.id, "2026-10", today));
  assert.equal(
    renameGroup(s, "expenseCategories", "Utilities", "Bills").bills[0].category,
    "Bills",
  );
  assert.equal(
    removeGroup(s, "expenseCategories", "Utilities", "Other").bills[0].category,
    "Other",
  );
});
test("New extension state round-trips through SQLite and rejects corrupt backup fields", () => {
  const s = initialState(today);
  s.tasks = [task()];
  s.habits = [editHabitSchedule(habit(), { ...habit(), target: 3 }, today)];
  s.journey = emptyJourney();
  s.bills = [
    {
      id: "b",
      title: "Bill",
      amount: 10,
      category: "Food",
      day: 1,
      startMonth: "2026-09",
      archived: false,
    },
  ];
  const complete = rewardChanges(s, toggleTask(s, "t1"), today);
  const store = new Store(":memory:");
  try {
    const revision = store.read().revision;
    store.save(complete, revision);
    assert.deepEqual(store.read().state, complete);
  } finally {
    store.close();
  }
  assert.throws(() =>
    validateState({
      ...complete,
      journey: {
        ...complete.journey,
        events: [...complete.journey.events, ...complete.journey.events],
      },
    }),
  );
  assert.throws(() =>
    validateState({ ...complete, bills: [{ ...s.bills[0], amount: 1.5 }] }),
  );
  assert.throws(() =>
    validateState({
      ...complete,
      tasks: [{ ...task(), repeat: "custom", everyDays: 0 }],
    }),
  );
  assert.throws(() =>
    validateState({
      ...complete,
      habits: [{ ...habit(), pauses: [{ from: today, until: "2026-01-01" }] }],
    }),
  );
  assert.deepEqual(validateState(initialState(today)), initialState(today));
});
test("Bill reminders wait for 09:00, stop after payment and skip archived or future bills", () => {
  const s = initialState(today);
  s.bills = [
    {
      id: "b",
      title: "Bill",
      amount: 10,
      category: "Food",
      day: 25,
      startMonth: "2026-09",
      archived: false,
    },
  ];
  assert.equal(billReminders(s, at("08:59")).length, 0);
  assert.equal(billReminders(s, at("09:00")).length, 1);
  assert.equal(
    billReminders(payBill(s, "b", "2026-09", today), at("09:01")).length,
    0,
  );
  assert.equal(
    billReminders(
      { ...s, bills: [{ ...s.bills[0], archived: true }] },
      at("09:01"),
    ).length,
    0,
  );
  assert.equal(
    billReminders(
      { ...s, bills: [{ ...s.bills[0], startMonth: "2026-10" }] },
      at("09:01"),
    ).length,
    0,
  );
});
