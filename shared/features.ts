import {
  addDays,
  dueHabits,
  dueTasks,
  habitProfile,
  habitScheduled,
  localDate,
  monthShift,
  parseDate,
  reminderKey,
  habitReminderKey,
  habitReminderSlot,
  toggleTask,
  validDate,
  type State,
  type Habit,
} from "./domain.js";

export interface Journey {
  enabled: boolean;
  celebrations: boolean;
  plant: "fern" | "flower" | "tree";
  events: {
    key: string;
    date: string;
    kind: "task" | "habit" | "focus";
    xp: number;
  }[];
}
export interface FocusSession {
  id: string;
  taskId: string;
  title: string;
  minutes: number;
  kind: "focus" | "break";
  status: "running" | "paused" | "completed" | "cancelled";
  endsAt: number;
  remainingMs: number;
  startedAt: number;
  completedDate?: string;
}
export interface Snooze {
  id: string;
  until: number;
  token: string;
}
export interface Bill {
  id: string;
  title: string;
  amount: number;
  category: string;
  day: number;
  startMonth: string;
  archived: boolean;
}
export const emptyJourney = (): Journey => ({
  enabled: true,
  celebrations: true,
  plant: "fern",
  events: [],
});
export const journeyXP = (s: State) =>
  (s.journey?.events || []).reduce((sum, e) => sum + e.xp, 0);
export const journeyLevel = (s: State) =>
  Math.floor(Math.sqrt(journeyXP(s) / 50)) + 1;

// Rewards are granted once per real completion, never for repeatedly toggling or editing records.
export function rewardChanges(
  before: State,
  next: State,
  today = localDate(),
): State {
  const journey = next.journey || emptyJourney();
  if (!journey.enabled) return next;
  const events = [...journey.events],
    keys = new Set(events.map((e) => e.key));
  const grant = (key: string, kind: "task" | "habit" | "focus", xp: number) => {
    if (!keys.has(key)) {
      events.push({ key, kind, xp, date: today });
      keys.add(key);
    }
  };
  for (const task of next.tasks)
    if (task.done && before.tasks.some((t) => t.id === task.id && !t.done))
      grant(`task:${task.id}`, "task", 10);
  for (const habit of next.habits) {
    const old = before.habits.find((h) => h.id === habit.id);
    if (
      old &&
      habitScheduled(habit, today) &&
      (habit.logs[today] || 0) >= habitProfile(habit, today).target &&
      (old.logs[today] || 0) < habitProfile(old, today).target &&
      (habit.logs[today] || 0) > (old.logs[today] || 0)
    )
      grant(`habit:${habit.id}:${today}`, "habit", 15);
  }
  for (const focus of next.focusSessions || [])
    if (
      focus.kind === "focus" &&
      focus.status === "completed" &&
      before.focusSessions?.some(
        (f) => f.id === focus.id && f.status === "running",
      )
    )
      grant(`focus:${focus.id}`, "focus", Math.min(60, focus.minutes));
  return events.length === journey.events.length
    ? next
    : { ...next, journey: { ...journey, events } };
}
export function settleFocus(state: State, now = Date.now()): State {
  if (
    !state.focusSessions?.some((f) => f.status === "running" && f.endsAt <= now)
  )
    return state;
  return rewardChanges(
    state,
    {
      ...state,
      focusSessions: state.focusSessions.map((f) =>
        f.status === "running" && f.endsAt <= now
          ? {
              ...f,
              status: "completed",
              remainingMs: 0,
              completedDate: localDate(new Date(now)),
            }
          : f,
      ),
    },
    localDate(new Date(now)),
  );
}
export function pauseFocus(state: State, id: string, now = Date.now()): State {
  const settled = settleFocus(state, now);
  return {
    ...settled,
    focusSessions: settled.focusSessions?.map((f) =>
      f.id === id && f.status === "running"
        ? {
            ...f,
            status: "paused",
            remainingMs: Math.max(0, f.endsAt - now),
            endsAt: 0,
          }
        : f,
    ),
  };
}
export function resumeFocus(state: State, id: string, now = Date.now()): State {
  return {
    ...state,
    focusSessions: state.focusSessions?.map((f) =>
      f.id === id && f.status === "paused"
        ? { ...f, status: "running", endsAt: now + f.remainingMs }
        : f,
    ),
  };
}
export function setHabitPause(h: Habit, from: string, until: string): Habit {
  if (!validDate(from) || !validDate(until) || until < from)
    throw new Error("Choose a valid pause end date.");
  return { ...h, pauses: [...(h.pauses || []), { from, until }] };
}
export function resumeHabit(h: Habit, date = localDate()): Habit {
  return {
    ...h,
    pauses: (h.pauses || []).flatMap((p) =>
      p.from <= date && p.until >= date
        ? p.from === date
          ? []
          : [{ ...p, until: addDays(date, -1) }]
        : [p],
    ),
  };
}
export function snoozeId(
  kind: "task" | "habit",
  id: string,
  today = localDate(),
) {
  return kind === "task" ? `task:${id}` : `habit:${id}:${today}`;
}
export function reminderToken(
  state: State,
  kind: "task" | "habit",
  id: string,
) {
  const item =
    kind === "task"
      ? state.tasks.find((t) => t.id === id)
      : state.habits.find((h) => h.id === id);
  if (!item) return "";
  return kind === "task"
    ? reminderKey(item as State["tasks"][number])
    : JSON.stringify([
        (item as Habit).reminderTime,
        (item as Habit).reminderInterval,
        (item as Habit).days,
      ]);
}
export function activeSnooze(
  state: State,
  kind: "task" | "habit",
  id: string,
  now = new Date(),
) {
  return state.snoozes?.find(
    (s) =>
      s.id === snoozeId(kind, id, localDate(now)) &&
      s.token === reminderToken(state, kind, id),
  );
}
export function snoozeReminder(
  state: State,
  kind: "task" | "habit",
  id: string,
  minutes: number,
  now = new Date(),
): State {
  if (![5, 10, 30].includes(minutes))
    throw new Error("Choose a 5, 10 or 30 minute snooze.");
  const key = snoozeId(kind, id, localDate(now));
  return {
    ...state,
    snoozes: [
      ...(state.snoozes || []).filter(
        (s) => s.id !== key && s.until > now.getTime() - 86400000,
      ),
      {
        id: key,
        until: now.getTime() + minutes * 60000,
        token: reminderToken(state, kind, id),
      },
    ],
  };
}
export function scheduledReminders(state: State, now = new Date()) {
  const today = localDate(now);
  const items = [
    ...dueTasks(state.tasks, now).map((t) => ({
      id: t.id,
      kind: "task" as const,
      title: t.title,
      body: `${t.date} at ${t.time} · ${t.list}`,
      key: reminderKey(t),
    })),
    ...dueHabits(state.habits, now).map((h) => ({
      id: h.id,
      kind: "habit" as const,
      title: h.title,
      body: `${h.logs[today] || 0} / ${habitProfile(h, today).target} ${habitProfile(h, today).unit} today`,
      key: habitReminderKey(h, today, habitReminderSlot(h, now)!),
    })),
  ];
  return items.flatMap((item) => {
    const snooze = activeSnooze(state, item.kind, item.id, now);
    if (snooze && snooze.until > now.getTime()) return [];
    return [
      {
        ...item,
        key: snooze ? `${item.key}|snooze:${snooze.until}` : item.key,
      },
    ];
  });
}
export function completeReminder(
  state: State,
  kind: "task" | "habit",
  id: string,
  today = localDate(),
): State {
  if (kind === "task")
    return state.tasks.find((t) => t.id === id)?.done
      ? state
      : toggleTask(state, id);
  return {
    ...state,
    habits: state.habits.map((h) =>
      h.id === id && habitScheduled(h, today)
        ? {
            ...h,
            logs: {
              ...h.logs,
              [today]: Math.max(
                h.logs[today] || 0,
                habitProfile(h, today).target,
              ),
            },
          }
        : h,
    ),
  };
}
export function billDueDate(bill: Bill, month: string) {
  const d = parseDate(`${month}-01`);
  return localDate(
    new Date(
      d.getFullYear(),
      d.getMonth(),
      Math.min(
        bill.day,
        new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
      ),
      12,
    ),
  );
}
export const billPaymentId = (bill: Bill, month: string) =>
  `bill:${bill.id}:${month}`;
export function billReminders(state: State, now = new Date()) {
  const month = localDate(now).slice(0, 7);
  return (state.bills || [])
    .filter(
      (b) =>
        !b.archived &&
        b.startMonth <= month &&
        new Date(`${billDueDate(b, month)}T09:00:00`) <= now &&
        !state.transactions.some((t) => t.id === billPaymentId(b, month)),
    )
    .map((b) => ({
      key: billPaymentId(b, month),
      id: b.id,
      kind: "bill",
      title: `${b.title} is due`,
      body: "Review this bill in Finance. Payments are only recorded when you confirm them.",
    }));
}
export function payBill(
  state: State,
  id: string,
  month: string,
  today = localDate(),
): State {
  const bill = state.bills?.find((b) => b.id === id && !b.archived);
  if (!bill || month < bill.startMonth || month > today.slice(0, 7))
    throw new Error("This bill is not payable for that month.");
  const paymentId = billPaymentId(bill, month);
  if (state.transactions.some((t) => t.id === paymentId)) return state;
  return {
    ...state,
    transactions: [
      ...state.transactions,
      {
        id: paymentId,
        type: "expense",
        amount: bill.amount,
        category: bill.category,
        date: today,
        note: `${bill.title} · bill for ${month}`,
        method: "Bill payment",
      },
    ],
  };
}
export const previousMonth = (month: string) => monthShift(month, -1);

// Extension fields remain optional, so older schema-2 workspaces need no destructive migration.
export function validateExtensions(s: Record<string, unknown>) {
  const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const str = (v: unknown, max = 500): v is string =>
    typeof v === "string" && v.length <= max;
  const int = (v: unknown, low: number, high: number): v is number =>
    Number.isSafeInteger(v) && Number(v) >= low && Number(v) <= high;
  const array = (
    v: unknown,
    check: (x: Record<string, unknown>) => boolean,
    max = 100000,
  ): boolean =>
    Array.isArray(v) && v.length <= max && v.every((x) => obj(x) && check(x));
  const unique = (v: unknown, key: string) =>
    Array.isArray(v) && new Set(v.map((x) => x[key])).size === v.length;
  const daySet = (v: unknown) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 7 &&
    v.every((d) => int(d, 0, 6)) &&
    new Set(v).size === v.length;
  if (
    s.journey !== undefined &&
    (!obj(s.journey) ||
      typeof s.journey.enabled !== "boolean" ||
      typeof s.journey.celebrations !== "boolean" ||
      !["fern", "flower", "tree"].includes(String(s.journey.plant)) ||
      !array(
        s.journey.events,
        (e) =>
          str(e.key, 220) &&
          !!e.key &&
          validDate(e.date) &&
          ["task", "habit", "focus"].includes(String(e.kind)) &&
          int(e.xp, 1, 60),
      ) ||
      !unique(s.journey.events, "key"))
  )
    throw new Error("Invalid garden progress.");
  if (
    s.focusSessions !== undefined &&
    (!array(
      s.focusSessions,
      (f) =>
        str(f.id, 150) &&
        !!f.id &&
        str(f.taskId, 150) &&
        str(f.title) &&
        int(f.minutes, 1, 180) &&
        ["focus", "break"].includes(String(f.kind)) &&
        ["running", "paused", "completed", "cancelled"].includes(
          String(f.status),
        ) &&
        int(f.endsAt, 0, 8640000000000000) &&
        int(f.startedAt, 1, 8640000000000000) &&
        int(f.remainingMs, 0, Number(f.minutes) * 60000) &&
        (f.status !== "running" || Number(f.endsAt) >= Number(f.startedAt)) &&
        (f.status !== "completed" || validDate(f.completedDate)),
    ) ||
      !unique(s.focusSessions, "id") ||
      (s.focusSessions as FocusSession[]).filter((f) =>
        ["running", "paused"].includes(f.status),
      ).length > 1)
  )
    throw new Error("Invalid focus sessions.");
  if (
    s.snoozes !== undefined &&
    (!array(
      s.snoozes,
      (r) =>
        str(r.id, 200) &&
        !!r.id &&
        str(r.token, 1000) &&
        int(r.until, 1, 8640000000000000),
      10000,
    ) ||
      !unique(s.snoozes, "id"))
  )
    throw new Error("Invalid snoozed reminders.");
  if (
    s.bills !== undefined &&
    (!array(
      s.bills,
      (b) =>
        str(b.id, 100) &&
        !!b.id &&
        str(b.title, 200) &&
        !!b.title.trim() &&
        int(b.amount, 1, 100000000000) &&
        (s.expenseCategories as string[]).includes(String(b.category)) &&
        int(b.day, 1, 31) &&
        str(b.startMonth, 7) &&
        validDate(`${b.startMonth}-01`) &&
        typeof b.archived === "boolean",
      1000,
    ) ||
      !unique(s.bills, "id"))
  )
    throw new Error("Invalid recurring bills.");
  for (const h of s.habits as Habit[]) {
    if (
      h.history !== undefined &&
      (!array(
        h.history,
        (p) =>
          validDate(p.from) &&
          p.from >= h.createdDate &&
          int(p.target, 1, 10000) &&
          str(p.unit, 50) &&
          !!p.unit.trim() &&
          daySet(p.days),
        10000,
      ) ||
        !unique(h.history, "from"))
    )
      throw new Error("Invalid habit history.");
    if (
      h.pauses !== undefined &&
      !array(
        h.pauses,
        (p) => validDate(p.from) && validDate(p.until) && p.until >= p.from,
        10000,
      )
    )
      throw new Error("Invalid habit pauses.");
  }
}
