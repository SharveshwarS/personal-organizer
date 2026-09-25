import { useState } from "react";
import { useWorkspace } from "./WorkspaceContext";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  type State,
  type Task,
  localDate,
  parseDate,
  monthShift,
  addDays,
} from "../shared/domain";
import { Button, Empty, type Save } from "./components";
import { TaskRows } from "./Tasks";
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function monthDays(month: string, weekStartsOn = 1) {
  const first = `${month}-01`,
    start = addDays(first, -((parseDate(first).getDay() - weekStartsOn + 7) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function MiniCalendar({ onPick }: { onPick: (date: string) => void }) {
  const { settings: { weekStartsOn } } = useWorkspace();
  const today = localDate(),
    [month, setMonth] = useState(today.slice(0, 7));
  return (
    <section className="panel mini-calendar">
      <div className="section-heading">
        <h2>
          {parseDate(`${month}-01`).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="row-actions">
          <button
            className="icon-button"
            aria-label="Previous calendar month"
            onClick={() => setMonth(monthShift(month, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Next calendar month"
            onClick={() => setMonth(monthShift(month, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="mini-grid">
        {Array.from({ length: 7 }, (_, i) => weekdayNames[(i + weekStartsOn) % 7]).map((d, i) => (
          <span key={i} title={d}>{d.slice(0, 1)}</span>
        ))}
        {monthDays(month, weekStartsOn).map((d) => (
          <button
            key={d}
            className={`${d === today ? "today" : ""} ${d.slice(0, 7) !== month ? "outside" : ""}`}
            aria-label={`View ${d}`}
            onClick={() => onPick(d)}
          >
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
    </section>
  );
}
export default function Calendar({
  state,
  save,
  onEdit,
  onDelete,
  onAdd,
  selected,
  setSelected,
}: {
  state: State;
  save: Save;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onAdd: (date: string) => void;
  selected: string;
  setSelected: (v: string) => void;
}) {
  const [view, setView] = useState("Month"),
    month = selected.slice(0, 7),
    today = localDate();
  const weekStart = addDays(
    selected,
    -((parseDate(selected).getDay() - state.settings.weekStartsOn + 7) % 7),
  );
  const days =
    view === "Month"
      ? monthDays(month, state.settings.weekStartsOn)
      : Array.from({ length: view === "Week" ? 7 : 1 }, (_, i) =>
          addDays(weekStart, i),
        );
  const tasks = state.tasks
    .filter((t) => t.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GIVE YOUR PLANS A PLACE</div>
          <h1>A little perspective.</h1>
          <p>Make time for what matters. Drag a task to move it.</p>
        </div>
        <Button kind="primary" onClick={() => onAdd(selected)}>
          <Plus size={17} />
          Schedule task
        </Button>
      </div>
      <div className="toolbar">
        <div className="month-nav">
          <button
            className="icon-button"
            aria-label="Previous period"
            onClick={() =>
              setSelected(
                view === "Month"
                  ? `${monthShift(month, -1)}-01`
                  : addDays(selected, view === "Week" ? -7 : -1),
              )
            }
          >
            <ChevronLeft size={18} />
          </button>
          <strong>
            {parseDate(selected).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
              ...(view !== "Month" ? { day: "numeric" } : {}),
            })}
          </strong>
          <button
            className="icon-button"
            aria-label="Next period"
            onClick={() =>
              setSelected(
                view === "Month"
                  ? `${monthShift(month, 1)}-01`
                  : addDays(selected, view === "Week" ? 7 : 1),
              )
            }
          >
            <ChevronRight size={18} />
          </button>
          <button className="text-button" onClick={() => setSelected(today)}>
            Today
          </button>
        </div>
        <div className="segmented">
          {["Month", "Week", "Agenda"].map((v) => (
            <button
              key={v}
              className={v === view ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view !== "Agenda" && (
        <section
          className={`panel calendar-panel ${view === "Week" ? "week-view" : ""}`}
        >
          <div className="calendar-weekdays">
            {Array.from({ length: 7 }, (_, i) => weekdayNames[(i + state.settings.weekStartsOn) % 7]).map((d) => (
              <span key={d}>{d.slice(0, 3)}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((date) => (
              <div
                key={date}
                className={`calendar-cell ${date.slice(0, 7) !== month ? "outside" : ""} ${selected === date ? "selected" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  void save((s) => ({
                    ...s,
                    tasks: s.tasks.map((t) =>
                      t.id === id
                        ? { ...t, date, anchorDay: Number(date.slice(8)) }
                        : t,
                    ),
                  }));
                }}
              >
                <button
                  className={`day-number ${date === today ? "today" : ""}`}
                  aria-label={`Select ${date}`}
                  onClick={() => setSelected(date)}
                >
                  {Number(date.slice(8))}
                </button>
                {state.tasks
                  .filter((t) => t.date === date)
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .slice(0, view === "Week" ? 20 : 3)
                  .map((t) => (
                    <button
                      key={t.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", t.id)
                      }
                      className={`calendar-task ${t.done ? "completed" : ""} ${t.priority}`}
                      onClick={() => onEdit(t)}
                      title={`${t.time} ${t.title}${t.duration ? ` · ${t.duration} min` : ""}`}
                    >
                      {t.time && <span>{t.time}</span>}
                      {t.title}
                    </button>
                  ))}
                {view === "Month" &&
                  state.tasks.filter((t) => t.date === date).length > 3 && (
                    <button
                      className="text-button more-tasks"
                      onClick={() => setSelected(date)}
                    >
                      +{state.tasks.filter((t) => t.date === date).length - 3}{" "}
                      more
                    </button>
                  )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>
            {parseDate(selected).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <span className="muted">{tasks.length} scheduled</span>
        </div>
        {tasks.length ? (
          <TaskRows
            tasks={tasks}
            save={save}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <Empty
            title="An open page in your calendar"
            description="Add a task to make a little time for your next priority."
            action={() => onAdd(selected)}
            label="Plan something"
          />
        )}
      </section>
    </>
  );
}
