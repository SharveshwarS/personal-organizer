import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Plus,
  Pin,
  Trash2,
  FileText,
  Search,
  Check,
  Eye,
  Pencil,
} from "lucide-react";
import { type State, type Note, uid } from "../shared/domain";
import { Button, Empty, type Save } from "./components";
function NoteEditor({
  note,
  save,
  onDelete,
  onDraftState,
}: {
  note: Note;
  save: Save;
  onDelete: (n: Note) => void;
  onDraftState: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState(note),
    [preview, setPreview] = useState(false),
    [status, setStatus] = useState("Saved"),
    [retry, setRetry] = useState(0);
  const draftRef = useRef(draft),
    lastSaved = useRef(JSON.stringify(note)),
    savingRef = useRef(false);
  draftRef.current = draft;
  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastSaved.current) {
      onDraftState(false);
      return;
    }
    setStatus("Unsaved changes");
    onDraftState(true);
    const timer = setTimeout(async () => {
      if (savingRef.current) {
        setRetry((n) => n + 1);
        return;
      }
      savingRef.current = true;
      setStatus("Saving…");
      const ok = await save((s) => ({
        ...s,
        notes: s.notes.map((n) =>
          n.id === draft.id
            ? { ...draft, updatedAt: new Date().toISOString() }
            : n,
        ),
      }));
      savingRef.current = false;
      if (ok) {
        lastSaved.current = serialized;
        setStatus("Saved");
        if (JSON.stringify(draftRef.current) === serialized)
          onDraftState(false);
        else setRetry((n) => n + 1);
      } else setStatus("Save failed — retry");
    }, 650);
    return () => clearTimeout(timer);
  }, [draft, retry, save, onDraftState]);
  return (
    <div className="note-editor panel">
      <div className="note-toolbar">
        <div className="row-actions">
          <button
            className={`icon-button ${draft.pinned ? "purple" : ""}`}
            aria-label={draft.pinned ? "Unpin note" : "Pin note"}
            onClick={() => setDraft((d) => ({ ...d, pinned: !d.pinned }))}
          >
            <Pin size={17} />
          </button>
          <input
            aria-label="Note folder"
            maxLength={100}
            value={draft.folder}
            onChange={(e) =>
              setDraft((d) => ({ ...d, folder: e.target.value }))
            }
          />
        </div>
        <div className="row-actions">
          <span
            className={`save-status ${status.startsWith("Save failed") ? "red" : ""}`}
          >
            <Check size={13} />
            {status}
          </span>
          {status.startsWith("Save failed") && (
            <button
              className="text-button"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry
            </button>
          )}
          <button
            className="icon-button"
            aria-label={preview ? "Edit Markdown" : "Preview note"}
            onClick={() => setPreview(!preview)}
          >
            {preview ? <Pencil size={17} /> : <Eye size={17} />}
          </button>
          <button
            className="icon-button"
            disabled={status !== "Saved"}
            aria-label="Delete note"
            onClick={() => onDelete(note)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <input
        className="note-title"
        aria-label="Note title"
        placeholder="Untitled note"
        maxLength={500}
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
      />
      {preview ? (
        <div className="markdown-preview">
          <ReactMarkdown
            components={{
              a: ({ children }) => <span className="purple">{children}</span>,
              img: () => null,
            }}
          >
            {draft.body || "*Nothing written yet.*"}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          className="note-body"
          aria-label="Note content"
          maxLength={500000}
          placeholder={
            "A thought worth keeping…\n\nUse # headings, **bold**, and - lists."
          }
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        />
      )}
      <div className="note-bottom">
        <span>Markdown supported · Autosaves locally</span>
        <span>
          {draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0} words
        </span>
      </div>
    </div>
  );
}
export default function Notes({
  state,
  save,
  onDelete,
  selectedId,
  setSelectedId,
  onDraftState,
  dirty,
}: {
  state: State;
  save: Save;
  onDelete: (n: Note) => void;
  selectedId: string;
  setSelectedId: (id: string) => void;
  onDraftState: (v: boolean) => void;
  dirty: boolean;
}) {
  const [search, setSearch] = useState("");
  const notes = state.notes
    .filter((n) =>
      `${n.title} ${n.body} ${n.folder}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  const selected = state.notes.find((n) => n.id === selectedId);
  async function create() {
    const note: Note = {
      id: uid(),
      title: "",
      body: "",
      folder: "Personal",
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    if (await save((s) => ({ ...s, notes: [note, ...s.notes] })))
      setSelectedId(note.id);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A HOME FOR YOUR THOUGHTS</div>
          <h1>Keep the good ideas.</h1>
          <p>Notes, plans, and all the things in between.</p>
        </div>
        <Button kind="primary" disabled={dirty} onClick={() => void create()}>
          <Plus size={17} />
          New note
        </Button>
      </div>
      {!state.notes.length ? (
        <section className="panel">
          <Empty
            title="Make a little space for your thoughts"
            description="Keep study notes, lists, reflections, and ideas together. Everything saves on your device."
            action={() => void create()}
            label="Write your first note"
            icon={<FileText size={28} />}
          />
        </section>
      ) : (
        <div className="notes-layout">
          <aside className="note-list panel">
            <div className="search-box">
              <Search size={16} />
              <input
                aria-label="Search notes"
                placeholder="Find a note…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {notes.map((n) => (
              <button
                key={n.id}
                disabled={dirty && selectedId !== n.id}
                className={`note-preview ${selectedId === n.id ? "active" : ""}`}
                onClick={() => setSelectedId(n.id)}
              >
                <span>
                  {n.pinned && <Pin size={12} />} {n.folder || "Personal"}
                </span>
                <strong>{n.title || "Untitled note"}</strong>
                <p>{n.body.slice(0, 90) || "Your next idea starts here…"}</p>
                <small>
                  {new Date(n.updatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </small>
              </button>
            ))}
            {!notes.length && (
              <p className="muted padded">No matching notes.</p>
            )}
          </aside>
          {selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              save={save}
              onDelete={onDelete}
              onDraftState={onDraftState}
            />
          ) : (
            <section className="panel">
              <Empty
                title="Pick a thought"
                description="Choose a note on the left, or start something new."
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
