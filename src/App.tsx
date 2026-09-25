import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sun,
  CheckCheck,
  CalendarDays,
  Sprout,
  NotebookPen,
  Wallet,
  Settings as SettingsIcon,
  Search,
  Plus,
  Bell,
  ChevronRight,
  ArrowUpRight,
  Check,
  CloudOff,
  CheckCircle2,
  Target,
  Flame,
  X,
  Inbox,
  ArrowDownLeft,
  ArrowRight,
  Timer,
  Sparkles,
} from "lucide-react";
import { api } from "./api";
import Onboarding from "./Onboarding";
import { WorkspaceContext } from "./WorkspaceContext";
import { APP_VERSION } from "./version";
import {
  type State,
  type Snapshot,
  type Task,
  type Habit,
  type Note,
  type Transaction,
  localDate,
  finance,
  money,
  habitScheduled,
  addDays,
  parseDate,
} from "../shared/domain";
import { Button, SectionHeading, Empty, type Save } from "./components";
import { TaskEditor, TaskRows, TasksView } from "./Tasks";
import Habits, { HabitCheck, HabitEditor } from "./Habits";
import Notes from "./Notes";
import Finance, { TransactionEditor } from "./Finance";
import Calendar, { MiniCalendar } from "./Calendar";
import Settings from "./Settings";
import { ListEditor } from "./Lists";
import Journey, { JourneyStrip } from "./Journey";
import Focus from "./Focus";
import Reminders from "./Reminders";
import {
  journeyXP,
  settleFocus,
  scheduledReminders,
  billReminders,
} from "../shared/features";
type View =
  | "Today"
  | "Tasks"
  | "Calendar"
  | "Habits"
  | "Notes"
  | "Finance"
  | "Settings"
  | "Focus"
  | "Journey"
  | "Reminders";
const navigation = [
  { label: "Today", icon: Sun },
  { label: "Tasks", icon: CheckCheck },
  { label: "Calendar", icon: CalendarDays },
  { label: "Habits", icon: Sprout },
  { label: "Notes", icon: NotebookPen },
  { label: "Finance", icon: Wallet },
  { label: "Focus", icon: Timer },
  { label: "Journey", icon: Sparkles },
] as const;
export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [fatal, setFatal] = useState(""),
    [view, setView] = useState<View>("Today"),
    [filter, setFilter] = useState("All"),
    [list, setList] = useState(""),
    [query, setQuery] = useState(""),
    [selectedDate, setSelectedDate] = useState(localDate()),
    [selectedNote, setSelectedNote] = useState(""),
    [noteDirty, setNoteDirty] = useState(false),
    [clock, setClock] = useState(() => new Date()),
    [taskModal, setTaskModal] = useState<{ task?: Task; date?: string } | null>(
      null,
    ),
    [habitModal, setHabitModal] = useState(false),
    [listModal, setListModal] = useState(false),
    [transactionModal, setTransactionModal] = useState(false),
    [saving, setSaving] = useState(0),
    [toast, setToast] = useState<{
      message: string;
      undo?: () => void;
      error?: boolean;
    } | null>(null);
  const today = localDate(clock);
  const current = useRef<Snapshot | null>(null),
    queue = useRef(Promise.resolve()),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    searchRef = useRef<HTMLInputElement>(null);
  const notify = useCallback(
    (message: string, undo?: () => void, error = false) => {
      clearTimeout(toastTimer.current);
      setToast({ message, undo, error });
      if (!error)
        toastTimer.current = setTimeout(
          () => setToast(null),
          undo ? 12000 : 5500,
        );
    },
    [],
  );
  useEffect(() => {
    void api
      .load()
      .then((value) => {
        current.current = value;
        setSnapshot(value);
      })
      .catch((e) => setFatal((e as Error).message));
    const refreshClock = () => setClock(new Date());
    const timer = setInterval(refreshClock, 15000);
    window.addEventListener("focus", refreshClock);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshClock);
    };
  }, []);
  const save: Save = useCallback(
    (update) =>
      new Promise<boolean>((resolve) => {
        setSaving((n) => n + 1);
        queue.current = queue.current.then(async () => {
          try {
            if (!current.current) throw new Error("Workspace has not loaded.");
            const next = await api.save(
              update(current.current.state),
              current.current.revision,
            );
            const gained =
              journeyXP(next.state) - journeyXP(current.current.state);
            if (gained > 0 && next.state.journey?.celebrations !== false)
              notify(`+${gained} XP · A little growth in your garden ✦`);
            if (next.revision >= current.current.revision) {
              current.current = next;
              setSnapshot(next);
            }
            resolve(true);
          } catch (e) {
            notify(`Could not save: ${(e as Error).message}`, undefined, true);
            resolve(false);
          } finally {
            setSaving((n) => n - 1);
          }
        });
      }),
    [notify],
  );
  useEffect(
    () =>
      api.onChange((next) => {
        if (!current.current || next.revision <= current.current.revision)
          return;
        const gained = journeyXP(next.state) - journeyXP(current.current.state);
        current.current = next;
        setSnapshot(next);
        if (gained > 0 && next.state.journey?.celebrations !== false)
          notify(`Session complete · +${gained} XP for your garden ✦`);
      }),
    [notify],
  );
  useEffect(() => {
    if (api.desktop) return;
    const timer = setInterval(() => {
      if (
        current.current?.state.focusSessions?.some(
          (f) => f.status === "running" && f.endsAt <= Date.now(),
        )
      )
        void save((s) => settleFocus(s));
    }, 1000);
    return () => clearInterval(timer);
  }, [save]);
  const navigate = useCallback(
    (next: View) => {
      if (noteDirty) {
        notify(
          "Your note is still saving. If the save failed, retry before leaving.",
          undefined,
          true,
        );
        return;
      }
      setView(next);
      setQuery("");
    },
    [noteDirty, notify],
  );
  useEffect(
    () =>
      api.onNavigate((id, kind) => {
        if (noteDirty) {
          notify("A reminder is waiting. Finish saving your note to open it.");
          return;
        }
        setView(
          kind === "focus"
            ? "Focus"
            : kind === "bill"
              ? "Finance"
              : kind === "habit"
                ? "Habits"
                : kind === "reminders"
                  ? "Reminders"
                  : "Tasks",
        );
        setQuery("");
        if (["habit", "reminders", "focus", "bill"].includes(kind || ""))
          return;
        const task = current.current?.state.tasks.find((t) => t.id === id);
        if (task) setTaskModal({ task });
      }),
    [noteDirty, notify],
  );
  useEffect(() => {
    function shortcuts(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "n" &&
        !noteDirty &&
        current.current?.state.settings.setupComplete &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        setTaskModal({});
      }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [noteDirty]);
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (noteDirty || saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [noteDirty, saving]);
  const remove = async (
    key: "tasks" | "habits" | "notes" | "transactions",
    item: Task | Habit | Note | Transaction,
  ) => {
    if (
      await save((s) => ({
        ...s,
        [key]: s[key].filter((t) => t.id !== item.id),
      }))
    ) {
      notify("Removed from your organizer.", () => {
        void save((s) =>
          s[key].some((t) => t.id === item.id)
            ? s
            : { ...s, [key]: [...s[key], item] },
        );
        setToast(null);
      });
    }
  };
  async function restore(undo = false) {
    if (saving || noteDirty) {
      notify("Please wait for your changes to save.");
      return;
    }
    try {
      const result = await (undo ? api.undoRestore() : api.importBackup());
      if (result) {
        current.current = result;
        setSnapshot(result);
        setView("Today");
        setSelectedNote("");
        setTaskModal(null);
        setHabitModal(false);
        setTransactionModal(false);
        notify(
          undo
            ? "Previous workspace restored."
            : "Backup restored. Undo is available in Settings.",
        );
      }
    } catch (e) {
      notify((e as Error).message, undefined, true);
    }
  }
  if (fatal)
    return (
      <div className="startup">
        <div className="brand-icon">
          <img src="./icon.svg" alt="" />
        </div>
        <h1>Your data needs attention</h1>
        <p>{fatal}</p>
        <p>The existing workspace has been kept intact.</p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    );
  if (!snapshot)
    return (
      <div className="startup">
        <div className="brand-icon">
          <img src="./icon.svg" alt="" />
        </div>
        <h2>Opening your space…</h2>
      </div>
    );
  if (!snapshot.state.settings.setupComplete)
    return (
      <Onboarding
        state={snapshot.state}
        save={save}
        restore={() => restore()}
        notice={toast?.message}
      />
    );
  const state = snapshot.state;
  const formatMoney = (amount: number) =>
    money(amount, state.settings.currency);
  const month = today.slice(0, 7),
    data = finance(state, month, today),
    openTasks = state.tasks.filter((t) => !t.done),
    dayTasks = state.tasks.filter((t) => t.date === today),
    overdue = openTasks.filter((t) => t.date && t.date < today),
    agenda = [...overdue, ...dayTasks.filter((t) => !t.done)].sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    ),
    habits = state.habits.filter((h) => habitScheduled(h, today)),
    habitsDone = habits.filter((h) => (h.logs[today] || 0) >= h.target).length,
    reminderCount =
      scheduledReminders(state, clock).length +
      billReminders(state, clock).length,
    searchTasks = state.tasks.filter((t) =>
      `${t.title} ${t.notes} ${t.tags?.join(" ") || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    searchNotes = state.notes.filter((n) =>
      `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()),
    );
  const taskProps = {
    save,
    onEdit: (task: Task) => setTaskModal({ task }),
    onDelete: (task: Task) => void remove("tasks", task),
  };
  const addTask = (date?: string) => setTaskModal({ date });
  return (
    <WorkspaceContext.Provider value={state}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <img src="./icon.svg" alt="" />
            </div>
            <div>
              <strong>
                organizer<span>.</span>
              </strong>
              <small>A little more together.</small>
            </div>
          </div>
          <button className="quick-add" onClick={() => addTask()}>
            <Plus size={18} />
            Quick add <kbd>Ctrl N</kbd>
          </button>
          <div className="nav-label">YOUR WORKSPACE</div>
          <nav aria-label="Main navigation">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={`nav-item ${view === label && !query ? "active" : ""}`}
                onClick={() => {
                  navigate(label);
                  if (label === "Tasks") {
                    setList("");
                    setFilter("All");
                  }
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
                {label === "Tasks" && openTasks.length > 0 && (
                  <small>{openTasks.length}</small>
                )}
                {label === "Today" && agenda.length > 0 && (
                  <small>{agenda.length}</small>
                )}
              </button>
            ))}
          </nav>
          <div className="nav-label lists-label">
            <span>MY LISTS</span>
            <button
              className="icon-button"
              aria-label="Add new list"
              title="Add new list"
              disabled={state.taskLists.length >= 100}
              onClick={() => setListModal(true)}
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="sidebar-lists">
            {state.taskLists.map((name) => (
              <button
                key={name}
                className={`list-nav ${view === "Tasks" && list === name ? "selected" : ""}`}
                onClick={() => {
                  navigate("Tasks");
                  setList(name);
                  setFilter("All");
                }}
              >
                <span className={`list-dot ${name.toLowerCase()}`} />
                {name}
                <small>
                  {openTasks.filter((t) => t.list === name).length || ""}
                </small>
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="local-badge">
              <span className="status-dot" />
              <div>
                <strong>
                  {api.desktop ? "Your own little corner" : "Browser preview"}
                </strong>
                <span>
                  {api.desktop
                    ? "Private. Local. Always yours."
                    : "Separate data · No desktop reminders"}
                </span>
              </div>
            </div>
            <button
              className={`nav-item ${view === "Settings" ? "active" : ""}`}
              onClick={() => navigate("Settings")}
            >
              <SettingsIcon size={19} />
              <span>Settings</span>
            </button>
            <div className="profile">
              <div className="avatar">
                {state.settings.name
                  ? state.settings.name[0].toUpperCase()
                  : "Y"}
              </div>
              <div>
                <strong>{state.settings.name || "Your personal space"}</strong>
                <small>Personal workspace</small>
              </div>
              <span className="version">v{APP_VERSION}</span>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              My workspace <ChevronRight size={14} />
              <strong>{query ? "Search" : view}</strong>
            </div>
            <div className="topbar-right">
              <div className="global-search">
                <Search size={16} />
                <input
                  ref={searchRef}
                  aria-label="Search tasks and notes"
                  disabled={noteDirty}
                  placeholder="Search anything…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>Ctrl K</kbd>
              </div>
              <span className="save-indicator">
                <span className={`status-dot ${saving ? "working" : ""}`} />
                {saving ? "Saving…" : api.desktop ? "Saved locally" : "Preview"}
              </span>
              <button
                className={`notification-button icon-button ${reminderCount ? "has-reminders" : ""}`}
                aria-label={`Reminders${reminderCount ? `, ${reminderCount} waiting` : ""}`}
                onClick={() => navigate("Reminders")}
              >
                <Bell size={19} />
              </button>
            </div>
          </header>
          <main>
            {query ? (
              <>
                <div className="page-heading">
                  <div className="eyebrow">FIND SOMETHING GOOD</div>
                  <h1>Results for “{query}”</h1>
                </div>
                <section className="panel">
                  <SectionHeading title={`Tasks · ${searchTasks.length}`} />
                  <TaskRows tasks={searchTasks} {...taskProps} />
                  {!searchTasks.length && (
                    <p className="muted padded">No matching tasks.</p>
                  )}
                </section>
                <section className="panel">
                  <SectionHeading title={`Notes · ${searchNotes.length}`} />
                  {searchNotes.map((n) => (
                    <button
                      className="search-note"
                      key={n.id}
                      onClick={() => {
                        setSelectedNote(n.id);
                        navigate("Notes");
                      }}
                    >
                      <NotebookPen size={20} />
                      <div>
                        <strong>{n.title || "Untitled note"}</strong>
                        <p>{n.body.slice(0, 120)}</p>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  {!searchNotes.length && (
                    <p className="muted padded">No matching notes.</p>
                  )}
                </section>
              </>
            ) : view === "Today" ? (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {parseDate(today)
                        .toLocaleDateString(undefined, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                        .toUpperCase()}
                    </div>
                    <h1>
                      A fresh day, a little more clarity
                      <span className="purple">.</span>
                    </h1>
                    <p>
                      {state.settings.name
                        ? `${state.settings.name}, here's`
                        : "Here’s"}{" "}
                      your space to plan, progress, and find your balance.
                    </p>
                  </div>
                  <Button kind="primary" onClick={() => addTask(today)}>
                    <Plus size={17} />
                    New task
                  </Button>
                </div>
                <div className="today-banner">
                  <div>
                    <span className="pill">
                      <Sun size={14} />
                      ONE THING AT A TIME
                    </span>
                    <h2>
                      You don’t have to do it all.
                      <br />
                      Just the next right thing.
                    </h2>
                    <p>
                      {agenda.length
                        ? `${agenda.length} task${agenda.length === 1 ? "" : "s"} waiting for your attention. You've got this.`
                        : "A clear day is a good place to begin. Add something that matters."}
                    </p>
                    <button
                      className="banner-link"
                      onClick={() => addTask(today)}
                    >
                      Make a little plan <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="orbit-art" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="orbit-center">
                      <Check size={44} />
                    </div>
                    <span className="orbit-dot dot-one" />
                    <span className="orbit-dot dot-two" />
                    <span className="orbit-star">✦</span>
                    <span className="orbit-small-star">✦</span>
                  </div>
                </div>
                <JourneyStrip
                  state={state}
                  onOpen={() => navigate("Journey")}
                />
                <div className="stat-grid">
                  <div className="stat-card">
                    <span className="stat-label">
                      <CheckCircle2 size={17} />
                      Today's tasks
                    </span>
                    <div className="stat-value">
                      <strong>
                        {dayTasks.filter((t) => t.done).length}
                        <small> / {dayTasks.length}</small>
                      </strong>
                      <span className="stat-caption">completed</span>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width: `${dayTasks.length ? (dayTasks.filter((t) => t.done).length / dayTasks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">
                      <Flame size={17} />
                      Daily habits
                    </span>
                    <div className="stat-value">
                      <strong>
                        {habitsDone}
                        <small> / {habits.length}</small>
                      </strong>
                      <span className="stat-caption">checked in</span>
                    </div>
                    <div className="progress green-progress">
                      <span
                        style={{
                          width: `${habits.length ? (habitsDone / habits.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">
                      <ArrowUpRight size={17} />
                      Spent this month
                    </span>
                    <strong>{formatMoney(data.expenses)}</strong>
                    <small>
                      of{" "}
                      {formatMoney(
                        Math.max(0, data.plan.income - data.plan.savings),
                      )}{" "}
                      planned allowance
                    </small>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">
                      <Wallet size={17} />
                      Monthly surplus
                    </span>
                    <strong className={data.surplus < 0 ? "red" : "green"}>
                      {formatMoney(data.surplus)}
                    </strong>
                    <small>Based on income actually received</small>
                  </div>
                </div>
                <div className="today-columns">
                  <div className="today-main">
                    <section className="panel">
                      <SectionHeading
                        title="On your list"
                        subtitle={
                          overdue.length
                            ? `${overdue.length} overdue · let's make a little progress`
                            : "A little structure for your day"
                        }
                        action="All tasks"
                        onAction={() => {
                          navigate("Tasks");
                          setList("");
                          setFilter("All");
                        }}
                      />
                      {agenda.length ? (
                        <TaskRows tasks={agenda.slice(0, 6)} {...taskProps} />
                      ) : (
                        <Empty
                          title="What matters today?"
                          description="Add one small task. The rest can follow."
                          action={() => addTask(today)}
                          label="Plan your first task"
                          icon={<CheckCheck size={26} />}
                        />
                      )}
                      <button
                        className="panel-add"
                        onClick={() => addTask(today)}
                      >
                        <Plus size={16} />
                        Add a task for today
                      </button>
                    </section>
                    <section className="panel">
                      <SectionHeading
                        title="Small steps, every day"
                        subtitle="Show up for yourself"
                        action="All habits"
                        onAction={() => navigate("Habits")}
                      />
                      {habits.length ? (
                        habits.map((h) => (
                          <HabitCheck
                            key={h.id}
                            habit={h}
                            date={today}
                            save={save}
                          />
                        ))
                      ) : (
                        <div className="inline-empty">
                          <div className="habit-glyph">
                            <Sprout size={21} />
                          </div>
                          <div>
                            <strong>
                              {state.habits.length
                                ? "A day to take it easy"
                                : "Good things grow with practice."}
                            </strong>
                            <p>
                              {state.habits.length
                                ? "No habits scheduled for today."
                                : "Start a habit you’d like to keep."}
                            </p>
                          </div>
                          <Button onClick={() => setHabitModal(true)}>
                            <Plus size={15} />
                            Add habit
                          </Button>
                        </div>
                      )}
                    </section>
                  </div>
                  <aside className="today-side">
                    <MiniCalendar
                      onPick={(date) => {
                        setSelectedDate(date);
                        navigate("Calendar");
                      }}
                    />
                    <section className="panel money-preview">
                      <div className="section-heading">
                        <span className="stat-label">
                          <Wallet size={17} />
                          Your month in balance
                        </span>
                        <ArrowUpRight size={17} />
                      </div>
                      <p className="muted">Planned daily allowance</p>
                      <strong>
                        {formatMoney(data.daily)}
                        <small> / day</small>
                      </strong>
                      <p>
                        After your {formatMoney(data.plan.savings)} savings
                        target.
                      </p>
                      <div className="balance-row">
                        <span>Income received</span>
                        <span>{formatMoney(data.income)}</span>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("Finance")}
                      >
                        Take a closer look <ArrowRight size={15} />
                      </button>
                    </section>
                  </aside>
                </div>
                <div className="page-footnote">
                  <CloudOff size={14} />A little more organized. Entirely on
                  your device.
                </div>
              </>
            ) : view === "Tasks" ? (
              <TasksView
                state={state}
                {...taskProps}
                onAdd={() => addTask()}
                filter={filter}
                setFilter={setFilter}
                list={list}
              />
            ) : view === "Calendar" ? (
              <Calendar
                state={state}
                {...taskProps}
                onAdd={addTask}
                selected={selectedDate}
                setSelected={setSelectedDate}
              />
            ) : view === "Habits" ? (
              <Habits
                state={state}
                save={save}
                onDelete={(h) => void remove("habits", h)}
              />
            ) : view === "Notes" ? (
              <Notes
                state={state}
                save={save}
                onDelete={(n) => void remove("notes", n)}
                selectedId={selectedNote}
                setSelectedId={setSelectedNote}
                onDraftState={setNoteDirty}
                dirty={noteDirty}
              />
            ) : view === "Finance" ? (
              <Finance
                state={state}
                save={save}
                onDelete={(t) => void remove("transactions", t)}
                add={transactionModal}
                onAdd={() => setTransactionModal(true)}
                onCloseAdd={() => setTransactionModal(false)}
              />
            ) : view === "Focus" ? (
              <Focus state={state} save={save} />
            ) : view === "Journey" ? (
              <Journey
                state={state}
                save={save}
                onFocus={() => navigate("Focus")}
              />
            ) : view === "Settings" ? (
              <Settings
                key={
                  snapshot.state.settings.balanceDate +
                  snapshot.state.settings.openingBalance +
                  snapshot.state.settings.openingSavings
                }
                state={state}
                save={save}
                restore={restore}
                notify={notify}
              />
            ) : (
              <Reminders
                state={state}
                save={save}
                onEdit={(t) => setTaskModal({ task: t })}
                onFinance={() => navigate("Finance")}
                now={clock}
              />
            )}
          </main>
        </div>
        {listModal && (
          <ListEditor
            save={save}
            onClose={() => setListModal(false)}
            onCreated={(name) => {
              setListModal(false);
              notify(`List "${name}" created.`);
              if (!noteDirty) {
                navigate("Tasks");
                setList(name);
                setFilter("All");
              }
            }}
          />
        )}
        {taskModal && (
          <TaskEditor
            list={view === "Tasks" ? list : undefined}
            task={taskModal.task}
            date={taskModal.date}
            save={save}
            onClose={() => setTaskModal(null)}
          />
        )}{" "}
        {habitModal && (
          <HabitEditor save={save} onClose={() => setHabitModal(false)} />
        )}{" "}
        {transactionModal && view !== "Finance" && (
          <TransactionEditor
            save={save}
            onClose={() => setTransactionModal(false)}
          />
        )}{" "}
        {toast && (
          <div
            className={`toast ${toast.error ? "error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            <span>
              {toast.error ? <Bell size={17} /> : <Check size={17} />}
            </span>
            <p>{toast.message}</p>
            {toast.undo && <button onClick={toast.undo}>Undo</button>}
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
