import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError, GENERIC, type Transaction } from "../api";
import { ErrorAlert, Money, Status } from "../components/Money";

const KIND = { PAYMENT: "Payment", RECEIPT: "Received" } as const;

export function History() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<{ items: Transaction[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favouriteOnly, setFavouriteOnly] = useState(params.get("favourite") === "true");
  const query = params.toString();

  useEffect(() => {
    setData(null);
    api<{ items: Transaction[]; total: number }>(`/transactions${query ? `?${query}` : ""}`).then(setData, (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, [query]);

  function apply(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (favouriteOnly) next.set("favourite", "true");
    setParams(next);
  }

  const toggled = (t: Transaction) => setData((d) => d && { ...d, items: d.items.map((x) => (x.id === t.id ? t : x)) });

  return (
    <section>
      <div className="page-head"><h1>History</h1><Link className="button primary" to="/transactions/new">New transaction</Link></div>
      <form className="card inline-form filters" onSubmit={apply} aria-label="Filter transactions">
        <label className="check"><input type="checkbox" checked={favouriteOnly} onChange={(e) => setFavouriteOnly(e.target.checked)} /> Favourites only</label>
        <button type="submit" className="primary">Apply</button>
      </form>
      <ErrorAlert message={error} />
      {!data && !error && <Status>Loading…</Status>}
      {data?.items.length === 0 && (query
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
          <p className="muted small">{data.total} transaction{data.total === 1 ? "" : "s"}</p>
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
