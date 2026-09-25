import { useState } from "react";
import { useWorkspace } from "./WorkspaceContext";
import {
  Check,
  Trash2,
  Repeat2,
  Bell,
  CalendarDays,
  Clock,
  Plus,
} from "lucide-react";
import {
  type Task,
  type State,
  uid,
  localDate,
  toggleTask,
  parseDate,
} from "../shared/domain";
import { Modal, Field, Button, Empty, type Save } from "./components";
export function TaskEditor({
  task,
  date,
  list,
  onClose,
  save,
}: {
  task?: Task;
  date?: string;
  list?: string;
  onClose: () => void;
  save: Save;
}) {
  const { taskLists } = useWorkspace();
  const [checklistTitle, setChecklistTitle] = useState("");
  const [tagsText, setTagsText] = useState(task?.tags?.join(", ") || "");
  const [draft, setDraft] = useState<Task>(
    () =>
      task || {
        id: uid(),
        title: "",
        notes: "",
        date: date || "",
        time: "",
        priority: "medium",
        list: list && taskLists.includes(list) ? list : taskLists[0],
        repeat: "none",
        anchorDay: 1,
        series: "",
        done: false,
        reminder: false,
        duration: 30,
        createdAt: new Date().toISOString(),
      },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function change<K extends keyof Task>(key: K, value: Task[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function addStep() {
    if (!checklistTitle.trim() || (draft.checklist?.length || 0) >= 100) return;
    change("checklist", [
      ...(draft.checklist || []),
      { id: uid(), title: checklistTitle.trim(), done: false },
    ]);
    setChecklistTitle("");
  }
  return (
    <Modal
      title={task ? "Edit task" : "A little plan goes a long way"}
      onClose={() => !busy && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.title.trim()) return setError("Give your task a title.");
          const tags = [
            ...new Set(
              tagsText
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean),
            ),
          ];
          if (tags.length > 10 || tags.some((t) => t.length > 30))
            return setError("Use up to 10 tags, each 30 characters or fewer.");
          if ((draft.repeat !== "none" || draft.time) && !draft.date)
            return setError("Choose a date for scheduled or recurring tasks.");
          if (draft.reminder && (!draft.date || !draft.time))
            return setError("Choose a date and time for the reminder.");
          setBusy(true);
          const item = {
            ...draft,
            title: draft.title.trim(),
            tags,
            series: draft.series || draft.id,
            anchorDay:
              task && task.date === draft.date
                ? task.anchorDay
                : draft.date
                  ? Number(draft.date.slice(8))
                  : 1,
          };
          if (
            await save((s) => ({
              ...s,
              tasks: task
                ? s.tasks.map((t) => (t.id === task.id ? item : t))
                : [...s.tasks, item],
            }))
          )
            onClose();
          setBusy(false);
        }}
      >
        <fieldset disabled={busy}>
          <Field label="Task title">
            <input
              autoFocus
              required
              maxLength={500}
              placeholder="What would you like to get done?"
              value={draft.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Date">
              <input
                type="date"
                min="1900-01-01"
                max="2200-12-31"
                value={draft.date}
                onChange={(e) => change("date", e.target.value)}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={draft.time}
                onChange={(e) => {
                  const time = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    time,
                    reminder: !!time,
                    date: time ? d.date || localDate() : d.date,
                  }));
                }}
              />
            </Field>
            <Field label="List">
              <select
                value={draft.list}
                onChange={(e) => change("list", e.target.value)}
              >
                {taskLists.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={draft.priority}
                onChange={(e) =>
                  change("priority", e.target.value as Task["priority"])
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Repeat">
              <select
                value={draft.repeat}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    repeat: e.target.value as Task["repeat"],
                    everyDays: d.everyDays || 2,
                  }))
                }
              >
                {[
                  "none",
                  "daily",
                  "weekdays",
                  "weekly",
                  "monthly",
                  "month-end",
                  "yearly",
                  "custom",
                ].map((x) => (
                  <option key={x} value={x}>
                    {x === "none"
                      ? "Does not repeat"
                      : x === "custom"
                        ? "Every N days"
                        : x === "month-end"
                          ? "Last day of each month"
                          : x[0].toUpperCase() + x.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="0"
                max="1440"
                value={draft.duration}
                onChange={(e) => change("duration", Number(e.target.value))}
              />
            </Field>
          </div>
          {draft.repeat === "custom" && (
            <Field label="Repeat every (days)">
              <input
                type="number"
                required
                min={1}
                max={365}
                value={draft.everyDays || 2}
                onChange={(e) => change("everyDays", Number(e.target.value))}
              />
            </Field>
          )}
          <Field label="Tags">
            <input
              maxLength={320}
              placeholder="learning, home, deep-work"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={4}
              maxLength={100000}
              placeholder="Details, links, or a checklist…"
              value={draft.notes}
              onChange={(e) => change("notes", e.target.value)}
            />
          </Field>
          <div className="task-checklist">
            <h3>
              Checklist{" "}
              <span className="muted">
                {draft.checklist?.filter((i) => i.done).length || 0} /{" "}
                {draft.checklist?.length || 0}
              </span>
            </h3>
            {draft.checklist?.map((item) => (
              <div className="group-row" key={item.id}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) =>
                      change(
                        "checklist",
                        draft.checklist?.map((i) =>
                          i.id === item.id
                            ? { ...i, done: e.target.checked }
                            : i,
                        ),
                      )
                    }
                  />
                  {item.title}
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove checklist item ${item.title}`}
                  onClick={() =>
                    change(
                      "checklist",
                      draft.checklist?.filter((i) => i.id !== item.id),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="checklist-add">
              <input
                aria-label="New checklist item"
                maxLength={500}
                placeholder="Break this task into a small step"
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStep();
                  }
                }}
              />
              <Button
                disabled={
                  !checklistTitle.trim() ||
                  (draft.checklist?.length || 0) >= 100
                }
                onClick={addStep}
              >
                <Plus size={15} />
                Add step
              </Button>
            </div>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.reminder}
              disabled={!draft.date || !draft.time}
              onChange={(e) => change("reminder", e.target.checked)}
            />
            <Bell size={16} />
            Remind me at the scheduled time
          </label>
          <p className="help">
            Choosing a time turns on its Windows reminder. If no date is
            selected, it uses today. Clear the time to turn the reminder off, or
            uncheck it to keep the time without an alert.
          </p>
          <p className="help">
            Times follow this computer's timezone. Repeating tasks create their
            next occurrence when completed. Editing changes this occurrence.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button kind="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save task"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
export function TaskRows({
  tasks,
  save,
  onEdit,
  onDelete,
  compact = false,
}: {
  tasks: Task[];
  save: Save;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  compact?: boolean;
}) {
  const today = localDate();
  return (
    <div className="task-rows">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`task-row ${task.done ? "completed" : ""}`}
        >
          <button
            className={`task-check ${task.priority} ${task.done ? "checked" : ""}`}
            aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`}
            onClick={() => void save((s) => toggleTask(s, task.id))}
          >
            {task.done && <Check size={13} />}
          </button>
          <button className="task-body" onClick={() => onEdit(task)}>
            <strong>{task.title}</strong>
            <span className="task-meta">
              <span className={`list-dot ${task.list.toLowerCase()}`} />
              {task.list}
              {task.date && (
                <span
                  className={!task.done && task.date < today ? "overdue" : ""}
                >
                  <CalendarDays size={12} />
                  {task.date === today
                    ? "Today"
                    : parseDate(task.date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                </span>
              )}
              {task.time && (
                <span>
                  <Clock size={12} />
                  {task.time}
                </span>
              )}
              {task.repeat !== "none" && <Repeat2 size={12} />}{" "}
              {task.reminder && <Bell size={12} />}
              {task.tags?.map((tag) => (
                <span className="tag-chip" key={tag}>
                  #{tag}
                </span>
              ))}
              {!!task.checklist?.length && (
                <span>
                  {task.checklist.filter((i) => i.done).length}/
                  {task.checklist.length} steps
                </span>
              )}
            </span>
          </button>
          {!compact && (
            <span className={`priority ${task.priority}`}>{task.priority}</span>
          )}
          <button
            className="icon-button delete"
            aria-label={`Delete ${task.title}`}
            onClick={() => onDelete(task)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function TasksView({
  state,
  save,
  onEdit,
  onDelete,
  onAdd,
  filter,
  setFilter,
  list,
}: {
  state: State;
  save: Save;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onAdd: () => void;
  filter: string;
  setFilter: (v: string) => void;
  list: string;
}) {
  const today = localDate();
  const [tag, setTag] = useState(""),
    [priority, setPriority] = useState("all");
  const tags = [...new Set(state.tasks.flatMap((t) => t.tags || []))].sort();
  const filtered = state.tasks
    .filter(
      (t) =>
        (!list || t.list === list) &&
        (!tag || t.tags?.includes(tag)) &&
        (priority === "all" || t.priority === priority) &&
        (filter === "Completed" ? t.done : !t.done) &&
        (filter === "Today"
          ? t.date === today
          : filter === "Upcoming"
            ? t.date > today
            : filter === "Overdue"
              ? !!t.date && t.date < today
              : filter === "Unscheduled"
                ? !t.date
                : true),
    )
    .sort(
      (a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999") ||
        a.time.localeCompare(b.time),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE ROOM FOR WHAT MATTERS</div>
          <h1>{list || "Your tasks"}</h1>
          <p>A clear head starts with a simple list.</p>
        </div>
        <Button kind="primary" onClick={onAdd}>
          <Plus size={17} />
          New task
        </Button>
      </div>
      <div className="tabs">
        {[
          "All",
          "Today",
          "Upcoming",
          "Overdue",
          "Unscheduled",
          "Completed",
        ].map((x) => (
          <button
            key={x}
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="task-filters">
          <Field label="Filter by tag">
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Filter by priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">All priorities</option>
              {["high", "medium", "low"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="section-heading">
          <h2>
            {filter === "All" ? "Open tasks" : filter}{" "}
            <span className="count">{filtered.length}</span>
          </h2>
        </div>
        {filtered.length ? (
          <TaskRows
            tasks={filtered}
            save={save}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <Empty
            title="A little breathing room"
            description="Capture your next task and give it a place in your day."
            action={onAdd}
            label="Add a task"
          />
        )}
      </section>
    </>
  );
}
