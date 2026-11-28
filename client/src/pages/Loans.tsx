import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, GENERIC } from "../api";
import { ErrorAlert, Money, Status } from "../components/Money";
import { formatThb } from "../money";

// F-13 Loan overview (AC-72). The numbers come from GET /api/loans, built on the balance engine.
interface LoanRow { transactionId: number | null; date: string; kind: string; description: string | null; changeSatang: number; runningSatang: number }
interface Loan { account: { id: number; name: string; subtype: string | null; isActive: boolean }; outstandingSatang: number; history: LoanRow[] }
interface Loans { given: Loan[]; taken: Loan[]; totalGivenSatang: number; totalTakenSatang: number }

const SUBTYPE: Record<string, string> = { CREDIT_CARD: "Credit card", PERSONAL: "Personal", OTHER: "Other" };
const KIND: Record<string, string> = { PAYMENT: "Payment", RECEIPT: "Received", OPENING: "Opening" };
const signed = (s: number) => (s > 0 ? `+${formatThb(s)}` : formatThb(s));

export function Loans() {
  const [data, setData] = useState<Loans | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Loans>("/loans").then(setData, (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, []);
  return (
    <section>
      <h1>Loans</h1>
      <ErrorAlert message={error} />
      {!data && !error && <Status>Loading…</Status>}
      {data && (
        <>
          <LoanSection title="Money others owe me" testId="total-given" total={data.totalGivenSatang} loans={data.given} />
          <LoanSection title="Money I owe" testId="total-taken" total={data.totalTakenSatang} loans={data.taken} />
        </>
      )}
    </section>
  );
}

function LoanSection({ title, testId, total, loans }: { title: string; testId: string; total: number; loans: Loan[] }) {
  return (
    <section className="card" aria-label={title}>
      <div className="page-head"><h2>{title}</h2><strong data-testid={testId}><Money satang={total} /></strong></div>
      {loans.length === 0 && <p className="muted">No loans here.</p>}
      {loans.map((l) => (
        <details key={l.account.id} className="loan" open>
          <summary>
            <span>{l.account.name}</span>
            {l.account.subtype && <span className="muted small"> {SUBTYPE[l.account.subtype] ?? l.account.subtype}</span>}
            {!l.account.isActive && <span className="badge">Archived</span>}
            <span className="loan-outstanding">Outstanding <Money satang={l.outstandingSatang} /></span>
          </summary>
          {l.history.length === 0 ? <p className="muted small">No movements yet.</p> : (
          <table aria-label={`${l.account.name} history`}>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="num">Change</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {l.history.map((r, i) => (
                <tr key={r.transactionId ?? `opening-${i}`}>
                  <td>{r.date}</td>
                  <td>{KIND[r.kind] ?? r.kind}</td>
                  <td>{r.transactionId ? <Link to={`/transactions/${r.transactionId}`}>{r.description ?? "(no description)"}</Link> : r.description}</td>
                  <td className="num">{signed(r.changeSatang)}</td>
                  <td className="num"><Money satang={r.runningSatang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </details>
      ))}
    </section>
  );
}
