import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, GENERIC, type Transaction } from "../api";
import { ErrorAlert, Money, Status } from "../components/Money";

const KIND = { PAYMENT: "Payment", RECEIPT: "Received" } as const;

export function History() {
  const [data, setData] = useState<{ items: Transaction[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ items: Transaction[]; total: number }>("/transactions").then(setData, (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, []);
  return (
    <section>
      <div className="page-head"><h1>History</h1><Link className="button primary" to="/transactions/new">New transaction</Link></div>
      <ErrorAlert message={error} />
      {!data && !error && <Status>Loading…</Status>}
      {data?.items.length === 0 && <p className="empty">No transactions yet — record your first one.</p>}
      {data && data.items.length > 0 && (
        <div className="card">
          <table aria-label="Transactions">
            <thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Description</th><th className="num">Total</th></tr></thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
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

export function TransactionDetail() {
  const { id } = useParams();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ transaction: Transaction }>(`/transactions/${id}`).then((r) => setTx(r.transaction), (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, [id]);
  return (
    <section>
      <p><Link to="/transactions">← History</Link></p>
      <ErrorAlert message={error} />
      {!tx && !error && <Status>Loading…</Status>}
      {tx && (
        <div className="card">
          <h1>{KIND[tx.kind]} · <Money satang={tx.totalSatang} /></h1>
          <dl className="facts">
            <dt>Date</dt><dd>{tx.date}</dd>
            <dt>{tx.kind === "PAYMENT" ? "Paid from" : "Received into"}</dt><dd>{tx.account.name}</dd>
            <dt>Description</dt><dd>{tx.description ?? "—"}</dd>
          </dl>
          <table aria-label="Lines">
            <thead><tr><th>Account</th><th>Note</th><th className="num">Amount</th></tr></thead>
            <tbody>{tx.lines.map((l) => <tr key={l.id}><td>{l.account.name}</td><td>{l.note ?? ""}</td><td className="num"><Money satang={l.amountSatang} /></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
