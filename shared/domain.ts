import { validateExtensions } from "./features.js";
import type { Journey, FocusSession, Snooze, Bill } from "./features.js";
export type Priority = "low" | "medium" | "high";
export type Repeat =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "weekdays"
  | "custom"
  | "month-end"
  | "yearly";
export interface Task {
  id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  priority: Priority;
  list: string;
  repeat: Repeat;
  anchorDay: number;
  series: string;
  done: boolean;
  reminder: boolean;
  duration: number;
  createdAt: string;
  checklist?: { id: string; title: string; done: boolean }[];
  everyDays?: number;
  tags?: string[];
}
export interface Habit {
  id: string;
  title: string;
  target: number;
  unit: string;
  days: number[];
  createdDate: string;
  logs: Record<string, number>;
  // Empty or absent keeps older habits/backups opt-in to notifications.
  reminderTime?: string;
  reminderInterval?: {
    minutes: number;
    start: string;
    end: string;
    stopAtTarget: boolean;
  };
  history?: { from: string; target: number; unit: string; days: number[] }[];
  pauses?: { from: string; until: string }[];
}
export interface Note {
  id: string;
  title: string;
  body: string;
  folder: string;
  pinned: boolean;
  updatedAt: string;
}
export type TransactionType =
  | "income"
  | "expense"
  | "refund"
  | "save"
  | "withdraw";
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
  method: string;
}
export interface Plan {
  income: number;
  savings: number;
  committed: number;
  budgets: Record<string, number>;
}
export interface State {
  schema: 2;
  journey?: Journey;
  focusSessions?: FocusSession[];
  snoozes?: Snooze[];
  bills?: Bill[];
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  transactions: Transaction[];
  plans: Record<string, Plan>;
  planDefaults: Record<string, Plan>;
  taskLists: string[];
  expenseCategories: string[];
  settings: {
    name: string;
    openingBalance: number;
    openingSavings: number;
    balanceDate: string;
    closeToTray: boolean;
    startAtLogin: boolean;
    setupComplete: boolean;
    currency: string;
    weekStartsOn: 0 | 1;
    quietHours: { enabled: boolean; start: string; end: string };
  };
}
export interface Snapshot {
  state: State;
  revision: number;
}
export const categories = [
  "Food",
  "Transport",
  "Mobile & internet",
  "Study",
  "Subscriptions",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];
export const supportedCurrencies = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
  "AED",
  "SAR",
  "CHF",
  "JPY",
  "KRW",
  "CNY",
  "HKD",
  "BRL",
  "MXN",
  "ZAR",
  "BDT",
  "LKR",
  "NPR",
  "PKR",
  "IDR",
  "PHP",
  "MYR",
  "THB",
  "KWD",
  "BHD",
];
export function currencyDigits(currency = "INR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits!;
}
export const moneyScale = (currency = "INR") => 10 ** currencyDigits(currency);
export const categoryColors = [
  "#a99aff",
  "#78c9b1",
  "#f3c875",
  "#85bafa",
  "#f3a0b9",
  "#c2a5ed",
  "#86c99a",
  "#e9aa79",
  "#97a4b8",
];
export const uid = () => crypto.randomUUID();
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}
export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function monthShift(month: string, amount: number): string {
  const d = parseDate(`${month}-01`);
  d.setMonth(d.getMonth() + amount);
  return localDate(d).slice(0, 7);
}
export const money = (minorUnits: number, currency = "INR") =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
    style: "currency",
    currency,
    maximumFractionDigits:
      minorUnits % moneyScale(currency) ? currencyDigits(currency) : 0,
  }).format(minorUnits / moneyScale(currency));
export function toMinorUnits(value: string, currency = "INR"): number {
  const digits = currencyDigits(currency);
  if (
    !new RegExp(digits ? `^\\d+(\\.\\d{1,${digits}})?$` : "^\\d+$").test(value)
  )
    throw new Error(
      `Enter a non-negative amount with at most ${digits} decimal places for ${currency}.`,
    );
  const [whole, decimal = ""] = value.split(".");
  const n =
    Number(whole) * moneyScale(currency) + Number(decimal.padEnd(digits, "0"));
  if (!Number.isSafeInteger(n) || n > 100000000000)
    throw new Error("Amount is too large.");
  return n;
}
export const toPaise = (value: string) => toMinorUnits(value, "INR");
export function defaultPlan(): Plan {
  return { income: 0, savings: 0, committed: 0, budgets: {} };
}
export function planForMonth(state: State, month: string): Plan {
  const effective = Object.keys(state.planDefaults)
    .filter((m) => m <= month)
    .sort()
    .at(-1);
  return (
    state.plans[month] ||
    (effective ? state.planDefaults[effective] : defaultPlan())
  );
}
export function hasFinancialData(state: State) {
  return !!(
    state.bills?.length ||
    state.transactions.length ||
    state.settings.openingBalance ||
    state.settings.openingSavings ||
    [...Object.values(state.plans), ...Object.values(state.planDefaults)].some(
      (p) =>
        p.income ||
        p.savings ||
        p.committed ||
        Object.values(p.budgets).some(Boolean),
    )
  );
}
export function initialState(today = localDate()): State {
  return {
    schema: 2,
    tasks: [],
    habits: [],
    notes: [],
    transactions: [],
    plans: {},
    planDefaults: {},
    taskLists: ["Inbox", "Personal", "Work"],
    expenseCategories: [
      "Food",
      "Housing",
      "Utilities",
      "Transport",
      "Health",
      "Education",
      "Shopping",
      "Subscriptions",
      "Entertainment",
      "Other",
    ],
    settings: {
      name: "",
      openingBalance: 0,
      openingSavings: 0,
      balanceDate: `${today.slice(0, 7)}-01`,
      closeToTray: true,
      startAtLogin: false,
      setupComplete: false,
      currency: "USD",
      weekStartsOn: 1,
      quietHours: { enabled: false, start: "22:00", end: "08:00" },
    },
  };
}
export function nextDate(task: Task): string {
  if (!task.date || task.repeat === "none") return "";
  if (task.repeat === "custom") return addDays(task.date, task.everyDays || 1);
  if (task.repeat === "weekdays") {
    let next = addDays(task.date, 1);
    while ([0, 6].includes(parseDate(next).getDay())) next = addDays(next, 1);
    return next;
  }
  if (task.repeat === "month-end") {
    const d = parseDate(task.date);
    return localDate(new Date(d.getFullYear(), d.getMonth() + 2, 0, 12));
  }
  if (task.repeat === "yearly") {
    const d = parseDate(task.date),
      year = d.getFullYear() + 1;
    return localDate(
      new Date(
        year,
        d.getMonth(),
        Math.min(task.anchorDay, new Date(year, d.getMonth() + 1, 0).getDate()),
        12,
      ),
    );
  }
  if (task.repeat === "daily") return addDays(task.date, 1);
  if (task.repeat === "weekly") return addDays(task.date, 7);
  const d = parseDate(task.date);
  const year = d.getFullYear(),
    month = d.getMonth() + 1;
  return localDate(
    new Date(
      year,
      month,
      Math.min(
        task.anchorDay || d.getDate(),
        new Date(year, month + 1, 0).getDate(),
      ),
      12,
    ),
  );
}
export function toggleTask(state: State, id: string): State {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return state;
  const tasks = state.tasks.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t,
  );
  const date = nextDate(task);
  const nextId = `${task.series}:${date}`;
  if (!task.done && validDate(date) && !tasks.some((t) => t.id === nextId))
    tasks.push({
      ...task,
      id: nextId,
      date,
      done: false,
      createdAt: new Date().toISOString(),
      checklist: task.checklist?.map((item) => ({ ...item, done: false })),
    });
  return { ...state, tasks };
}
export function habitScheduled(habit: Habit, date: string): boolean {
  return (
    date >= habit.createdDate &&
    habitProfile(habit, date).days.includes(parseDate(date).getDay()) &&
    !habit.pauses?.some((p) => p.from <= date && date <= p.until)
  );
}
export function habitProfile(habit: Habit, date: string) {
  return (
    [...(habit.history || [])]
      .filter((p) => p.from <= date)
      .sort((a, b) => a.from.localeCompare(b.from))
      .at(-1) || habit
  );
}
export function editHabitSchedule(
  previous: Habit,
  next: Habit,
  date = localDate(),
): Habit {
  const history = previous.history || [
    {
      from: previous.createdDate,
      target: previous.target,
      unit: previous.unit,
      days: previous.days,
    },
  ];
  return {
    ...next,
    ...(previous.pauses ? { pauses: previous.pauses } : {}),
    history: [
      ...history.filter((h) => h.from !== date),
      { from: date, target: next.target, unit: next.unit, days: next.days },
    ].sort((a, b) => a.from.localeCompare(b.from)),
  };
}
export function habitStreak(habit: Habit, today: string): number {
  let day = today,
    streak = 0;
  if ((habit.logs[day] || 0) < habitProfile(habit, day).target)
    day = addDays(day, -1);
  for (
    let i = 0;
    i < 36600 && day >= habit.createdDate;
    i++, day = addDays(day, -1)
  ) {
    if (!habitScheduled(habit, day)) continue;
    if ((habit.logs[day] || 0) < habitProfile(habit, day).target) break;
    streak++;
  }
  return streak;
}
export function finance(state: State, month: string, today = localDate()) {
  const plan = planForMonth(state, month);
  const entries = state.transactions.filter((t) => t.date.startsWith(month));
  const total = (type: TransactionType) =>
    entries.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const income = total("income"),
    expenses = total("expense") - total("refund"),
    contributions = total("save") - total("withdraw");
  const surplus = income - expenses,
    allowance = plan.income - plan.savings - expenses - plan.committed;
  const end = localDate(
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12),
  );
  const days =
    month < today.slice(0, 7)
      ? 0
      : month > today.slice(0, 7)
        ? Number(end.slice(8))
        : Number(end.slice(8)) - Number(today.slice(8)) + 1;
  const balanceAsOf = month === today.slice(0, 7) ? today : end;
  const balanceAvailable = balanceAsOf >= state.settings.balanceDate;
  const balances = state.transactions.filter(
    (t) => t.date >= state.settings.balanceDate && t.date <= balanceAsOf,
  );
  let spendable = state.settings.openingBalance,
    savingsBalance = state.settings.openingSavings;
  for (const t of balances) {
    spendable += ["income", "refund", "withdraw"].includes(t.type)
      ? t.amount
      : -t.amount;
    if (t.type === "save") savingsBalance += t.amount;
    if (t.type === "withdraw") savingsBalance -= t.amount;
  }
  const byCategory = state.expenseCategories.map((name, i) => ({
    name,
    color: categoryColors[i % categoryColors.length],
    amount: entries
      .filter((t) => t.category === name)
      .reduce(
        (s, t) =>
          s +
          (t.type === "expense"
            ? t.amount
            : t.type === "refund"
              ? -t.amount
              : 0),
        0,
      ),
    budget: plan.budgets[name] || 0,
  }));
  return {
    plan,
    entries,
    income,
    expenses,
    surplus,
    contributions,
    allowance,
    days,
    daily: days ? Math.floor(Math.max(0, allowance) / days) : 0,
    rate: income ? (surplus / income) * 100 : null,
    spendable,
    savingsBalance,
    balanceAvailable,
    byCategory,
  };
}

// Shared validation protects IPC, browser imports, and database recovery alike.
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown, max = 1000) =>
  typeof v === "string" && v.length <= max;
const integer = (v: unknown, min = 0, max = 100000000000) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
export function validDate(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    v >= "1900-01-01" &&
    v <= "2200-12-31" &&
    localDate(parseDate(v)) === v
  );
}
const dateOrEmpty = (v: unknown) => v === "" || validDate(v);
const validTime = (v: unknown) =>
  v === "" || (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
const month = (v: string) => /^\d{4}-\d{2}$/.test(v) && validDate(`${v}-01`);
const record = (v: unknown, check: (key: string, value: unknown) => boolean) =>
  object(v) && Object.entries(v).every(([k, val]) => check(k, val));
export function validateState(input: unknown): State {
  if (!object(input) || (input.schema !== 1 && input.schema !== 2))
    throw new Error("Unsupported backup format or version.");
  let s = structuredClone(input);
  if (s.schema === 1) {
    if (!object(s.settings) || !Array.isArray(s.tasks))
      throw new Error("Invalid legacy workspace.");
    s = {
      ...s,
      schema: 2,
      taskLists: [
        ...new Set([
          "Personal",
          "Study",
          "Work",
          "Bills",
          ...s.tasks.map((t) => (object(t) ? t.list : "")),
        ]),
      ],
      expenseCategories: [...categories],
      planDefaults: {
        "1900-01": {
          income: 600000,
          savings: 150000,
          committed: 0,
          budgets: {},
        },
      },
      settings: {
        ...s.settings,
        currency: "INR",
        setupComplete: true,
        weekStartsOn: 1,
        quietHours: { enabled: false, start: "22:00", end: "08:00" },
      },
    };
  }
  const names = (v: unknown) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 100 &&
    v.every(
      (n) =>
        string(n, 100) &&
        !!String(n).trim() &&
        n === String(n).trim() &&
        !["__proto__", "constructor", "prototype"].includes(String(n)),
    ) &&
    new Set(v.map((n) => String(n).toLowerCase())).size === v.length;
  if (!names(s.taskLists) || !names(s.expenseCategories))
    throw new Error("Invalid lists or expense categories.");
  const taskLists = s.taskLists as string[],
    expenseCategories = s.expenseCategories as string[];
  const collection = (
    key: string,
    check: (v: Record<string, unknown>) => boolean,
  ) =>
    Array.isArray(s[key]) &&
    s[key].length <= 100000 &&
    s[key].every((v) => object(v) && string(v.id, 150) && !!v.id && check(v)) &&
    new Set(s[key].map((v) => v.id)).size === s[key].length;
  if (
    !collection(
      "tasks",
      (t) =>
        string(t.title, 500) &&
        !!String(t.title).trim() &&
        string(t.notes, 100000) &&
        dateOrEmpty(t.date) &&
        validTime(t.time) &&
        (!t.time || !!t.date) &&
        ["low", "medium", "high"].includes(String(t.priority)) &&
        taskLists.includes(String(t.list)) &&
        (t.checklist === undefined ||
          (Array.isArray(t.checklist) &&
            t.checklist.length <= 100 &&
            t.checklist.every(
              (c) =>
                object(c) &&
                string(c.id, 150) &&
                !!c.id &&
                string(c.title, 500) &&
                !!String(c.title).trim() &&
                typeof c.done === "boolean",
            ) &&
            new Set(t.checklist.map((c) => c.id)).size ===
              t.checklist.length)) &&
        [
          "none",
          "daily",
          "weekly",
          "monthly",
          "weekdays",
          "custom",
          "month-end",
          "yearly",
        ].includes(String(t.repeat)) &&
        (t.everyDays === undefined || integer(t.everyDays, 1, 365)) &&
        (t.repeat !== "custom" || integer(t.everyDays, 1, 365)) &&
        (t.tags === undefined ||
          (Array.isArray(t.tags) &&
            t.tags.length <= 10 &&
            new Set(t.tags).size === t.tags.length &&
            t.tags.every((tag) => string(tag, 30) && !!String(tag).trim()))) &&
        (t.repeat === "none" || !!t.date) &&
        integer(t.anchorDay, 1, 31) &&
        string(t.series, 150) &&
        typeof t.done === "boolean" &&
        typeof t.reminder === "boolean" &&
        (!t.reminder || (!!t.date && !!t.time)) &&
        integer(t.duration, 0, 1440) &&
        string(t.createdAt, 100),
    )
  )
    throw new Error("Invalid task data.");
  if (
    !collection(
      "habits",
      (h) =>
        string(h.title, 200) &&
        !!String(h.title).trim() &&
        integer(h.target, 1, 10000) &&
        string(h.unit, 50) &&
        validDate(h.createdDate) &&
        (h.reminderTime === undefined || validTime(h.reminderTime)) &&
        (h.reminderInterval === undefined ||
          (object(h.reminderInterval) &&
            integer(h.reminderInterval.minutes, 1, 1440) &&
            typeof h.reminderInterval.start === "string" &&
            !!h.reminderInterval.start &&
            validTime(h.reminderInterval.start) &&
            typeof h.reminderInterval.end === "string" &&
            !!h.reminderInterval.end &&
            validTime(h.reminderInterval.end) &&
            h.reminderInterval.start < h.reminderInterval.end &&
            typeof h.reminderInterval.stopAtTarget === "boolean" &&
            !h.reminderTime)) &&
        Array.isArray(h.days) &&
        h.days.length > 0 &&
        h.days.length <= 7 &&
        h.days.every((d) => integer(d, 0, 6)) &&
        record(h.logs, (k, v) => validDate(k) && integer(v, 0, 10000)),
    )
  )
    throw new Error("Invalid habit data.");
  if (
    !collection(
      "notes",
      (n) =>
        string(n.title, 500) &&
        string(n.body, 500000) &&
        string(n.folder, 100) &&
        typeof n.pinned === "boolean" &&
        string(n.updatedAt, 100),
    )
  )
    throw new Error("Invalid note data.");
  if (
    !collection(
      "transactions",
      (t) =>
        ["income", "expense", "refund", "save", "withdraw"].includes(
          String(t.type),
        ) &&
        integer(t.amount, 1) &&
        expenseCategories.includes(String(t.category)) &&
        validDate(t.date) &&
        string(t.note, 2000) &&
        string(t.method, 50),
    )
  )
    throw new Error("Invalid transaction data.");
  const plansValid = (value: unknown) =>
    record(
      value,
      (k, p) =>
        month(k) &&
        object(p) &&
        integer(p.income) &&
        integer(p.savings) &&
        integer(p.committed) &&
        record(
          p.budgets,
          (c, v) => expenseCategories.includes(c) && integer(v),
        ),
    );
  if (!plansValid(s.plans) || !plansValid(s.planDefaults))
    throw new Error("Invalid budget data.");
  if (
    !object(s.settings) ||
    !string(s.settings.name, 100) ||
    !integer(s.settings.openingBalance, -100000000000) ||
    !integer(s.settings.openingSavings, 0) ||
    !validDate(s.settings.balanceDate) ||
    typeof s.settings.closeToTray !== "boolean" ||
    typeof s.settings.startAtLogin !== "boolean" ||
    typeof s.settings.setupComplete !== "boolean" ||
    !supportedCurrencies.includes(String(s.settings.currency)) ||
    ![0, 1].includes(Number(s.settings.weekStartsOn)) ||
    typeof s.settings.weekStartsOn !== "number" ||
    !object(s.settings.quietHours) ||
    typeof s.settings.quietHours.enabled !== "boolean" ||
    !s.settings.quietHours.start ||
    !validTime(s.settings.quietHours.start) ||
    !s.settings.quietHours.end ||
    !validTime(s.settings.quietHours.end) ||
    (s.settings.quietHours.enabled &&
      s.settings.quietHours.start === s.settings.quietHours.end)
  )
    throw new Error("Invalid settings.");
  validateExtensions(s);
  return s as unknown as State;
}
export function inQuietHours(settings: State["settings"], now = new Date()) {
  const { enabled, start, end } = settings.quietHours;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    enabled &&
    (start < end ? time >= start && time < end : time >= start || time < end)
  );
}
export function renameGroup(
  state: State,
  kind: "taskLists" | "expenseCategories",
  from: string,
  to: string,
): State {
  if (!state[kind].includes(from))
    throw new Error(
      "This item no longer exists. Reopen settings and try again.",
    );
  const name = to.trim();
  if (
    !name ||
    state[kind].some(
      (n) => n !== from && n.toLowerCase() === name.toLowerCase(),
    )
  )
    throw new Error("Choose a unique, non-empty name.");
  const remapPlans = (plans: Record<string, Plan>) =>
    Object.fromEntries(
      Object.entries(plans).map(([month, plan]) => {
        const budgets = { ...plan.budgets };
        if (Object.hasOwn(budgets, from)) {
          budgets[name] = (budgets[name] || 0) + budgets[from];
          delete budgets[from];
        }
        return [month, { ...plan, budgets }];
      }),
    );
  if (name === from) return state;
  return validateState({
    ...state,
    [kind]: state[kind].map((n) => (n === from ? name : n)),
    ...(kind === "taskLists"
      ? {
          tasks: state.tasks.map((t) =>
            t.list === from ? { ...t, list: name } : t,
          ),
        }
      : {
          transactions: state.transactions.map((t) =>
            t.category === from ? { ...t, category: name } : t,
          ),
          ...(state.bills
            ? {
                bills: state.bills.map((b) =>
                  b.category === from ? { ...b, category: name } : b,
                ),
              }
            : {}),
          plans: remapPlans(state.plans),
          planDefaults: remapPlans(state.planDefaults),
        }),
  });
}
export function removeGroup(
  state: State,
  kind: "taskLists" | "expenseCategories",
  from: string,
  replacement: string,
): State {
  if (
    !state[kind].includes(from) ||
    from === replacement ||
    !state[kind].includes(replacement) ||
    state[kind].length < 2
  )
    throw new Error(
      "Choose a different destination before removing this item.",
    );
  // Reassign records and combine category limits without deleting history.
  const withoutDestination = {
    ...state,
    [kind]: state[kind].filter((n) => n !== replacement),
  };
  const moved = renameGroup(withoutDestination, kind, from, replacement);
  return validateState({
    ...moved,
    [kind]: state[kind].filter((n) => n !== from),
  });
}
export function dueTasks(tasks: Task[], now = new Date()) {
  return tasks.filter(
    (t) =>
      !t.done &&
      t.reminder &&
      t.date &&
      t.time &&
      new Date(`${t.date}T${t.time}:00`).getTime() <= now.getTime(),
  );
}
export function reminderKey(task: Task) {
  return `${task.id}|${task.date}|${task.time}`;
}
export function dueHabits(habits: Habit[], now = new Date()) {
  return habits.filter((h) => habitReminderSlot(h, now) !== null);
}
// Use the most recent interval slot, so wake/restart never replays a backlog.
export function habitReminderSlot(
  habit: Habit,
  now = new Date(),
): string | null {
  const today = localDate(now);
  if (!habitScheduled(habit, today)) return null;
  const done = (habit.logs[today] || 0) >= habitProfile(habit, today).target;
  const interval = habit.reminderInterval;
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const current = now.getHours() * 60 + now.getMinutes();
  if (interval) {
    const start = minutes(interval.start),
      end = minutes(interval.end);
    if ((done && interval.stopAtTarget) || current < start || current > end)
      return null;
    const slot =
      start +
      Math.floor((current - start) / interval.minutes) * interval.minutes;
    return `${String(Math.floor(slot / 60)).padStart(2, "0")}:${String(slot % 60).padStart(2, "0")}`;
  }
  return !done && habit.reminderTime && current >= minutes(habit.reminderTime)
    ? habit.reminderTime
    : null;
}
export function habitReminderDescription(habit: Habit) {
  const interval = habit.reminderInterval;
  if (interval) {
    const frequency =
      interval.minutes % 60 === 0
        ? `${interval.minutes / 60} hour${interval.minutes === 60 ? "" : "s"}`
        : `${interval.minutes} minutes`;
    return `Every ${frequency} · ${interval.start}–${interval.end}${interval.stopAtTarget ? " · until target reached" : " · throughout the day"}`;
  }
  return habit.reminderTime
    ? `At ${habit.reminderTime} · until target reached`
    : "Reminders off";
}
export function habitReminderKey(habit: Habit, date: string, slot?: string) {
  const interval = habit.reminderInterval;
  if (interval) {
    if (!slot) throw new Error("Interval reminder needs a scheduled slot.");
    return `habit|${habit.id}|${date}|interval|${interval.minutes}|${interval.start}|${interval.end}|${slot}`;
  }
  return `habit|${habit.id}|${date}|${habit.reminderTime}`;
}
