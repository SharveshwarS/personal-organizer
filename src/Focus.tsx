import { useEffect, useState } from "react";
import { Play, Pause, Square, Timer, Coffee } from "lucide-react";
import { localDate, uid, type State } from "../shared/domain";
import { pauseFocus, resumeFocus } from "../shared/features";
import { Button, Field, type Save } from "./components";

export default function Focus({ state, save }: { state: State; save: Save }) {
  const [now, setNow] = useState(Date.now()),
    [minutes, setMinutes] = useState(25),
    [taskId, setTask] = useState(""),
    [kind, setKind] = useState<"focus" | "break">("focus"),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sessions = state.focusSessions || [],
    active = sessions.find((s) => ["running", "paused"].includes(s.status));
  const remaining = active
    ? active.status === "paused"
      ? active.remainingMs
      : Math.max(0, active.endsAt - now)
    : minutes * 60000;
  const secs = Math.ceil(remaining / 1000),
    today = sessions.filter(
      (s) =>
        s.status === "completed" &&
        s.kind === "focus" &&
        s.completedDate === localDate(),
    );
  async function start() {
    setBusy(true);
    await save((s) => {
      if (
        s.focusSessions?.some((f) => ["running", "paused"].includes(f.status))
      )
        return s;
      const task = s.tasks.find((t) => t.id === taskId);
      const startedAt = Date.now();
      return {
        ...s,
        focusSessions: [
          ...(s.focusSessions || []),
          {
            id: uid(),
            taskId: task?.id || "",
            title:
              kind === "break"
                ? "A little breathing room"
                : task?.title || "A little focus time",
            kind,
            minutes,
            status: "running",
            startedAt,
            endsAt: startedAt + minutes * 60000,
            remainingMs: minutes * 60000,
          },
        ],
      };
    });
    setBusy(false);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ONE THING, A LITTLE AT A TIME</div>
          <h1>Focus & breathe</h1>
          <p>Your session stays with you while you work elsewhere.</p>
        </div>
        <span className="pill">
          <Timer size={16} />
          {today.reduce((s, f) => s + f.minutes, 0)} minutes today
        </span>
      </div>
      <section className="panel focus-panel">
        <div
          className={`focus-dial ${active?.status === "running" ? "is-running" : ""}`}
        >
          <SproutMark />
          <strong role="timer" aria-label="Time remaining">
            {String(Math.floor(secs / 60)).padStart(2, "0")}:
            {String(secs % 60).padStart(2, "0")}
          </strong>
          <span>
            {active
              ? active.status === "paused"
                ? "Taking a pause"
                : active.kind === "break"
                  ? "Breathe. Stretch. Rest."
                  : "A little room to concentrate"
              : kind === "break"
                ? "A well-earned pause"
                : "Ready when you are"}
          </span>
        </div>
        <h2>{active?.title || "Choose your next small step"}</h2>
        {active ? (
          <div className="focus-actions">
            <Button
              kind="primary"
              onClick={() =>
                void save((s) =>
                  active.status === "running"
                    ? pauseFocus(s, active.id)
                    : resumeFocus(s, active.id),
                )
              }
            >
              {active.status === "running" ? (
                <Pause size={17} />
              ) : (
                <Play size={17} />
              )}{" "}
              {active.status === "running" ? "Pause" : "Resume"}
            </Button>
            <Button
              onClick={() =>
                void save((s) => ({
                  ...s,
                  focusSessions: s.focusSessions?.map((f) =>
                    f.id === active.id ? { ...f, status: "cancelled" } : f,
                  ),
                }))
              }
            >
              <Square size={16} />
              End session
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start();
            }}
          >
            <div className="form-grid">
              <Field label="Session type">
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as "focus" | "break");
                    setMinutes(e.target.value === "break" ? 5 : 25);
                  }}
                >
                  <option value="focus">Focus</option>
                  <option value="break">Break</option>
                </select>
              </Field>
              <Field label="Focus minutes">
                <input
                  type="number"
                  min={1}
                  max={180}
                  required
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </Field>
            </div>
            {kind === "focus" && (
              <Field label="Link a task (optional)">
                <select
                  value={taskId}
                  onChange={(e) => setTask(e.target.value)}
                >
                  <option value="">Free focus</option>
                  {state.tasks
                    .filter((t) => !t.done)
                    .map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Button type="submit" kind="primary" disabled={busy}>
              <Play size={17} />
              Start session
            </Button>
          </form>
        )}
        <p className="help">
          Closing the window keeps the timer running in the tray. Elapsed time
          includes sleep; the app records completion when it resumes. Pause
          before stepping away. Ending early earns no XP. A completed session
          doesn’t complete its linked task.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Your recent sessions</h2>
          <Coffee size={18} />
        </div>
        {sessions
          .filter((s) => s.status === "completed")
          .slice(-8)
          .reverse()
          .map((s) => (
            <div className="session-row" key={s.id}>
              <span>
                {s.title}
                <small>
                  {s.completedDate} · {s.kind}
                </small>
              </span>
              <strong>{s.minutes} min</strong>
            </div>
          ))}
        {!sessions.some((s) => s.status === "completed") && (
          <p className="help">Your first completed session will appear here.</p>
        )}
      </section>
    </>
  );
}
function SproutMark() {
  return (
    <svg width="45" height="42" viewBox="0 0 50 45" aria-hidden="true">
      <path
        d="M25 40V17M25 27Q2 28 5 7Q25 5 25 27M25 20Q45 22 45 3Q25 2 25 20"
        stroke="#98c7a8"
        fill="#426d61"
        strokeWidth="2"
      />
    </svg>
  );
}
