import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Download,
  Upload,
  RotateCcw,
  Bell,
  HardDrive,
  Monitor,
  Check,
} from "lucide-react";
import { type State, toMinorUnits, moneyScale, supportedCurrencies, hasFinancialData } from "../shared/domain";
import { api } from "./api";
import Personalization from "./Personalization";
import { Button, Field, type Save } from "./components";
export default function Settings({
  state,
  save,
  restore,
  notify,
}: {
  state: State;
  save: Save;
  restore: (undo?: boolean) => Promise<void>;
  notify: (message: string) => void;
}) {
  const scale = moneyScale(state.settings.currency);
  const [currency, setCurrency] = useState(state.settings.currency);
  const [weekStartsOn, setWeekStartsOn] = useState(state.settings.weekStartsOn);
  const [name, setName] = useState(state.settings.name),
    [opening, setOpening] = useState(
      String(state.settings.openingBalance / scale),
    ),
    [savings, setSavings] = useState(
      String(state.settings.openingSavings / scale),
    ),
    [date, setDate] = useState(state.settings.balanceDate),
    [error, setError] = useState(""),
    [info, setInfo] = useState<Awaited<ReturnType<typeof api.info>> | null>(
      null,
    );
  useEffect(() => {
    void api
      .info()
      .then(setInfo)
      .catch((e) => setError(String(e)));
  }, []);
  async function run(fn: () => Promise<unknown>, message: string) {
    try {
      const result = await fn();
      if (result) notify(message);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>Your space. Your preferences.</h1>
          <p>A few small details to make your organizer feel like you.</p>
        </div>
        <span className="pill">
          <ShieldCheck size={15} />
          Stored on this device
        </span>
      </div>
      <Personalization key={state.settings.currency} state={state} save={save} notify={notify} />
      <div className="settings-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Personal & balances</h2>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                const negative = opening.startsWith("-");
                const balance =
                  (negative ? -1 : 1) *
                  toMinorUnits(negative ? opening.slice(1) : opening, currency);
                const savingsBalance = toMinorUnits(savings, currency);
                if (
                  await save((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      name: name.trim(),
                      currency, weekStartsOn,
                      openingBalance: balance,
                      openingSavings: savingsBalance,
                      balanceDate: date,
                    },
                  }))
                )
                  notify("Preferences saved.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label="What should we call you?">
              <input
                maxLength={100}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Currency"><select value={currency} disabled={hasFinancialData(state)} onChange={e => setCurrency(e.target.value)}>{supportedCurrencies.map(c => <option key={c}>{c}</option>)}</select></Field>
            <p className="help">Currency is fixed once financial amounts exist, so saved records cannot be relabeled as another currency.</p>
            <Field label="Week starts on"><select value={weekStartsOn} onChange={e => setWeekStartsOn(Number(e.target.value) as 0 | 1)}><option value={1}>Monday</option><option value={0}>Sunday</option></select></Field>
            <Field label="Opening balances as of">
              <input
                type="date"
                min="1900-01-01"
                max="2200-12-31"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label={`Spending balance (${currency})`}>
                <input
                  required
                  inputMode="decimal"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </Field>
              <Field label={`Savings balance (${currency})`}>
                <input
                  required
                  inputMode="decimal"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value)}
                />
              </Field>
            </div>
            <p className="help">
              Balances at the beginning of this date, before that day's
              transactions. These are existing funds, not new income.
              Transactions before this date remain in monthly reports but do not
              change these balances.
            </p>
            <Button kind="primary" type="submit">
              <Check size={15} />
              Save preferences
            </Button>
          </form>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Windows & reminders</h2>
            <Monitor size={19} />
          </div>
          <div className="setting-toggle">
            <div>
              <strong>Keep running in the tray</strong>
              <p>X hides the window. Task and habit reminders keep running. Right-click the tray icon → Quit to exit fully.</p>
            </div>
            <span className="pill">{api.desktop ? "Always on" : "Desktop app"}</span>
          </div>
          <label className="setting-toggle">
            <div>
              <strong>Start with Windows</strong>
              <p>Available after installing the desktop app.</p>
            </div>
            <input
              type="checkbox"
              disabled={!info?.packaged}
              checked={state.settings.startAtLogin}
              onChange={(e) =>
                void save((s) => ({
                  ...s,
                  settings: { ...s.settings, startAtLogin: e.target.checked },
                }))
              }
            />
          </label>
          <div className="setting-toggle">
            <div>
              <strong>Test a reminder</strong>
              <p>Check that Windows can display your notifications.</p>
            </div>
            <Button
              disabled={!api.desktop}
              onClick={() =>
                void run(
                  () => api.testNotification(),
                  "Test notification sent to Windows.",
                )
              }
            >
              <Bell size={15} />
              Test
            </Button>
          </div>
          <p className="callout">
            Reminders need the app running. A sleeping or powered-off PC cannot
            alert you; overdue tasks are checked after wake or restart. Windows
            settings may silence alerts.
          </p>
          <p className="help">
            Timezone: {info?.timezone || "System local time"}. This version
            follows the computer's timezone.
          </p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Backups & recovery</h2>
            <HardDrive size={19} />
          </div>
          <p className="muted">
            Keep a copy of your tasks, habits, notes, and finances. Restore
            validates the file and keeps your previous workspace for undo.
          </p>
          <div className="backup-buttons">
            <Button
              onClick={() =>
                void run(() => api.exportBackup(), "Backup exported.")
              }
            >
              <Download size={16} />
              Export backup
            </Button>
            <Button onClick={() => void restore()}>
              <Upload size={16} />
              Restore backup
            </Button>
            <Button disabled={!info?.canUndoRestore} onClick={() => void restore(true)}>
              <RotateCcw size={16} />
              Undo restore
            </Button>
          </div>
          {api.desktop && <p className="help">Latest automatic snapshot: {info?.latestBackup || "Not yet available"} · {info?.backupCount || 0} saved snapshots.</p>}
          {api.desktop && <Button onClick={() => void run(() => api.openDataFolder(), "")}>Open data & backups folder</Button>}
          <p className="help">
            The desktop app keeps up to 14 daily snapshots in its data folder.
            Export to another drive for protection against disk loss.
          </p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>About this space</h2>
            <ShieldCheck size={19} />
          </div>
          <p className="muted">
            Personal Organizer · {info?.version || "…"}
          </p>
          <p className="muted">
            Created by Sharveshwar S. Your information stays on this device. No sign-in
            or bank connection.
          </p>
          <Button onClick={() => void run(() => api.openAuthor(), "")}>View author on GitHub</Button>
          <p className="help">Public release in preparation. License selection is pending local testing.</p>
          <p className="data-path">
            {info?.dataPath || "Loading data location…"}
          </p>
          <p className="help">
            Local storage is not encrypted. The app starts with empty records;
            your monthly plan comes from your own setup preferences.
          </p>
        </section>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button className="text-button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
