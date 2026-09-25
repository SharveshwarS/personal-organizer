import { useState } from "react";
import {
  Flame,
  Plus,
  Trash2,
  Check,
  Sprout,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import {
  type State,
  type Habit,
  uid,
  localDate,
  addDays,
  habitScheduled,
  habitStreak,
  parseDate,
  habitReminderDescription,
  habitProfile,
  editHabitSchedule,
} from "../shared/domain";
import { setHabitPause, resumeHabit } from "../shared/features";
import { Button, Modal, Field, Empty, type Save } from "./components";
const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const units = [
  "times",
  "minutes",
  "hours",
  "glasses",
  "pages",
  "steps",
  "kilometers",
  "repetitions",
  "sessions",
];
export function HabitEditor({
  onClose,
  save,
  habit: existing,
}: {
  onClose: () => void;
  save: Save;
  habit?: Habit;
}) {
  const [title, setTitle] = useState(existing?.title || ""),
    [pauseUntil, setPauseUntil] = useState(
      existing?.pauses?.find(
        (p) => p.from <= localDate() && p.until >= localDate(),
      )?.until || "",
    ),
    [target, setTarget] = useState(existing?.target || 1),
    [unit, setUnit] = useState(existing?.unit || "times"),
    [customUnit, setCustomUnit] = useState(
      !!existing?.unit && !units.includes(existing.unit),
    ),
    [days, setDays] = useState(existing?.days || [0, 1, 2, 3, 4, 5, 6]),
    [reminderTime, setReminderTime] = useState(existing?.reminderTime || ""),
    [reminderMode, setReminderMode] = useState<"off" | "daily" | "interval">(
      existing?.reminderInterval
        ? "interval"
        : existing?.reminderTime
          ? "daily"
          : "off",
    ),
    [intervalAmount, setIntervalAmount] = useState(
      existing?.reminderInterval
        ? existing.reminderInterval.minutes % 60 === 0
          ? existing.reminderInterval.minutes / 60
          : existing.reminderInterval.minutes
        : 2,
    ),
    [intervalUnit, setIntervalUnit] = useState(
      existing?.reminderInterval && existing.reminderInterval.minutes % 60 !== 0
        ? "minutes"
        : "hours",
    ),
    [start, setStart] = useState(existing?.reminderInterval?.start || "08:00"),
    [end, setEnd] = useState(existing?.reminderInterval?.end || "22:00"),
    [stopAtTarget, setStopAtTarget] = useState(
      existing?.reminderInterval?.stopAtTarget ?? false,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={existing ? "Edit your habit" : "Build a small, good habit"}
      onClose={() => !busy && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (!title.trim() || !unit.trim() || !days.length) {
            setError("Enter a name, unit, and at least one weekday.");
            return;
          }
          const minutes = intervalAmount * (intervalUnit === "hours" ? 60 : 1);
          if (reminderMode === "daily" && !reminderTime) {
            setError("Choose a reminder time.");
            return;
          }
          if (
            reminderMode === "interval" &&
            (!Number.isInteger(minutes) ||
              minutes < 1 ||
              minutes > 1440 ||
              !start ||
              !end ||
              start >= end)
          ) {
            setError(
              "Choose an interval from 1 minute to 24 hours and an end time later than the start time.",
            );
            return;
          }
          setBusy(true);
          const habit: Habit = {
            id: existing?.id || uid(),
            title: title.trim(),
            target,
            unit: unit.trim(),
            days,
            logs: existing?.logs || {},
            createdDate: existing?.createdDate || localDate(),
            reminderTime: reminderMode === "daily" ? reminderTime : "",
            ...(reminderMode === "interval"
              ? { reminderInterval: { minutes, start, end, stopAtTarget } }
              : {}),
          };
          if (
            await save((s) => ({
              ...s,
              habits: existing
                ? s.habits.map((h) => {
                    if (h.id !== existing.id) return h;
                    const updated = resumeHabit(
                      editHabitSchedule(h, { ...habit, logs: h.logs }),
                    );
                    return pauseUntil
                      ? setHabitPause(updated, localDate(), pauseUntil)
                      : updated;
                  })
                : [...s.habits, habit],
            }))
          )
            onClose();
          else setError("Your habit could not be saved. Please try again.");
          setBusy(false);
        }}
      >
        <fieldset disabled={busy}>
          <Field label="Habit name">
            <input
              autoFocus
              required
              maxLength={200}
              placeholder="Read a few pages"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Daily target">
              <input
                type="number"
                required
                min="1"
                max="10000"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </Field>
            <Field label="Unit">
              <select
                value={customUnit ? "custom" : unit}
                onChange={(e) => {
                  setCustomUnit(e.target.value === "custom");
                  setUnit(e.target.value === "custom" ? "" : e.target.value);
                }}
              >
                {units.map((value) => (
                  <option key={value} value={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
                <option value="custom">Custom unit…</option>
              </select>
            </Field>
          </div>
          {customUnit && (
            <Field label="Custom unit">
              <input
                required
                maxLength={50}
                value={unit}
                placeholder="For example, stretches"
                onChange={(e) => setUnit(e.target.value)}
              />
            </Field>
          )}
          <p className="help">
            The unit measures progress. Choose how often Windows reminds you
            below.
          </p>
          <div className="field">
            <span>Repeat on</span>
            <div className="week-picker">
              {week.map((day, i) => (
                <button
                  type="button"
                  key={day}
                  aria-pressed={days.includes(i)}
                  className={days.includes(i) ? "selected" : ""}
                  onClick={() =>
                    setDays((v) =>
                      v.includes(i) ? v.filter((d) => d !== i) : [...v, i],
                    )
                  }
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <Field label="Windows reminders">
            <select
              value={reminderMode}
              onChange={(e) =>
                setReminderMode(e.target.value as "off" | "daily" | "interval")
              }
            >
              <option value="off">Off</option>
              <option value="daily">Once a day at a set time</option>
              <option value="interval">
                Interval — every few minutes or hours
              </option>
            </select>
          </Field>
          {reminderMode === "daily" && (
            <>
              <Field label="Reminder time">
                <input
                  type="time"
                  required
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </Field>
              <p className="help">
                One Windows reminder on each selected day if your daily target
                is unfinished.
              </p>
            </>
          )}
          {reminderMode === "interval" && (
            <>
              <div className="form-grid">
                <Field label="Remind me every">
                  <input
                    type="number"
                    required
                    min={1}
                    max={intervalUnit === "hours" ? 24 : 1440}
                    step={1}
                    value={intervalAmount}
                    onChange={(e) => setIntervalAmount(Number(e.target.value))}
                  />
                </Field>
                <Field label="Interval unit">
                  <select
                    value={intervalUnit}
                    onChange={(e) => setIntervalUnit(e.target.value)}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </Field>
              </div>
              <div className="form-grid">
                <Field label="First reminder">
                  <input
                    type="time"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </Field>
                <Field label="Remind until">
                  <input
                    type="time"
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </Field>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={stopAtTarget}
                  onChange={(e) => setStopAtTarget(e.target.checked)}
                />
                Stop reminders when today's target is reached
              </label>
              <p className="help">
                For example: every 2 hours from 08:00 until 22:00 alerts at
                08:00, 10:00, 12:00, and so on. The time range stays within one
                day. Only selected weekdays apply.
              </p>
              <p className="help">
                After sleep or quiet hours, only the latest due interval is
                considered. Earlier intervals are not replayed. No interval
                alerts are sent outside this time range.
              </p>
            </>
          )}
          {reminderMode !== "off" && (
            <p className="help">
              Windows notifications follow this schedule while the desktop app
              is open or in the tray. Quiet hours and Windows Do Not Disturb may
              delay or silence alerts. A sleeping or powered-off PC cannot alert
              you.
            </p>
          )}
          <p className="help">
            Days off do not break your streak. You can correct past check-ins in
            the tracker.
          </p>
          {existing && (
            <>
              <Field label="Pause habit through (optional)">
                <input
                  type="date"
                  min={localDate()}
                  max="2200-12-31"
                  value={pauseUntil}
                  onChange={(e) => setPauseUntil(e.target.value)}
                />
              </Field>
              <p className="help">
                Paused days have no reminders and do not break streaks. Clear
                this date to resume today. Target, unit and weekday changes
                apply from today; earlier progress keeps its original schedule.
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              kind="primary"
              type="submit"
              disabled={busy || !days.length}
            >
              {busy ? "Saving…" : existing ? "Save habit" : "Create habit"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
export function HabitCheck({
  habit,
  date,
  save,
}: {
  habit: Habit;
  date: string;
  save: Save;
}) {
  const profile = habitProfile(habit, date),
    value = habit.logs[date] || 0,
    done = value >= profile.target;
  return (
    <div className="habit-check">
      <div className={`habit-glyph ${done ? "success" : ""}`}>
        <Sprout size={19} />
      </div>
      <div className="grow">
        <strong>{habit.title}</strong>
        <span>{`${value} / ${profile.target} ${profile.unit}`}</span>
      </div>
      <button
        className={`habit-action ${done ? "done" : ""}`}
        aria-label={`${done ? "Reset" : "Log"} ${habit.title}`}
        onClick={() =>
          void save((s) => ({
            ...s,
            habits: s.habits.map((h) =>
              h.id === habit.id
                ? {
                    ...h,
                    logs: {
                      ...h.logs,
                      [date]: done
                        ? 0
                        : Math.min(
                            habitProfile(h, date).target,
                            (h.logs[date] || 0) + 1,
                          ),
                    },
                  }
                : h,
            ),
          }))
        }
      >
        {done ? <Check size={17} /> : <Plus size={17} />}
      </button>
    </div>
  );
}
export default function Habits({
  state,
  save,
  onDelete,
}: {
  state: State;
  save: Save;
  onDelete: (h: Habit) => void;
}) {
  const [adding, setAdding] = useState(false),
    [editingHabit, setEditingHabit] = useState<Habit | null>(null),
    [date, setDate] = useState(localDate()),
    [editing, setEditing] = useState<{ id: string; value: number } | null>(
      null,
    );
  const today = localDate(),
    days = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSISTENCY OVER PERFECTION</div>
          <h1>Little habits. Big changes.</h1>
          <p>Your progress, one day at a time.</p>
        </div>
        <Button kind="primary" onClick={() => setAdding(true)}>
          <Plus size={17} />
          New habit
        </Button>
      </div>
      <div className="toolbar">
        <div className="month-nav">
          <button
            aria-label="Previous day"
            className="icon-button"
            onClick={() => setDate(addDays(date, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <input
            aria-label="Check-in date"
            type="date"
            value={date}
            max={today}
            min="1900-01-01"
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button
            aria-label="Next day"
            className="icon-button"
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="muted">
          {date === today
            ? "Today"
            : parseDate(date).toLocaleDateString(undefined, {
                dateStyle: "long",
              })}
        </span>
      </div>
      {!state.habits.length ? (
        <section className="panel">
          <Empty
            title="Start small. Keep showing up."
            description="Reading, walking, learning, or simply logging your expenses. Make space for a routine that matters to you."
            action={() => setAdding(true)}
            label="Create your first habit"
            icon={<Sprout size={28} />}
          />
        </section>
      ) : (
        <div className="habit-grid">
          {state.habits.map((h) => {
            const completed = days.filter(
                (d) =>
                  habitScheduled(h, d) &&
                  (h.logs[d] || 0) >= habitProfile(h, d).target,
              ).length,
              scheduled = days.filter((d) => habitScheduled(h, d)).length;
            return (
              <section className="panel habit-card" key={h.id}>
                <div className="section-heading">
                  <span className="pill">
                    <Flame size={14} />
                    {habitStreak(h, today)} day streak
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Edit habit ${h.title}`}
                    onClick={() => setEditingHabit(h)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${h.title}`}
                    onClick={() => onDelete(h)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {habitScheduled(h, date) ? (
                  <HabitCheck habit={h} date={date} save={save} />
                ) : (
                  <div className="habit-check">
                    <div className="habit-glyph">
                      <Sprout size={19} />
                    </div>
                    <div>
                      <strong>{h.title}</strong>
                      <p className="muted">
                        {h.pauses?.some(
                          (p) => p.from <= date && p.until >= date,
                        )
                          ? "Paused · a little time to rest"
                          : "Not scheduled on this day"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="heatmap">
                  {days.map((d) => (
                    <button
                      key={d}
                      disabled={!habitScheduled(h, d)}
                      className={
                        (h.logs[d] || 0) >= habitProfile(h, d).target
                          ? "done"
                          : (h.logs[d] || 0) > 0
                            ? "partial"
                            : ""
                      }
                      title={`${d}: ${h.logs[d] || 0}/${habitProfile(h, d).target} ${habitProfile(h, d).unit}`}
                      aria-label={`Edit ${h.title} on ${d}`}
                      onClick={() => {
                        setDate(d);
                        setEditing({ id: h.id, value: h.logs[d] || 0 });
                      }}
                    />
                  ))}
                </div>
                <div className="habit-footer">
                  <span>Last 28 days</span>
                  <strong>
                    {scheduled ? Math.round((completed / scheduled) * 100) : 0}%
                    complete
                  </strong>
                </div>
                <p className="help">{habitReminderDescription(h)}</p>
                {!!h.history?.length && (
                  <details className="habit-history">
                    <summary>Target & schedule history</summary>
                    {h.history.map((p) => (
                      <p key={p.from}>
                        From {p.from}: {p.target} {p.unit} ·{" "}
                        {p.days.map((d) => week[d]).join(", ")}
                      </p>
                    ))}
                  </details>
                )}
                {habitScheduled(h, date) &&
                  habitProfile(h, date).target > 1 && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setEditing({ id: h.id, value: h.logs[date] || 0 })
                      }
                    >
                      Set today's count
                    </button>
                  )}
              </section>
            );
          })}
        </div>
      )}
      {adding && <HabitEditor save={save} onClose={() => setAdding(false)} />}
      {editingHabit && (
        <HabitEditor
          habit={editingHabit}
          save={save}
          onClose={() => setEditingHabit(null)}
        />
      )}
      {editing && (
        <Modal title={`Check-in · ${date}`} onClose={() => setEditing(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await save((s) => ({
                  ...s,
                  habits: s.habits.map((h) =>
                    h.id === editing.id
                      ? { ...h, logs: { ...h.logs, [date]: editing.value } }
                      : h,
                  ),
                }))
              )
                setEditing(null);
            }}
          >
            <Field label="Completed amount">
              <input
                type="number"
                min="0"
                max="10000"
                value={editing.value}
                onChange={(e) =>
                  setEditing({ ...editing, value: Number(e.target.value) })
                }
              />
            </Field>
            <div className="modal-footer">
              <Button kind="primary" type="submit">
                Save check-in
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
