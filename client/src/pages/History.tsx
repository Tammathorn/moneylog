import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError, GENERIC, type Account, type Transaction } from "../api";
import { parseThb } from "../money";
import { ErrorAlert, Money, Status } from "../components/Money";

const KIND = { PAYMENT: "Payment", RECEIPT: "Received" } as const;

const PAGE = 50;
const FILTER_KEYS = ["from", "to", "accountId", "kind", "q", "min", "max", "favourite"] as const;
type Form = Record<(typeof FILTER_KEYS)[number], string>;
const thbText = (satang: string | null) => (satang ? (Number(satang) / 100).toFixed(2) : "");

// F-06 history + F-11 filters (in the URL so Back/refresh keep them) + F-12 favourites.
export function History() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<{ items: Transaction[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const fromUrl = (): Form => ({
    from: params.get("from") ?? "", to: params.get("to") ?? "", accountId: params.get("accountId") ?? "", kind: params.get("kind") ?? "",
    q: params.get("q") ?? "", min: thbText(params.get("minSatang")), max: thbText(params.get("maxSatang")), favourite: params.get("favourite") ?? "",
  });
  const [form, setForm] = useState<Form>(fromUrl);
  const query = params.toString();
  const offset = Number(params.get("offset") ?? 0) || 0;
  const filtered = [...params.keys()].some((k) => k !== "offset");

  useEffect(() => {
    api<{ accounts: Account[] }>("/accounts").then((r) => setAccounts(r.accounts), () => setAccounts([]));
  }, []);
  useEffect(() => {
    setData(null);
    setError(null);
    api<{ items: Transaction[]; total: number }>(`/transactions${query ? `?${query}` : ""}`).then(setData, (e) => setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : GENERIC));
  }, [query]);

  const minS = form.min ? parseThb(form.min) : null;
  const maxS = form.max ? parseThb(form.max) : null;
  const amountError = (form.min && minS === null) || (form.max && maxS === null) ? "Enter amounts like 100 or 99.50."
    : minS !== null && maxS !== null && minS > maxS ? "Min must not be above Max." : null;
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function apply(e: FormEvent) {
    e.preventDefault();
    if (amountError) return;
    const next = new URLSearchParams();
    for (const k of ["from", "to", "accountId", "kind", "q"] as const) if (form[k].trim()) next.set(k, form[k].trim());
    if (minS !== null) next.set("minSatang", String(minS));
    if (maxS !== null) next.set("maxSatang", String(maxS));
    if (form.favourite === "true") next.set("favourite", "true");
    setParams(next);
  }
  function clear() {
    setForm({ from: "", to: "", accountId: "", kind: "", q: "", min: "", max: "", favourite: "" });
    setParams(new URLSearchParams());
  }
  function goTo(newOffset: number) {
    const next = new URLSearchParams(params);
    if (newOffset > 0) next.set("offset", String(newOffset));
    else next.delete("offset");
    setParams(next);
  }

  const toggled = (t: Transaction) => setData((d) => d && { ...d, items: d.items.map((x) => (x.id === t.id ? t : x)) });

  return (
    <section>
      <div className="page-head"><h1>History</h1><Link className="button primary" to="/transactions/new">New transaction</Link></div>
      <form className="card filters" onSubmit={apply} aria-label="Filter transactions">
        <div className="filter-grid">
          <label>From <input type="date" value={form.from} onChange={(e) => set("from", e.target.value)} aria-label="From" /></label>
          <label>To <input type="date" value={form.to} onChange={(e) => set("to", e.target.value)} aria-label="To" /></label>
          <label>Account
            <select value={form.accountId} onChange={(e) => set("accountId", e.target.value)} aria-label="Account">
              <option value="">Any account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isActive ? "" : " (archived)"}</option>)}
            </select>
          </label>
          <label>Kind
            <select value={form.kind} onChange={(e) => set("kind", e.target.value)} aria-label="Kind">
              <option value="">Any</option><option value="PAYMENT">Payment</option><option value="RECEIPT">Money received</option>
            </select>
          </label>
          <label>Text <input value={form.q} maxLength={100} onChange={(e) => set("q", e.target.value)} aria-label="Text" placeholder="Description or note" /></label>
          <label>Min ฿ <input inputMode="decimal" value={form.min} onChange={(e) => set("min", e.target.value)} aria-label="Min ฿" /></label>
          <label>Max ฿ <input inputMode="decimal" value={form.max} onChange={(e) => set("max", e.target.value)} aria-label="Max ฿" /></label>
          <label className="check"><input type="checkbox" checked={form.favourite === "true"} onChange={(e) => set("favourite", e.target.checked ? "true" : "")} /> Favourites only</label>
        </div>
        {amountError && <p className="field-error">{amountError}</p>}
        <div className="row">
          <button type="submit" className="primary" disabled={!!amountError}>Apply</button>
          <button type="button" onClick={clear}>Clear</button>
        </div>
      </form>
      <ErrorAlert message={error} />
      {!data && !error && <Status>Loading…</Status>}
      {data?.items.length === 0 && (filtered
        ? <p className="empty">No transactions match these filters.</p>
        : <p className="empty">No transactions yet — record your first one.</p>)}
      {data && data.items.length > 0 && (
        <div className="card">
          <table aria-label="Transactions">
            <thead><tr><th aria-label="Favourite" /><th>Date</th><th>Type</th><th>Account</th><th>Description</th><th className="num">Total</th></tr></thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td><FavouriteStar tx={t} onChange={toggled} /></td>
                  <td><Link to={`/transactions/${t.id}`}>{t.date}</Link></td>
                  <td>{KIND[t.kind]}</td>
                  <td>{t.account.name}</td>
                  <td>{t.description ?? <span className="muted">{t.lines.map((l) => l.account.name).join(", ")}</span>}</td>
                  <td className="num"><Money satang={t.totalSatang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <span className="muted small">Showing {offset + 1}–{offset + data.items.length} of {data.total}</span>
            <button type="button" disabled={offset === 0} onClick={() => goTo(Math.max(offset - PAGE, 0))}>Previous</button>
            <button type="button" disabled={offset + data.items.length >= data.total} onClick={() => goTo(offset + PAGE)}>Next</button>
          </div>
        </div>
      )}
    </section>
  );
}

// F-12 AC-67: star toggle; the server is the authority, the UI shows its answer.
export function FavouriteStar({ tx, onChange }: { tx: Transaction; onChange: (t: Transaction) => void }) {
  const [busy, setBusy] = useState(false);
  const on = !!tx.isFavourite;
  async function toggle() {
    setBusy(true);
    try {
      const r = await api<{ transaction: Transaction }>(`/transactions/${tx.id}/favourite`, { method: "PUT", body: { isFavourite: !on } });
      onChange(r.transaction);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className={`star${on ? " on" : ""}`} aria-pressed={on} disabled={busy}
      aria-label={on ? "Remove from favourites" : "Mark as favourite"} title={on ? "Remove from favourites" : "Mark as favourite"} onClick={toggle}>
      {on ? "★" : "☆"}
    </button>
  );
}

export function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fromEdit = (useLocation().state as { transaction?: Transaction } | null)?.transaction;
  const [tx, setTx] = useState<Transaction | null>(fromEdit && String(fromEdit.id) === id ? fromEdit : null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (fromEdit && String(fromEdit.id) === id) return; // just saved by Edit: show the server's answer
    api<{ transaction: Transaction }>(`/transactions/${id}`).then((r) => setTx(r.transaction), (e) => setError(e instanceof ApiError ? e.message : GENERIC));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function remove() {
    setError(null);
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      navigate("/transactions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : GENERIC);
      setConfirming(false);
    }
  }
  return (
    <section>
      <p><Link to="/transactions">← History</Link></p>
      <ErrorAlert message={error} />
      {!tx && !error && <Status>Loading…</Status>}
      {tx && (
        <div className="card">
          <div className="page-head">
            <h1>{KIND[tx.kind]} · <Money satang={tx.totalSatang} /></h1>
            <FavouriteStar tx={tx} onChange={setTx} />
          </div>
          <dl className="facts">
            <dt>Date</dt><dd>{tx.date}</dd>
            <dt>Total</dt><dd><Money satang={tx.totalSatang} /></dd>
            <dt>{tx.kind === "PAYMENT" ? "Paid from" : "Received into"}</dt><dd>{tx.account.name}</dd>
            <dt>Description</dt><dd>{tx.description ?? "—"}</dd>
          </dl>
          <table aria-label="Lines">
            <thead><tr><th>Account</th><th>Note</th><th className="num">Amount</th></tr></thead>
            <tbody>{tx.lines.map((l) => <tr key={l.id}><td>{l.account.name}</td><td>{l.note ?? ""}</td><td className="num"><Money satang={l.amountSatang} /></td></tr>)}</tbody>
          </table>
          {tx.updatedAt && <p className="muted small">Edited {new Date(tx.updatedAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}</p>}
          <p className="row actions-row">
            <Link className="button" to={`/transactions/${tx.id}/edit`}>Edit</Link>
            <Link className="button" to={`/transactions/new?from=${tx.id}`}>Duplicate</Link>
            {!confirming && <button type="button" className="danger" onClick={() => setConfirming(true)}>Delete</button>}
          </p>
          {confirming && (
            <div className="confirm" role="alertdialog" aria-label="Confirm delete">
              <p>Delete this transaction? Balances will be recalculated.</p>
              <button type="button" className="danger" onClick={remove}>Confirm delete</button>
              <button type="button" className="link" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
