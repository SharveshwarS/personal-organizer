import { Bell, Check, Clock } from "lucide-react";
import type { State, Task } from "../shared/domain";
import { dueTasks, dueHabits, localDate } from "../shared/domain";
import {
  activeSnooze,
  snoozeReminder,
  completeReminder,
  billReminders,
} from "../shared/features";
import { Button, Empty, type Save } from "./components";
export default function Reminders({
  state,
  save,
  onEdit,
  onFinance,
  now,
}: {
  state: State;
  save: Save;
  onEdit: (t: Task) => void;
  onFinance: () => void;
  now: Date;
}) {
  const due = [
    ...dueTasks(state.tasks, now).map((t) => ({
      id: t.id,
      title: t.title,
      kind: "task" as const,
    })),
    ...dueHabits(state.habits, now).map((h) => ({
      id: h.id,
      title: h.title,
      kind: "habit" as const,
    })),
  ];
  const upcoming = state.tasks
    .filter(
      (t) =>
        !t.done &&
        t.reminder &&
        t.date &&
        t.time &&
        new Date(`${t.date}T${t.time}:00`) > now,
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE SPACE, THEN COME BACK</div>
          <h1>Your reminders</h1>
          <p>Snooze a nudge without changing its original task date or time.</p>
        </div>
        <Bell size={24} />
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Due & snoozed</h2>
        </div>
        {due.map((r) => {
          const snooze = activeSnooze(state, r.kind, r.id, now),
            waiting = snooze && snooze.until > now.getTime();
          return (
            <div className="reminder-card" key={r.kind + r.id}>
              <div>
                <strong>{r.title}</strong>
                <small>
                  {r.kind === "habit" ? "Habit · " + localDate(now) : "Task"}
                  {waiting
                    ? ` · Snoozed until ${new Date(snooze.until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : " · Ready for your attention"}
                </small>
              </div>
              <div className="reminder-actions">
                {[5, 10, 30].map((m) => (
                  <Button
                    key={m}
                    onClick={() =>
                      void save((s) => snoozeReminder(s, r.kind, r.id, m))
                    }
                  >
                    <Clock size={13} />
                    {m} min
                  </Button>
                ))}
                <Button
                  kind="primary"
                  onClick={() =>
                    void save((s) => completeReminder(s, r.kind, r.id))
                  }
                >
                  <Check size={15} />
                  {r.kind === "habit" ? "Reach target" : "Done"}
                </Button>
              </div>
            </div>
          );
        })}
        {!due.length && (
          <Empty
            title="Nothing needs a nudge right now"
            description="Upcoming tasks will appear below. Habit nudges appear when their schedule is due."
          />
        )}
      </section>
      {!!billReminders(state, now).length && (
        <section className="panel">
          <div className="section-heading">
            <h2>Bills to review</h2>
          </div>
          {billReminders(state, now).map((b) => (
            <div className="bill-row" key={b.id}>
              <strong>{b.title}</strong>
              <Button onClick={onFinance}>Review in Finance</Button>
            </div>
          ))}
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>Upcoming task reminders</h2>
        </div>
        {upcoming.slice(0, 30).map((t) => (
          <button
            className="upcoming-reminder"
            key={t.id}
            onClick={() => onEdit(t)}
          >
            <span>{t.title}</span>
            <small>
              {t.date} · {t.time}
            </small>
          </button>
        ))}
        {!upcoming.length && (
          <p className="help">
            Choose a date and time on a task to schedule its Windows reminder.
          </p>
        )}
      </section>
      <p className="help">
        The app must be running and Windows awake to alert. Quiet hours and
        Windows notification preferences apply. Habit snoozes apply to today's
        schedule and stop when its reminder window ends. Interval habits may
        continue after reaching the target when that option is enabled.
      </p>
    </>
  );
}
