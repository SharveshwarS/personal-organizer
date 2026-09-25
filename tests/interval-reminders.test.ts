// Prepared regression cases; execution is deferred to the authorized test phase.
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, validateState, dueHabits, habitReminderSlot, habitReminderKey, inQuietHours } from "../build/shared/domain.js";
import { Store } from "../build/electron/database.js";

const date = "2026-09-24";
const at = (time) => new Date(`${date}T${time}:00`);
const habit = () => ({ id: "water", title: "Drink water", unit: "glasses", target: 8, days: [4], logs: {}, createdDate: date,
  reminderTime: "", reminderInterval: { minutes: 120, start: "08:00", end: "22:00", stopAtTarget: false } });

test("Interval reminders follow the daily window and selected weekdays", () => {
  const h = habit();
  assert.equal(habitReminderSlot(h, at("07:59")), null);
  assert.equal(habitReminderSlot(h, at("08:00")), "08:00");
  assert.equal(habitReminderSlot(h, at("09:59")), "08:00");
  assert.equal(habitReminderSlot(h, at("10:00")), "10:00");
  assert.equal(habitReminderSlot(h, at("22:00")), "22:00");
  assert.equal(habitReminderSlot(h, at("22:01")), null);
  assert.equal(dueHabits([h], new Date("2026-09-25T10:00:00")).length, 0);
});

test("Ten-minute slots have stable keys and a new key at the next interval", () => {
  const h = habit(); h.reminderInterval.minutes = 10;
  const key = time => habitReminderKey(h, date, habitReminderSlot(h, at(time)));
  assert.equal(key("08:10"), key("08:19"));
  assert.notEqual(key("08:19"), key("08:20"));
  assert.notEqual(key("08:10"), habitReminderKey(h, "2026-10-01", "08:10"));
});

test("Wake and quiet-hours catch-up selects only the latest eligible interval", () => {
  const h = habit(); h.reminderInterval.minutes = 10;
  const s = initialState(date); s.settings.quietHours = { enabled: true, start: "08:00", end: "09:05" };
  assert.equal(inQuietHours(s.settings, at("09:04")), true);
  assert.equal(inQuietHours(s.settings, at("09:05")), false);
  assert.equal(habitReminderSlot(h, at("09:05")), "09:00");
  assert.equal(dueHabits([h], at("13:57")).length, 1);
  assert.equal(habitReminderSlot(h, at("13:57")), "13:50");
});

test("Intervals continue after target completion unless stop-at-target is enabled", () => {
  const h = habit(); h.logs[date] = 8;
  assert.equal(dueHabits([h], at("10:00")).length, 1);
  h.reminderInterval.stopAtTarget = true;
  assert.equal(dueHabits([h], at("10:00")).length, 0);
});

test("Interval validation rejects impossible schedules and preserves old daily reminders", () => {
  const s = initialState(date), h = habit(); s.habits = [h];
  assert.deepEqual(validateState(s).habits[0], h);
  for (const change of [{ minutes: 0 }, { minutes: 1.5 }, { minutes: 1441 }, { start: "22:00", end: "08:00" }, { start: "08:00", end: "08:00" }, { end: "25:00" }, { stopAtTarget: "yes" }]) {
    assert.throws(() => validateState({ ...s, habits: [{ ...h, reminderInterval: { ...h.reminderInterval, ...change } }] }));
  }
  assert.throws(() => validateState({ ...s, habits: [{ ...h, reminderTime: "09:00" }] }));
  const daily = { ...h, reminderInterval: undefined, reminderTime: "09:00" };
  assert.equal(validateState({ ...s, habits: [daily] }).habits[0].reminderTime, "09:00");
  assert.equal(habitReminderKey(daily, date), `habit|water|${date}|09:00`);
});

test("SQLite keeps interval settings and deduplicates delivered slots independently", () => {
  const db = new Store(":memory:");
  try {
    const snapshot = db.read(); snapshot.state.habits = [habit()];
    db.save(snapshot.state, snapshot.revision);
    const h = db.read().state.habits[0];
    assert.deepEqual(h.reminderInterval, habit().reminderInterval);
    const current = habitReminderKey(h, date, "08:00"), next = habitReminderKey(h, date, "10:00");
    db.mark(current, "attempted");
    assert.equal(db.attempted(current), true); assert.equal(db.attempted(next), false);
    db.restore(db.read().state);
    assert.deepEqual(db.read().state.habits[0].reminderInterval, habit().reminderInterval);
  } finally { db.close(); }
});
