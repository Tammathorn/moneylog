import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, GENERIC, type Summary } from "../api";
import { ErrorAlert, Money, Status } from "../components/Money";

export function Overview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load(f = from, t = to) {
    setError(null);
    const q = new URLSearchParams();
    if (f) q.set("from", f);
    if (t) q.set("to", t);
    try {
      setSummary(await api<Summary>(`/summary${q.size ? `?${q}` : ""}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : GENERIC);
    }
  }
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const max = Math.max(1, ...(summary?.categorySpending.map((c) => c.amountSatang) ?? [1]));
  return (
    <section>
      <div className="page-head">
        <h1>Overview</h1>
        <Link className="button primary" to="/transactions/new">New transaction</Link>
      </div>
      <form className="range" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <label>From <input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button type="submit">Apply</button>
        <button type="button" className="link" onClick={() => { setFrom(""); setTo(""); void load("", ""); }}>Clear</button>
      </form>
      <ErrorAlert message={error} />
      {!summary && !error && <Status>Loading…</Status>}
      {summary && (
        <>
          <div className="cards">
            <Card label="Total cash" value={summary.cash.totalSatang} testId="total-cash" />
            <Card label="Credit card & borrowing" value={summary.debt.totalSatang} testId="total-debt" />
            <Card label="Loans given" value={summary.loansGiven.totalSatang} testId="total-loans-given" />
            <Card label="Income" value={summary.incomeSatang} testId="income" />
            <Card label="Expenses" value={summary.expenseSatang} testId="expenses" />
            <Card label="Net" value={summary.netSatang} testId="net" />
          </div>
          <div className="two-col">
            <div className="card">
              <h2>Cash and bank</h2>
              <table><tbody>
                {summary.cash.accounts.map((a) => <tr key={a.id}><td>{a.name}</td><td className="num"><Money satang={a.balanceSatang} flagNegative /></td></tr>)}
                {summary.debt.accounts.map((a) => <tr key={a.id}><td>{a.name} <span className="muted">(owed)</span></td><td className="num"><Money satang={a.balanceSatang} /></td></tr>)}
              </tbody></table>
            </div>
            <div className="card">
              <h2>Spending by category</h2>
              {summary.categorySpending.length === 0 ? <p className="muted">No income or expenses in this period.</p> : (
                <table aria-label="Spending by category"><tbody>
                  {summary.categorySpending.map((c) => (
                    <tr key={c.id}><td>{c.name}</td><td className="bar-cell"><span className="bar" style={{ width: `${(c.amountSatang / max) * 100}%` }} /></td><td className="num"><Money satang={c.amountSatang} /></td></tr>
                  ))}
                </tbody></table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Card({ label, value, testId }: { label: string; value: number; testId: string }) {
  return <div className="stat card"><span className="muted">{label}</span><strong data-testid={testId}><Money satang={value} flagNegative={testId === "total-cash" || testId === "net"} /></strong></div>;
}
