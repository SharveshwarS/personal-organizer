import { useState } from "react";
import { Plus, Check, Pencil, Archive, Download } from "lucide-react";
import {
  finance,
  money,
  monthShift,
  localDate,
  uid,
  toMinorUnits,
  moneyScale,
  type State,
} from "../shared/domain";
import {
  billDueDate,
  billPaymentId,
  payBill,
  type Bill,
} from "../shared/features";
import { Button, Field, Modal, type Save } from "./components";

export function MonthlyComparison({
  state,
  month,
}: {
  state: State;
  month: string;
}) {
  const previous = monthShift(month, -1),
    current = finance(state, month),
    old = finance(state, previous),
    format = (n: number) => money(n, state.settings.currency);
  const rows = current.byCategory
    .map((c) => ({
      name: c.name,
      current: c.amount,
      previous: old.byCategory.find((p) => p.name === c.name)?.amount || 0,
    }))
    .filter((c) => c.current || c.previous);
  function download() {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: state.settings.currency,
    }).resolvedOptions().maximumFractionDigits!;
    const amount = (n: number) =>
      (n / moneyScale(state.settings.currency)).toFixed(digits);
    const escape = (s: string, column: number) =>
      `"${column === 0 && /^[=+@\-\t\r]/.test(s) ? "'" : ""}${s.replace(/"/g, '""')}"`;
    const lines = [
      ["Category", previous, month, "Change", "Currency"],
      ...rows.map((r) => [
        r.name,
        amount(r.previous),
        amount(r.current),
        amount(r.current - r.previous),
        state.settings.currency,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + lines.map((r) => r.map(escape).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `Organizer-category-comparison-${month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Your month in perspective</h2>
          <p className="help">
            {month} compared with {previous}. Expenses include refunds; the
            current month may be incomplete.
          </p>
        </div>
        <Button onClick={download}>
          <Download size={15} />
          Export comparison
        </Button>
      </div>
      <div className="comparison-totals">
        <span>
          Net spending<strong>{format(current.expenses)}</strong>
          <small>{format(current.expenses - old.expenses)} change</small>
        </span>
        <span>
          Monthly surplus<strong>{format(current.surplus)}</strong>
          <small>Previously {format(old.surplus)}</small>
        </span>
        <span>
          Net savings transfers<strong>{format(current.contributions)}</strong>
          <small>Previously {format(old.contributions)}</small>
        </span>
      </div>
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>{previous}</th>
              <th>{month}</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{format(r.previous)}</td>
                <td>{format(r.current)}</td>
                <td>
                  {r.current > r.previous ? "+" : ""}
                  {format(r.current - r.previous)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="help">
          Category comparisons appear after you record expenses or refunds.
        </p>
      )}
    </section>
  );
}
export function RecurringBills({
  state,
  save,
  month,
}: {
  state: State;
  save: Save;
  month: string;
}) {
  const [editor, setEditor] = useState<Bill | null | undefined>(),
    [archived, setArchived] = useState(false),
    [confirm, setConfirm] = useState<Bill | null>(null),
    [busy, setBusy] = useState(false);
  const bills = (state.bills || []).filter(
    (b) => b.archived === archived && b.startMonth <= month,
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Recurring bills</h2>
          <p className="help">
            A Windows nudge from 09:00 on the due date. Confirm a payment to
            record one expense.
          </p>
        </div>
        <Button onClick={() => setEditor(null)}>
          <Plus size={15} />
          Add bill
        </Button>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Show archived bills
      </label>
      {bills.map((b) => {
        const paid = state.transactions.some(
          (t) => t.id === billPaymentId(b, month),
        );
        return (
          <div className="bill-row" key={b.id}>
            <div>
              <strong>{b.title}</strong>
              <small>
                {billDueDate(b, month)} · {b.category} ·{" "}
                {money(b.amount, state.settings.currency)}
              </small>
            </div>
            <div className="bill-actions">
              {!archived && (
                <Button
                  disabled={paid || month > localDate().slice(0, 7)}
                  kind={paid ? "" : "primary"}
                  onClick={() => setConfirm(b)}
                >
                  <Check size={14} />
                  {paid ? "Paid" : "Record payment"}
                </Button>
              )}
              <button
                className="icon-button"
                aria-label={`Edit bill ${b.title}`}
                onClick={() => setEditor(b)}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={`${archived ? "Restore" : "Archive"} bill ${b.title}`}
                onClick={() =>
                  void save((s) => ({
                    ...s,
                    bills: s.bills?.map((x) =>
                      x.id === b.id ? { ...x, archived: !x.archived } : x,
                    ),
                  }))
                }
              >
                <Archive size={15} />
              </button>
            </div>
          </div>
        );
      })}
      {!bills.length && (
        <p className="help">
          {archived
            ? "No archived bills for this month."
            : "Add rent, internet or a subscription. Nothing is deducted until you record payment."}
        </p>
      )}
      <p className="help">
        Bills are reminders, not budget reserves. If you included a bill in your
        monthly unpaid commitments, reduce that reserve after paying it.
      </p>
      {editor !== undefined && (
        <BillEditor
          state={state}
          save={save}
          bill={editor}
          onClose={() => setEditor(undefined)}
        />
      )}
      {confirm && (
        <Modal
          title="Record this bill payment?"
          onClose={() => !busy && setConfirm(null)}
        >
          <p>
            Record {money(confirm.amount, state.settings.currency)} for{" "}
            {confirm.title} as an expense dated {localDate()}? This covers the
            bill for {month}.
          </p>
          <p className="help">
            A second click cannot record the same monthly bill twice. You can
            edit or delete the resulting transaction in Finance.
          </p>
          <div className="modal-footer">
            <Button disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              kind="primary"
              onClick={async () => {
                setBusy(true);
                if (await save((s) => payBill(s, confirm.id, month)))
                  setConfirm(null);
                setBusy(false);
              }}
            >
              Confirm payment
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
function BillEditor({
  state,
  save,
  bill,
  onClose,
}: {
  state: State;
  save: Save;
  bill: Bill | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(bill?.title || ""),
    [amount, setAmount] = useState(
      bill ? String(bill.amount / moneyScale(state.settings.currency)) : "",
    ),
    [category, setCategory] = useState(
      bill?.category || state.expenseCategories[0],
    ),
    [day, setDay] = useState(bill?.day || 1),
    [start, setStart] = useState(bill?.startMonth || localDate().slice(0, 7)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={bill ? "Edit recurring bill" : "A monthly bill"}
      onClose={() => !busy && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const minor = toMinorUnits(amount, state.settings.currency);
            if (!minor) throw Error("Enter an amount greater than zero.");
            setBusy(true);
            const next: Bill = {
              id: bill?.id || uid(),
              title: title.trim(),
              amount: minor,
              category,
              day,
              startMonth: start,
              archived: bill?.archived || false,
            };
            if (
              await save((s) => ({
                ...s,
                bills: bill
                  ? (s.bills || []).map((b) => (b.id === bill.id ? next : b))
                  : [...(s.bills || []), next],
              }))
            )
              onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <Field label="Bill name">
            <input
              autoFocus
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label={`Bill amount (${state.settings.currency})`}>
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Bill category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {state.expenseCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Due day of month">
              <input
                type="number"
                min={1}
                max={31}
                required
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              />
            </Field>
            <Field label="First bill month">
              <input
                type="month"
                min="1900-01"
                max="2200-12"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
          </div>
          <p className="help">
            Short months use their last day. Changes apply to unpaid
            occurrences; recorded payments keep their original amounts.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" kind="primary" disabled={busy}>
              Save bill
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
