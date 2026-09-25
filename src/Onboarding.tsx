import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Check, ShieldCheck, Wallet, Bell } from "lucide-react";
import { type State, supportedCurrencies, toMinorUnits, localDate, defaultPlan, money } from "../shared/domain";
import { api } from "./api";
import { Button, Field, type Save } from "./components";

export default function Onboarding({ state, save, restore, notice }: { state: State; save: Save; restore: () => Promise<void>; notice?: string }) {
  const [canStartAtLogin, setCanStartAtLogin] = useState(false);
  useEffect(() => { void api.info().then(info => setCanStartAtLogin(info.packaged)).catch(() => {}); }, []);
  const [step, setStep] = useState(0), [name, setName] = useState(state.settings.name),
    [currency, setCurrency] = useState(state.settings.currency), [income, setIncome] = useState(""),
    [savings, setSavings] = useState(""), [opening, setOpening] = useState(""), [openingSavings, setOpeningSavings] = useState(""),
    [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1), [startAtLogin, setStartAtLogin] = useState(false),
    [busy, setBusy] = useState(false), [error, setError] = useState("");
  const steps = ["Your space", "Your monthly plan", "Ready when you are"];
  function amounts() {
    const negative = opening.startsWith("-");
    return { income: toMinorUnits(income || "0", currency), savings: toMinorUnits(savings || "0", currency),
      opening: (negative ? -1 : 1) * toMinorUnits((negative ? opening.slice(1) : opening) || "0", currency),
      openingSavings: toMinorUnits(openingSavings || "0", currency) };
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      if (step === 0) { setStep(1); return; }
      const values = amounts();
      if (step < 2) { setStep(step + 1); return; }
      setBusy(true);
      const today = localDate();
      const success = await save(s => ({ ...s,
        settings: { ...s.settings, name: name.trim(), currency, weekStartsOn, setupComplete: true,
          startAtLogin: api.desktop && startAtLogin, balanceDate: today,
          openingBalance: values.opening, openingSavings: values.openingSavings },
        planDefaults: { [today.slice(0, 7)]: { ...defaultPlan(), income: values.income, savings: values.savings } },
      }));
      if (!success) setError("Setup could not be saved. Your entries are still here; please try again.");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="onboarding">
    <header className="setup-brand"><img src="./icon.svg" width="44" height="44" alt="" /><strong>Personal Organizer</strong><span><ShieldCheck size={15} /> Local & private</span></header>
    <div className="setup-layout">
      <aside className="setup-intro"><span className="eyebrow">A LITTLE MORE TOGETHER</span><h1>Make room for<br />your everyday.</h1><p>Tasks, routines, notes, and money. One quiet place that fits your life.</p>
        <ol className="setup-steps">{steps.map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined} className={step === i ? "active" : ""}><span>{i < step ? <Check size={16} /> : i + 1}</span>{label}</li>)}</ol>
        <p className="help">No account, subscription, or cloud upload. Setup details stay on this device.</p>
      </aside>
      <section className="panel setup-card"><form onSubmit={submit}><fieldset disabled={busy}>
        <span className="eyebrow">STEP {step + 1} OF 3</span><h2>{steps[step]}</h2>
        {step === 0 && <><p className="muted">Start with a few preferences. You can change them later in Settings.</p>
          <Field label="What should we call you? (optional)"><input autoFocus maxLength={100} autoComplete="given-name" placeholder="Your first name or nickname" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Currency"><select value={currency} onChange={e => setCurrency(e.target.value)}>{supportedCurrencies.map(c => <option key={c}>{c}</option>)}</select></Field>
          <p className="help">One currency per workspace. Choose before recording money; amounts are never automatically converted.</p>
          <Field label="Week starts on"><select value={weekStartsOn} onChange={e => setWeekStartsOn(Number(e.target.value) as 0 | 1)}><option value={1}>Monday</option><option value={0}>Sunday</option></select></Field>
          <div className="setup-restore"><p>Already use Personal Organizer?</p><Button onClick={() => void restore()}>Restore a backup</Button></div>
        </>}
        {step === 1 && <><p className="muted">Finance is optional. Leave these blank to start without a budget.</p>
          <div className="form-grid"><Field label={`Expected monthly income (${currency})`}><input inputMode="decimal" placeholder="0" value={income} onChange={e => setIncome(e.target.value)} /></Field><Field label={`Monthly savings target (${currency})`}><input inputMode="decimal" placeholder="0" value={savings} onChange={e => setSavings(e.target.value)} /></Field></div>
          <p className="help">These are planning amounts, not money received. Record income separately when it arrives.</p>
          <div className="form-grid"><Field label={`Current spending balance (${currency})`}><input inputMode="decimal" placeholder="0" value={opening} onChange={e => setOpening(e.target.value)} /></Field><Field label={`Current savings balance (${currency})`}><input inputMode="decimal" placeholder="0" value={openingSavings} onChange={e => setOpeningSavings(e.target.value)} /></Field></div>
          <p className="help">Opening balances apply at the start of today, before any transactions you record. Adjust them later in Settings.</p>
          <Button onClick={() => { setIncome(""); setSavings(""); setOpening(""); setOpeningSavings(""); setError(""); setStep(2); }}>Set up finance later</Button>
        </>}
        {step === 2 && <><p className="muted">{name.trim() ? `${name.trim()}, your` : "Your"} workspace starts with empty records and your own preferences.</p>
          <div className="setup-summary"><Wallet size={22} /><div><strong>{currency} · {money(amounts().income, currency)} planned per month</strong><p>Customize lists, categories, and future monthly defaults in Settings.</p></div></div>
          <div className="setup-summary"><Bell size={22} /><div><strong>Reminders work in the background</strong><p>X hides the app in the Windows tray. Right-click its tray icon → Quit to exit fully. Sleeping or powered-off devices cannot send alerts.</p></div></div>
          {api.desktop && canStartAtLogin && <label className="check-label"><input type="checkbox" checked={startAtLogin} onChange={e => setStartAtLogin(e.target.checked)} />Start Personal Organizer when I sign in to Windows</label>}
          <p className="help">No reminders are enabled until you choose a time on a task or habit.</p>
        </>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-error" role="alert">{notice}</p>}
        <div className="modal-footer">{step > 0 && <Button onClick={() => { setError(""); setStep(step - 1); }}><ArrowLeft size={16} /> Back</Button>}<Button kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : step === 2 ? "Open my organizer" : "Continue"}<ArrowRight size={16} /></Button></div>
      </fieldset></form></section>
    </div>
  </main>;
}
