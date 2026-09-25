import { useState } from "react";
import { MonthlyComparison, RecurringBills } from "./FinanceExtras";
import { useMoney, useWorkspace } from "./WorkspaceContext";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Wallet,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  Pencil,
  Download,
} from "lucide-react";
import {
  type State,
  type Transaction,
  type TransactionType,
  type Plan,
  finance,
  currencyDigits,
  moneyScale,
  uid,
  localDate,
  monthShift,
  parseDate,
} from "../shared/domain";
import { Button, Field, Modal, Empty, type Save } from "./components";
const typeLabels: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  refund: "Refund",
  save: "Move to savings",
  withdraw: "Withdraw savings",
};
export function TransactionEditor({
  transaction,
  onClose,
  save,
}: {
  transaction?: Transaction;
  onClose: () => void;
  save: Save;
}) {
  const { expenseCategories: categories } = useWorkspace();
  const { currency, scale, parseAmount } = useMoney();
  const [type, setType] = useState<TransactionType>(
      transaction?.type || "expense",
    ),
    [amount, setAmount] = useState(
      transaction ? String(transaction.amount / scale) : "",
    ),
    [category, setCategory] = useState(transaction?.category || categories[0]),
    [date, setDate] = useState(transaction?.date || localDate()),
    [note, setNote] = useState(transaction?.note || ""),
    [method, setMethod] = useState(transaction?.method || "Cash"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={
        transaction ? "Edit transaction" : "A clearer picture of your money"
      }
      onClose={() => !busy && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const value = parseAmount(amount);
            if (value <= 0)
              throw new Error("Enter an amount greater than zero.");
            if (date > localDate())
              throw new Error(
                "Record actual transactions up to today. Use the monthly plan for future commitments.",
              );
            setBusy(true);
            const item: Transaction = {
              id: transaction?.id || uid(),
              type,
              amount: value,
              category,
              date,
              note,
              method,
            };
            if (
              await save((s) => ({
                ...s,
                transactions: transaction
                  ? s.transactions.map((t) =>
                      t.id === transaction.id ? item : t,
                    )
                  : [...s.transactions, item],
              }))
            )
              onClose();
          } catch (err) {
            setError(String(err instanceof Error ? err.message : err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <Field label="Transaction type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Amount (${currency})`}>
            <input
              autoFocus
              required
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Date">
              <input
                type="date"
                required
                min="1900-01-01"
                max={localDate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Payment method">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {[
                  "Cash",
                  "Bank transfer",
                  "Debit card",
                  "Credit card",
                  "Digital wallet",
                  "UPI",
                  "Other",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          {["expense", "refund"].includes(type) && (
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Description">
            <input
              maxLength={2000}
              placeholder={
                type === "income"
                  ? "Salary, freelance work, or other income"
                  : type === "expense"
                    ? "What was it for?"
                    : "Optional note"
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {["save", "withdraw"].includes(type) && (
            <p className="callout">
              This moves money between your spending and savings balances. It
              does not count as income or an expense.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button kind="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save transaction"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
function PlanEditor({
  plan,
  month,
  save,
  onClose,
}: {
  plan: Plan;
  month: string;
  save: Save;
  onClose: () => void;
}) {
  const { expenseCategories: categories } = useWorkspace();
  const { currency, scale, parseAmount } = useMoney();
  const [income, setIncome] = useState(String(plan.income / scale)),
    [savings, setSavings] = useState(String(plan.savings / scale)),
    [committed, setCommitted] = useState(String(plan.committed / scale)),
    [budgets, setBudgets] = useState(
      Object.fromEntries(
        categories.map((c) => [c, String((plan.budgets[c] || 0) / scale)]),
      ),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={`Plan your month · ${month}`} onClose={onClose} wide>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const value: Plan = {
              income: parseAmount(income),
              savings: parseAmount(savings),
              committed: parseAmount(committed),
              budgets: Object.fromEntries(
                Object.entries(budgets).map(([k, v]) => [
                  k,
                  parseAmount(v || "0"),
                ]),
              ),
            };
            setBusy(true);
            if (
              await save((s) => ({
                ...s,
                plans: { ...s.plans, [month]: value },
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
          <div className="form-grid">
            <Field label={`Expected monthly income (${currency})`}>
              <input
                required
                inputMode="decimal"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
            </Field>
            <Field label={`Savings target (${currency})`}>
              <input
                required
                inputMode="decimal"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
              />
            </Field>
          </div>
          <Field label={`Unpaid commitments remaining (${currency})`}>
            <input
              required
              inputMode="decimal"
              value={committed}
              onChange={(e) => setCommitted(e.target.value)}
            />
          </Field>
          <p className="help">
            A planning reserve for bills you still need to pay. Reduce this
            amount when you record their payments so they aren't counted twice.
            Expected income is not added to your actual balance.
          </p>
          {Number(savings) + Number(committed) > Number(income) && (
            <p className="callout">
              Your savings target and unpaid commitments exceed expected income.
              This plan will have no remaining spending allowance until you
              adjust it.
            </p>
          )}
          <h3>
            Category limits <span className="muted">optional</span>
          </h3>
          <div className="form-grid">
            {categories.map((c) => (
              <Field label={`${c} (${currency})`} key={c}>
                <input
                  inputMode="decimal"
                  value={budgets[c]}
                  onChange={(e) =>
                    setBudgets((v) => ({ ...v, [c]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button kind="primary" type="submit" disabled={busy}>
              Save monthly plan
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
function exportCSV(entries: Transaction[], currency: string) {
  const scale = moneyScale(currency);
  const escape = (v: string) =>
    `"${(/^[=+@\-\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const rows = [
    ["Date", "Type", "Description", "Category", `Amount ${currency}`, "Method"],
    ...entries.map((t) => [
      t.date,
      typeLabels[t.type],
      t.note,
      t.category,
      (t.amount / scale).toFixed(currencyDigits(currency)),
      t.method,
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff" + rows.map((row) => row.map(escape).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "Organizer-transactions.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Finance({
  state,
  save,
  onDelete,
  add,
  onAdd,
  onCloseAdd,
}: {
  state: State;
  save: Save;
  onDelete: (t: Transaction) => void;
  add: boolean;
  onAdd: () => void;
  onCloseAdd: () => void;
}) {
  const { currency, money } = useMoney();
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [planOpen, setPlanOpen] = useState(false),
    [edit, setEdit] = useState<Transaction | undefined>(),
    [filter, setFilter] = useState("all");
  const data = finance(state, month),
    current = month === localDate().slice(0, 7),
    spent = Math.max(0, data.expenses),
    limit = Math.max(0, data.plan.income - data.plan.savings),
    percent = limit ? Math.min(100, (spent / limit) * 100) : 0;
  const positive = data.byCategory.filter((c) => c.amount > 0),
    chartTotal = positive.reduce((s, c) => s + c.amount, 0);
  let offset = 0;
  const gradient = positive
    .map((c) => {
      const start = offset;
      offset += (c.amount / chartTotal) * 100;
      return `${c.color} ${start}% ${offset}%`;
    })
    .join(",");
  const history = Array.from({ length: 6 }, (_, i) => {
      const m = monthShift(month, i - 5);
      return { month: m, ...finance(state, m) };
    }),
    maxHistory = Math.max(
      1,
      ...history.map((h) => Math.max(h.income, h.expenses)),
    );
  const entries = data.entries
    .filter((t) => filter === "all" || t.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LESS GUESSWORK. MORE PEACE OF MIND.</div>
          <h1>Your money, at a glance.</h1>
          <p>Every small expense tells part of the story.</p>
        </div>
        <Button kind="primary" onClick={onAdd}>
          <Plus size={17} />
          Add transaction
        </Button>
      </div>
      {!data.plan.income && (
        <div className="finance-setup-hint">
          <div>
            <strong>No expected income set for this month</strong>
            <p>
              You can keep tracking actual transactions. Add a monthly plan when
              you want spending allowances and savings targets.
            </p>
          </div>
          <Button onClick={() => setPlanOpen(true)}>Set monthly plan</Button>
        </div>
      )}
      <div className="toolbar">
        <div className="month-nav">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => setMonth(monthShift(month, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <strong>
            {parseDate(`${month}-01`).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => setMonth(monthShift(month, 1))}
          >
            <ChevronRight size={18} />
          </button>
          {!current && (
            <button
              className="text-button"
              onClick={() => setMonth(localDate().slice(0, 7))}
            >
              This month
            </button>
          )}
        </div>
        <Button onClick={() => setPlanOpen(true)}>
          <SlidersHorizontal size={15} />
          Monthly plan
        </Button>
      </div>
      <div className="stat-grid finance-stats">
        <div className="stat-card">
          <span className="stat-label">
            <ArrowDownLeft size={16} />
            Income received
          </span>
          <strong>{money(data.income)}</strong>
          <small>{money(data.plan.income)} expected</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            <ArrowUpRight size={16} />
            Net expenses
          </span>
          <strong>{money(data.expenses)}</strong>
          <small>Expenses less refunds</small>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            <Wallet size={16} />
            {current ? "Surplus so far" : "Monthly surplus"}
          </span>
          <strong className={data.surplus < 0 ? "red" : "green"}>
            {money(data.surplus)}
          </strong>
          <small>
            {data.rate === null
              ? "Record income to calculate your rate"
              : `${data.rate.toFixed(1)}% of received income`}
          </small>
        </div>
        <div className="stat-card savings-stat">
          <span className="stat-label">
            <PiggyBank size={16} />
            Moved to savings
          </span>
          <strong>{money(data.contributions)}</strong>
          <small>Target: {money(data.plan.savings)}</small>
        </div>
      </div>
      <div className="finance-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>Where your money went</h2>
            <span className="muted">By category</span>
          </div>
          {positive.length ? (
            <div className="spending-chart">
              <div
                className="donut"
                style={{ background: `conic-gradient(${gradient})` }}
                role="img"
                aria-label={`Spending by category, total ${money(chartTotal)}`}
              >
                <div>
                  <span>Spending</span>
                  <strong>{money(chartTotal)}</strong>
                </div>
              </div>
              <div className="legend">
                {positive.map((c) => (
                  <div key={c.name}>
                    <span
                      className="legend-dot"
                      style={{ background: c.color }}
                    />
                    <span>{c.name}</span>
                    <strong>{money(c.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="spending-chart">
              <div className="donut empty-donut">
                <div>
                  <span>Net expenses</span>
                  <strong>{money(data.expenses)}</strong>
                </div>
              </div>
              <p className="muted chart-empty">
                Your category breakdown will appear as you record expenses.
              </p>
            </div>
          )}
          {data.byCategory.some((c) => c.amount < 0) && (
            <p className="help">
              Net-refund categories are excluded from the spending ring and
              shown below.
            </p>
          )}
          <div className="category-budgets">
            {data.byCategory
              .filter((c) => c.budget || c.amount)
              .map((c) => (
                <div key={c.name}>
                  <div>
                    <span>
                      <i style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <strong
                      className={c.budget && c.amount > c.budget ? "red" : ""}
                    >
                      {money(c.amount)}{" "}
                      <small>
                        {c.budget ? `/ ${money(c.budget)}` : "· no limit"}
                      </small>
                    </strong>
                  </div>
                  {!!c.budget && (
                    <div className="progress">
                      <span
                        style={{
                          width: `${Math.min(100, (Math.max(0, c.amount) / c.budget) * 100)}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
        <section className="panel allowance-panel">
          <div className="section-heading">
            <h2>A little room to breathe</h2>
            <PiggyBank size={21} />
          </div>
          <span className="muted">Remaining planned allowance</span>
          <div
            className={`allowance-number ${data.allowance < 0 ? "red" : ""}`}
          >
            {money(data.allowance)}
          </div>
          <div className="progress">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="split muted">
            <span>{money(data.expenses)} spent</span>
            <span>{money(limit)} allowance</span>
          </div>
          <div className="daily-allowance">
            <div>
              <span>
                {data.days ? "Suggested daily allowance" : "Month finished"}
              </span>
              <strong>{data.days ? money(data.daily) : "—"}</strong>
            </div>
            <span>{data.days ? `${data.days} days remaining` : ""}</span>
          </div>
          <p className="help">
            Based on expected income after your savings target and{" "}
            {money(data.plan.committed)} of unpaid commitments. This is a plan,
            not cash available.
          </p>
          <div className="balance-row">
            <span>Spending balance {current ? "today" : "at month end"}</span>
            <strong>
              {data.balanceAvailable ? money(data.spendable) : "—"}
            </strong>
          </div>
          <div className="balance-row">
            <span>Total savings balance</span>
            <strong className="green">
              {data.balanceAvailable ? money(data.savingsBalance) : "—"}
            </strong>
          </div>
          <p className="help">
            Includes opening balances and recorded transfers from{" "}
            {state.settings.balanceDate}.
          </p>
        </section>
      </div>
      <RecurringBills state={state} save={save} month={month} />
      <MonthlyComparison state={state} month={month} />
      <section className="panel history-panel">
        <div className="section-heading">
          <h2>The bigger picture</h2>
          <div className="chart-key">
            <span>
              <i className="income-key" />
              Income
            </span>
            <span>
              <i className="expense-key" />
              Expenses
            </span>
          </div>
        </div>
        <div className="history-bars">
          {history.map((h) => (
            <div key={h.month} className="history-month">
              <div className="bar-group">
                <div
                  className="income-bar"
                  style={{
                    height: `${Math.max(2, (h.income / maxHistory) * 95)}%`,
                  }}
                  title={`Income ${money(h.income)}`}
                />
                <div
                  className="expense-bar"
                  style={{
                    height: `${Math.max(2, (Math.max(0, h.expenses) / maxHistory) * 95)}%`,
                  }}
                  title={`Expenses ${money(h.expenses)}`}
                />
              </div>
              <span>
                {parseDate(`${h.month}-01`).toLocaleDateString(undefined, {
                  month: "short",
                })}
              </span>
              <small>{money(h.surplus)} surplus</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>
            Transactions <span className="count">{entries.length}</span>
          </h2>
          <div className="row-actions">
            <select
              aria-label="Filter transactions"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All transactions</option>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Button
              onClick={() => exportCSV(entries, currency)}
              disabled={!entries.length}
            >
              <Download size={14} />
              CSV
            </Button>
          </div>
        </div>
        {!entries.length ? (
          <Empty
            title="Your money story starts here"
            description="Add your received allowance or your first expense. The totals above update automatically."
            action={onAdd}
            label="Add a transaction"
            icon={<Wallet size={26} />}
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category / type</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th className="align-right">Amount</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.note || typeLabels[t.type]}</strong>
                    </td>
                    <td>
                      <span className="tag">
                        {["expense", "refund"].includes(t.type)
                          ? t.category
                          : typeLabels[t.type]}
                      </span>
                      {t.type === "refund" && <small> Refund</small>}
                    </td>
                    <td>
                      {parseDate(t.date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="muted">{t.method}</td>
                    <td
                      className={`align-right amount ${["income", "refund"].includes(t.type) ? "green" : ""}`}
                    >
                      {["income", "refund", "withdraw"].includes(t.type)
                        ? "+"
                        : "−"}
                      {money(t.amount)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${t.note || typeLabels[t.type]}`}
                          onClick={() => setEdit(t)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${t.note || typeLabels[t.type]}`}
                          onClick={() => onDelete(t)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {planOpen && (
        <PlanEditor
          plan={data.plan}
          month={month}
          save={save}
          onClose={() => setPlanOpen(false)}
        />
      )}{" "}
      {(add || edit) && (
        <TransactionEditor
          transaction={edit}
          save={save}
          onClose={() => {
            setEdit(undefined);
            onCloseAdd();
          }}
        />
      )}
    </>
  );
}
