import { useState } from "react";
import { Plus, Pencil, Trash2, Moon } from "lucide-react";
import { type State, type Plan, localDate, defaultPlan, moneyScale, toMinorUnits, renameGroup, removeGroup } from "../shared/domain";
import { Button, Field, Modal, type Save } from "./components";

function GroupManager({ state, save, kind, title }: { state: State; save: Save; kind: "taskLists" | "expenseCategories"; title: string }) {
  const [editor, setEditor] = useState<{ from?: string; name: string } | null>(null),
    [removing, setRemoving] = useState(""), [destination, setDestination] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const label = kind === "taskLists" ? "list" : "category";
  async function commit(remove = false) {
    setError(""); setBusy(true);
    try {
      const name = editor?.name.trim() || "";
      if (!remove && (!name || state[kind].some(n => n !== editor?.from && n.toLowerCase() === name.toLowerCase()))) throw new Error("Choose a unique, non-empty name.");
      if (await save(s => remove ? removeGroup(s, kind, removing, destination) : editor?.from ? renameGroup(s, kind, editor.from, name) : ({ ...s, [kind]: [...s[kind], name] }))) {
        setEditor(null); setRemoving("");
      } else setError("Could not save this change. Please try again.");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel"><div className="section-heading"><h2>{title}</h2><Button disabled={state[kind].length >= 100} onClick={() => { setError(""); setEditor({ name: "" }); }}><Plus size={15} />Add {label}</Button></div>
    <p className="help">Rename freely. Removing a {label} moves its records to one you choose.</p>
    <div className="group-list">{state[kind].map(name => <div className="group-row" key={name}><span>{name}</span><button className="icon-button" aria-label={`Rename ${label} ${name}`} onClick={() => { setError(""); setEditor({ from: name, name }); }}><Pencil size={15} /></button><button className="icon-button" disabled={state[kind].length <= 1} aria-label={`Remove ${label} ${name}`} onClick={() => { setError(""); setRemoving(name); setDestination(state[kind].find(n => n !== name)!); }}><Trash2 size={15} /></button></div>)}</div>
    {editor && <Modal title={`${editor.from ? "Rename" : "Add"} ${label}`} onClose={() => !busy && setEditor(null)}><form onSubmit={e => { e.preventDefault(); void commit(); }}><fieldset disabled={busy}><Field label="Name"><input autoFocus required maxLength={100} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></Field>{error && <p role="alert" className="form-error">{error}</p>}<div className="modal-footer"><Button onClick={() => setEditor(null)}>Cancel</Button><Button type="submit" kind="primary">{busy ? "Saving…" : "Save"}</Button></div></fieldset></form></Modal>}
    {removing && <Modal title={`Remove ${removing}?`} onClose={() => !busy && setRemoving("")}><form onSubmit={e => { e.preventDefault(); void commit(true); }}><fieldset disabled={busy}><p className="muted">All associated records will be moved. {kind === "expenseCategories" && "Monthly category limits will be combined with the destination category."}</p><Field label="Move records to"><select value={destination} onChange={e => setDestination(e.target.value)}>{state[kind].filter(n => n !== removing).map(n => <option key={n}>{n}</option>)}</select></Field>{error && <p role="alert" className="form-error">{error}</p>}<div className="modal-footer"><Button onClick={() => setRemoving("")}>Cancel</Button><Button type="submit" kind="primary">Move records & remove</Button></div></fieldset></form></Modal>}
  </section>;
}

export default function Personalization({ state, save, notify }: { state: State; save: Save; notify: (message: string) => void }) {
  const currency = state.settings.currency, scale = moneyScale(currency), currentMonth = localDate().slice(0, 7);
  const defaults = state.planDefaults[Object.keys(state.planDefaults).filter(month => month <= currentMonth).sort().at(-1) || ""] || defaultPlan();
  const [income, setIncome] = useState(String(defaults.income / scale)), [savings, setSavings] = useState(String(defaults.savings / scale)),
    [effective, setEffective] = useState(currentMonth), [quiet, setQuiet] = useState(state.settings.quietHours),
    [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(action: () => Promise<boolean>, message: string) { setBusy(true); setError(""); try { if (await action()) notify(message); else setError("Could not save this change. Please try again."); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  return <><div className="settings-grid personalization-grid">
    <section className="panel"><h2>Monthly planning defaults</h2><p className="help">Choose your own starting amounts for new months. Past months and individually saved monthly plans stay unchanged.</p>
      <form onSubmit={e => { e.preventDefault(); void submit(async () => {
        const plan: Plan = { ...defaultPlan(), income: toMinorUnits(income || "0", currency), savings: toMinorUnits(savings || "0", currency) };
        return save(s => ({ ...s, planDefaults: { ...s.planDefaults, [effective]: plan } }));
      }, "Monthly defaults saved. Individually saved monthly plans were kept."); }}><fieldset disabled={busy}>
      <div className="form-grid"><Field label={`Expected income (${currency})`}><input inputMode="decimal" value={income} onChange={e => setIncome(e.target.value)} /></Field><Field label={`Savings target (${currency})`}><input inputMode="decimal" value={savings} onChange={e => setSavings(e.target.value)} /></Field></div>
      <Field label="Apply from month"><input type="month" required min={currentMonth} max="2200-12" value={effective} onChange={e => {
        const month = e.target.value;
        setEffective(month);
        const plan = state.planDefaults[Object.keys(state.planDefaults).filter(key => key <= month).sort().at(-1) || ""] || defaultPlan();
        setIncome(String(plan.income / scale)); setSavings(String(plan.savings / scale));
      }} /></Field>
      <p className="help">This does not create income transactions or move money into savings.</p><Button kind="primary" type="submit">Save defaults</Button></fieldset></form>
    </section>
    <section className="panel"><div className="section-heading"><h2>Quiet hours</h2><Moon size={20} /></div><p className="help">Pause automatic Windows alerts for part of the day. Tasks and today's unfinished habits are checked again when quiet hours end.</p>
      <form onSubmit={e => { e.preventDefault(); void submit(async () => {
        if (quiet.enabled && quiet.start === quiet.end) throw new Error("Quiet hours need different start and end times.");
        return save(s => ({ ...s, settings: { ...s.settings, quietHours: quiet } }));
      }, "Quiet hours saved."); }}><fieldset disabled={busy}><label className="check-label"><input type="checkbox" checked={quiet.enabled} onChange={e => setQuiet({ ...quiet, enabled: e.target.checked })} />Enable quiet hours</label>
      <div className="form-grid"><Field label="From"><input type="time" required value={quiet.start} onChange={e => setQuiet({ ...quiet, start: e.target.value })} /></Field><Field label="Until"><input type="time" required value={quiet.end} onChange={e => setQuiet({ ...quiet, end: e.target.value })} /></Field></div><p className="help">Uses this computer's local time. The manual Test button still sends a notification.</p><Button kind="primary" type="submit">Save quiet hours</Button></fieldset></form>
    </section>
    <GroupManager state={state} save={save} kind="taskLists" title="Task lists" />
    <GroupManager state={state} save={save} kind="expenseCategories" title="Expense categories" />
  </div>{error && <p className="form-error" role="alert">{error}</p>}</>;
}
