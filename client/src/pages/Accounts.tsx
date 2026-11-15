import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, GENERIC, type Account } from "../api";
import { ErrorAlert, Money, Status } from "../components/Money";
import { parseThb, todayBangkok, TYPE_LABEL } from "../money";

const ORDER = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"] as const;

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    api<{ accounts: Account[] }>("/accounts").then((r) => setAccounts(r.accounts), (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, []);

  const replace = (a: Account) => setAccounts((list) => list?.map((x) => (x.id === a.id ? a : x)) ?? null);

  return (
    <section>
      <h1>Accounts</h1>
      <ErrorAlert message={error} />
      {!accounts && !error && <Status>Loading…</Status>}
      {accounts?.length === 0 && <p className="muted">No accounts yet.</p>}
      {accounts && ORDER.map((type) => {
        const list = accounts.filter((a) => a.type === type);
        if (!list.length) return null;
        return (
          <div className="card" key={type}>
            <h2>{TYPE_LABEL[type]}</h2>
            <table>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.name}
                      {a.openingDate && <div className="muted small">Opening <Money satang={a.openingBalanceSatang} /> on {a.openingDate}</div>}
                      {editing === a.id && <OpeningForm account={a} onSaved={(x) => { replace(x); setEditing(null); }} onCancel={() => setEditing(null)} />}
                    </td>
                    <td className="num" data-testid={`balance-${a.name}`}><Money satang={a.balanceSatang} flagNegative={type === "CASH"} /></td>
                    <td className="actions">
                      {type !== "INCOME" && type !== "EXPENSE" && editing !== a.id && (
                        <button type="button" className="link" onClick={() => setEditing(a.id)} aria-label={`Set opening balance for ${a.name}`}>Set opening balance</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

function OpeningForm({ account, onSaved, onCancel }: { account: Account; onSaved: (a: Account) => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(account.openingDate ? (account.openingBalanceSatang / 100).toFixed(2) : "");
  const [date, setDate] = useState(account.openingDate ?? todayBangkok());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const satang = parseThb(amount);
    if (satang === null) return setError("Enter an amount like 1500 or 1500.50.");
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ account: Account }>(`/accounts/${account.id}/opening-balance`, { method: "PUT", body: { openingBalanceSatang: satang, openingDate: date } });
      onSaved(r.account);
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : GENERIC);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inline-form" onSubmit={submit}>
      <label>Opening amount (THB) <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Opening amount" /></label>
      <label>Opening date <input type="date" value={date} max={todayBangkok()} onChange={(e) => setDate(e.target.value)} aria-label="Opening date" /></label>
      <button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" className="link" onClick={onCancel}>Cancel</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}
